import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import db from './db.js';
import { generateText, getDefaultProvider } from './ai.js';
import { emitEvent } from './events.js';
import { saveMessage } from './agent-memory.js';

export const MAX_ACTIVE_SESSIONS = 3;
const SESSION_DIR = path.resolve(process.cwd(), 'server', 'data', 'wa-sessions');
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

type SessionState = {
  client: any;
  status: 'initializing' | 'qr' | 'authenticating' | 'connected' | 'disconnected' | 'error';
  qrDataUrl: string | null;
  qrRaw: string | null;
  phone: string | null;
  error?: string;
  listeners: Set<(payload: any) => void>;
};

const sessions = new Map<string, SessionState>();

function emit(accountId: string) {
  const s = sessions.get(accountId);
  if (!s) return;
  const payload = {
    status: s.status,
    qr: s.qrDataUrl,
    phone: s.phone,
    error: s.error,
  };
  for (const listener of s.listeners) {
    try {
      listener(payload);
    } catch {}
  }
}

export function activeSessionCount(): number {
  let n = 0;
  for (const s of sessions.values()) {
    if (s.status !== 'disconnected' && s.status !== 'error') n++;
  }
  return n;
}

export function getStatus(accountId: string) {
  const s = sessions.get(accountId);
  if (!s) return null;
  return { status: s.status, qr: s.qrDataUrl, phone: s.phone, error: s.error };
}

export function subscribe(accountId: string, listener: (payload: any) => void): () => void {
  const s = sessions.get(accountId);
  if (!s) return () => {};
  s.listeners.add(listener);
  // Push current state immediately.
  listener({ status: s.status, qr: s.qrDataUrl, phone: s.phone, error: s.error });
  return () => {
    s.listeners.delete(listener);
  };
}

export async function startSession(accountId: string): Promise<void> {
  if (sessions.has(accountId)) return;

  if (activeSessionCount() >= MAX_ACTIVE_SESSIONS) {
    throw new Error(`Máximo de ${MAX_ACTIVE_SESSIONS} cuentas activas alcanzado.`);
  }

  const state: SessionState = {
    client: null,
    status: 'initializing',
    qrDataUrl: null,
    qrRaw: null,
    phone: null,
    listeners: new Set(),
  };
  sessions.set(accountId, state);

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: accountId, dataPath: SESSION_DIR }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });
  state.client = client;

  client.on('qr', async (qr: string) => {
    state.qrRaw = qr;
    try {
      state.qrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 1 });
    } catch (e: any) {
      state.qrDataUrl = null;
      state.error = e?.message;
    }
    state.status = 'qr';
    emit(accountId);
  });

  client.on('authenticated', () => {
    state.status = 'authenticating';
    state.qrDataUrl = null;
    state.qrRaw = null;
    emit(accountId);
  });

  client.on('ready', () => {
    state.status = 'connected';
    const info = client.info;
    state.phone = info?.wid?.user ? `+${info.wid.user}` : null;
    const account = db.prepare('SELECT name FROM accounts WHERE id = ?').get(accountId) as { name?: string } | undefined;
    db.prepare(
      'UPDATE accounts SET status = ?, phone = ?, last_sync = ? WHERE id = ?'
    ).run('connected', state.phone, Date.now(), accountId);
    emit(accountId);
    emitEvent({
      type: 'account_status',
      title: 'WhatsApp conectado',
      message: `${account?.name || accountId} (${state.phone || '?'}) está en línea.`,
      level: 'success',
      meta: { accountId, status: 'connected' },
    });
  });

  client.on('disconnected', (reason: string) => {
    state.status = 'disconnected';
    state.error = String(reason);
    const account = db.prepare('SELECT name FROM accounts WHERE id = ?').get(accountId) as { name?: string } | undefined;
    db.prepare('UPDATE accounts SET status = ? WHERE id = ?').run('disconnected', accountId);
    emit(accountId);
    emitEvent({
      type: 'account_status',
      title: 'WhatsApp desconectado',
      message: `${account?.name || accountId} se desconectó (${reason}).`,
      level: 'warning',
      meta: { accountId, status: 'disconnected', reason },
    });
  });

  client.on('auth_failure', (msg: string) => {
    state.status = 'error';
    state.error = `Auth failure: ${msg}`;
    emit(accountId);
    emitEvent({
      type: 'account_status',
      title: 'Error de autenticación WhatsApp',
      message: `Cuenta ${accountId}: ${msg}`,
      level: 'error',
      meta: { accountId, status: 'error' },
    });
  });

  client.on('message', async (msg: any) => {
    try {
      const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as any;
      if (!account) return;
      emitEvent({
        type: 'whatsapp_message',
        title: `Mensaje en ${account.name}`,
        message: `${msg.from}: ${(msg.body || '').slice(0, 120)}`,
        level: 'info',
        meta: { accountId, from: msg.from, body: msg.body },
      });

      if (!account.agent_id) return;
      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(account.agent_id) as any;
      if (!agent || agent.status !== 'Active') return;
      const provider = getDefaultProvider();
      if (!provider) return;

      const userMessage = msg.body || '';
      const reply = await generateText(
        provider,
        agent.system_prompt || `Eres ${agent.name}. ${agent.description || ''}`,
        userMessage
      );

      if (reply) {
        await msg.reply(reply);

        // Save conversation to memory
        try {
          const contact = await msg.getContact();
          const contactName = contact?.name || null;
          const contactPhone = msg.from;
          await saveMessage(agent.id, account.id, contactPhone, contactName, userMessage, reply);
        } catch (memErr: any) {
          console.error('[wa] failed to save conversation:', memErr);
        }

        emitEvent({
          type: 'agent_activity',
          title: `${agent.name} respondió`,
          message: `Respuesta enviada en ${account.name}`,
          level: 'success',
          meta: { accountId, agentId: agent.id },
        });
      }
    } catch (err: any) {
      console.error('[wa] auto-reply error', err);
      emitEvent({
        type: 'agent_activity',
        title: 'Error en auto-respuesta',
        message: err?.message || String(err),
        level: 'error',
        meta: { accountId },
      });
    }
  });

  client.initialize().catch((err: any) => {
    state.status = 'error';
    state.error = err?.message || String(err);
    emit(accountId);
  });
}

export async function destroySession(accountId: string, deleteAuthFiles = true): Promise<void> {
  const s = sessions.get(accountId);
  if (s?.client) {
    try {
      await s.client.logout().catch(() => {});
      await s.client.destroy().catch(() => {});
    } catch {}
  }
  sessions.delete(accountId);
  if (deleteAuthFiles) {
    const authPath = path.join(SESSION_DIR, `session-${accountId}`);
    if (fs.existsSync(authPath)) {
      try {
        fs.rmSync(authPath, { recursive: true, force: true });
      } catch {}
    }
  }
}

export async function shutdownAll(): Promise<void> {
  for (const id of [...sessions.keys()]) {
    await destroySession(id, false);
  }
}
