import { Request, Response } from 'express';
import db, { MetaProviderRow, AccountRow, AgentRow } from './db.js';
import { parseWebhookMessage, sendWhatsAppMessage } from './meta-whatsapp.js';
import { generateText, getProvider } from './ai.js';
import { saveMessage, getConversationHistory } from './agent-memory.js';
import { emitEvent } from './events.js';
import crypto from 'crypto';

/**
 * Meta sends verification challenges as a GET with `hub.mode`, `hub.verify_token`,
 * `hub.challenge`. These are flat query params (with literal dots), so we read
 * them via `req.query['hub.mode']` rather than `req.query.hub.mode`.
 */
export function metaWebhookGet(req: Request, res: Response) {
  const mode = String(req.query['hub.mode'] || '');
  const verifyToken = String(req.query['hub.verify_token'] || '');
  const challenge = String(req.query['hub.challenge'] || '');

  if (mode !== 'subscribe' || !verifyToken) {
    return res.status(403).send('Forbidden');
  }

  // Match the verify token against any stored Meta provider.
  const provider = db
    .prepare('SELECT * FROM meta_providers WHERE webhook_token = ? AND status = ?')
    .get(verifyToken, 'connected') as MetaProviderRow | undefined;

  if (!provider) return res.status(403).send('Forbidden');

  return res.status(200).send(challenge);
}

function verifyMetaSignature(req: any) {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) return true; // If secret not set, we skip (for local dev convenience)
  if (!signature) return false;

  const elements = signature.split('=');
  const signatureHash = elements[1];
  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex');

  return signatureHash === expectedHash;
}

/**
 * Inbound message handler. Meta posts to this URL when a user sends a WhatsApp
 * message. We verify the payload, find the matching account/agent, generate a
 * reply, and send it back through the Graph API.
 */
export async function metaWebhookPost(req: Request, res: Response) {
  if (!verifyMetaSignature(req)) {
    console.warn('[Meta Webhook] Invalid signature');
    return res.status(401).send('Invalid signature');
  }

  // Meta expects a 200 quickly; do work after responding.
  res.json({ ok: true });

  try {
    const parsed = parseWebhookMessage(req.body);
    if (!parsed) return;

    const account = db
      .prepare('SELECT * FROM accounts WHERE meta_phone_id = ?')
      .get(parsed.phoneNumberId) as AccountRow | undefined;
    if (!account || !account.agent_id) return;

    const agent = db
      .prepare('SELECT * FROM agents WHERE id = ?')
      .get(account.agent_id) as AgentRow | undefined;
    if (!agent || agent.status !== 'Active') return;

    const provider = getProvider(agent.provider_id);
    if (!provider) return;

    emitEvent({
      type: 'whatsapp_message',
      title: `Mensaje en ${account.name}`,
      message: `${parsed.senderPhone}: ${parsed.messageText.slice(0, 120)}`,
      level: 'info',
      meta: { accountId: account.id, from: parsed.senderPhone, body: parsed.messageText },
    });

    const history = getConversationHistory(agent.id, parsed.senderPhone, account.id);

    // Send welcome message if it's a new conversation
    if (history.length === 0 && account.welcome_message) {
      await sendWhatsAppMessage(parsed.phoneNumberId, accessToken, parsed.senderPhone, account.welcome_message);
    }

    const reply = await generateText(
      provider,
      agent.system_prompt || `Eres ${agent.name}. ${agent.description || ''}`.trim(),
      parsed.messageText,
      { history }
    );

    if (!reply) return;

    const accessToken = account.meta_access_token;
    if (!accessToken) {
      console.warn('[Meta Webhook] account missing meta_access_token, cannot reply');
      return;
    }

    const ok = await sendWhatsAppMessage(parsed.phoneNumberId, accessToken, parsed.senderPhone, reply);
    if (!ok) return;

    await saveMessage(agent.id, account.id, parsed.senderPhone, parsed.senderName || null, parsed.messageText, reply);

    emitEvent({
      type: 'agent_activity',
      title: `${agent.name} respondió`,
      message: `Respuesta enviada en ${account.name}`,
      level: 'success',
      meta: { accountId: account.id, agentId: agent.id },
    });
  } catch (err: any) {
    console.error('[Meta Webhook] processing error:', err?.message || err);
  }
}
