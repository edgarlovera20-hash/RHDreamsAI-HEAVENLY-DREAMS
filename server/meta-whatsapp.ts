import db, { MetaProviderRow } from './db.js';

// Meta Graph API for WhatsApp Business (NOT Instagram).
const GRAPH_API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface MetaConfig {
  businessAccountId: string;
  accessToken: string;
  webhookToken: string;
}

async function metaFetch<T = any>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const detail = body?.error?.message || body?.error || `HTTP ${res.status}`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return body as T;
}

export async function addMetaProvider(config: MetaConfig): Promise<MetaProviderRow> {
  const id = `meta-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Verify the access token + business account ID before saving.
  const url = new URL(`${BASE_URL}/${encodeURIComponent(config.businessAccountId)}`);
  url.searchParams.set('access_token', config.accessToken);

  try {
    const data = await metaFetch<{ id?: string }>(url.toString());
    if (!data?.id) {
      throw new Error('Business account ID inválido o sin acceso.');
    }
  } catch (err: any) {
    throw new Error(`No se pudo verificar el proveedor Meta: ${err?.message || err}`);
  }

  db.prepare(
    `INSERT INTO meta_providers (id, business_account_id, access_token, webhook_token, status, created_at)
     VALUES (?, ?, ?, ?, 'connected', ?)`
  ).run(id, config.businessAccountId, config.accessToken, config.webhookToken, Date.now());

  return db.prepare('SELECT * FROM meta_providers WHERE id = ?').get(id) as MetaProviderRow;
}

export async function getMetaProviders(): Promise<MetaProviderRow[]> {
  return db.prepare('SELECT * FROM meta_providers WHERE status = ?').all('connected') as MetaProviderRow[];
}

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  message: string
): Promise<boolean> {
  try {
    const data = await metaFetch<{ messages?: { id: string }[] }>(
      `${BASE_URL}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientPhone,
          type: 'text',
          text: { body: message },
        }),
      }
    );
    return !!data.messages?.[0]?.id;
  } catch (error: any) {
    console.error('[Meta WhatsApp] sendWhatsAppMessage failed:', error?.message || error);
    return false;
  }
}

export async function getWhatsAppPhoneNumbers(
  businessAccountId: string,
  accessToken: string
): Promise<Array<{ id: string; displayPhoneNumber: string }>> {
  try {
    const url = new URL(`${BASE_URL}/${encodeURIComponent(businessAccountId)}/phone_numbers`);
    url.searchParams.set('access_token', accessToken);
    const data = await metaFetch<{ data?: Array<{ id: string; display_phone_number: string }> }>(url.toString());
    return (data.data || []).map((p) => ({ id: p.id, displayPhoneNumber: p.display_phone_number }));
  } catch (error: any) {
    console.error('[Meta WhatsApp] getWhatsAppPhoneNumbers failed:', error?.message || error);
    return [];
  }
}

export function validateWebhookToken(receivedToken: string, storedToken: string): boolean {
  return Boolean(receivedToken) && receivedToken === storedToken;
}

export interface ParsedWebhookMessage {
  phoneNumberId: string;
  senderPhone: string;
  senderName: string;
  messageText: string;
  timestamp: number;
}

export function parseWebhookMessage(payload: any): ParsedWebhookMessage | null {
  try {
    const change = payload?.entry?.[0]?.changes?.[0];
    const message = change?.value?.messages?.[0];
    const contact = change?.value?.contacts?.[0];

    if (!message || !contact) return null;

    return {
      phoneNumberId: change.value.metadata.phone_number_id,
      senderPhone: message.from,
      senderName: contact.profile?.name || '',
      messageText: message.text?.body || '',
      timestamp: parseInt(message.timestamp, 10) * 1000,
    };
  } catch {
    return null;
  }
}
