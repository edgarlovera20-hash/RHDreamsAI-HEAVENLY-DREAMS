import db, { IntegrationRow } from './db.js';
import { onEvent, AppEvent } from './events.js';

/**
 * Outbound integrations. Users register webhooks (Slack incoming, Discord, n8n,
 * Zapier, custom) and pick which app event types should fire to them. We listen
 * on the in-process event bus and POST a shaped payload to each subscriber.
 */

export type IntegrationType = 'webhook' | 'slack' | 'discord' | 'zapier' | 'n8n' | 'make' | 'google' | 'facebook' | 'instagram' | 'tiktok' | 'custom_app';

export interface IntegrationConfig {
  url: string;
  secret?: string; // optional shared secret, sent as X-RHDreams-Signature header
}

export interface PublicIntegration {
  id: string;
  type: IntegrationType;
  name: string;
  url: string;
  events: string[];
  status: string;
  createdAt: number;
  lastTriggeredAt: number | null;
  lastError: string | null;
}

const ALLOWED_TYPES = new Set<IntegrationType>(['webhook', 'slack', 'discord', 'zapier', 'n8n', 'make', 'google', 'facebook', 'instagram', 'tiktok', 'custom_app']);

function rowToPublic(row: IntegrationRow): PublicIntegration {
  let cfg: IntegrationConfig = { url: '' };
  try {
    cfg = JSON.parse(row.config) as IntegrationConfig;
  } catch {}
  let events: string[] = [];
  try {
    const parsed = JSON.parse(row.events);
    if (Array.isArray(parsed)) events = parsed as string[];
  } catch {}
  return {
    id: row.id,
    type: row.type as IntegrationType,
    name: row.name,
    url: cfg.url,
    events,
    status: row.status,
    createdAt: row.created_at,
    lastTriggeredAt: row.last_triggered_at,
    lastError: row.last_error,
  };
}

export function listIntegrations(): PublicIntegration[] {
  const rows = db
    .prepare('SELECT * FROM integrations ORDER BY created_at DESC')
    .all() as IntegrationRow[];
  return rows.map(rowToPublic);
}

export interface CreateIntegrationInput {
  type: IntegrationType;
  name: string;
  url: string;
  secret?: string;
  events: string[];
}

export function createIntegration(input: CreateIntegrationInput): PublicIntegration {
  if (!ALLOWED_TYPES.has(input.type)) {
    throw new Error(`Tipo de integración no soportado: ${input.type}`);
  }
  if (!input.url || !/^https?:\/\//.test(input.url)) {
    throw new Error('La URL debe comenzar con http:// o https://');
  }
  const id = `int-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const config: IntegrationConfig = { url: input.url, secret: input.secret || undefined };
  db.prepare(
    `INSERT INTO integrations (id, type, name, config, events, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?)`
  ).run(id, input.type, input.name, JSON.stringify(config), JSON.stringify(input.events || []), Date.now());
  const row = db.prepare('SELECT * FROM integrations WHERE id = ?').get(id) as IntegrationRow;
  return rowToPublic(row);
}

export function updateIntegration(id: string, patch: Partial<CreateIntegrationInput> & { status?: string }) {
  const row = db.prepare('SELECT * FROM integrations WHERE id = ?').get(id) as IntegrationRow | undefined;
  if (!row) return null;
  let cfg: IntegrationConfig = { url: '' };
  try {
    cfg = JSON.parse(row.config) as IntegrationConfig;
  } catch {}
  const newCfg: IntegrationConfig = {
    url: patch.url ?? cfg.url,
    secret: patch.secret ?? cfg.secret,
  };
  const newEvents = patch.events ?? JSON.parse(row.events || '[]');
  db.prepare(
    `UPDATE integrations
     SET name = COALESCE(?, name),
         config = ?,
         events = ?,
         status = COALESCE(?, status)
     WHERE id = ?`
  ).run(patch.name ?? null, JSON.stringify(newCfg), JSON.stringify(newEvents), patch.status ?? null, id);
  const updated = db.prepare('SELECT * FROM integrations WHERE id = ?').get(id) as IntegrationRow;
  return rowToPublic(updated);
}

export function deleteIntegration(id: string): boolean {
  const r = db.prepare('DELETE FROM integrations WHERE id = ?').run(id);
  return r.changes > 0;
}

function shapePayload(type: IntegrationType, event: AppEvent) {
  // Slack/Discord want a `text` field; webhooks/zapier/n8n/make get the raw event.
  if (type === 'slack') {
    let color = '#06b6d4'; // default
    if (event.level === 'error') color = '#ef4444';
    else if (event.level === 'warning') color = '#f59e0b';
    else if (event.level === 'success') color = '#10b981';

    return {
      text: `*${event.title}*\n${event.message}`,
      attachments: [
        {
          color,
          fields: Object.entries(event.meta || {}).map(([k, v]) => ({ title: k, value: String(v), short: true })),
        },
      ],
    };
  }
  if (type === 'discord') {
    return {
      content: `**${event.title}**\n${event.message}`,
    };
  }
  return {
    type: event.type,
    title: event.title,
    message: event.message,
    level: event.level || 'info',
    meta: event.meta || {},
    timestamp: event.timestamp,
  };
}

async function deliver(row: IntegrationRow, event: AppEvent) {
  let cfg: IntegrationConfig = { url: '' };
  try {
    cfg = JSON.parse(row.config) as IntegrationConfig;
  } catch {}
  if (!cfg.url) return;
  const payload = shapePayload(row.type as IntegrationType, event);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.secret) headers['X-RHDreams-Signature'] = cfg.secret;

  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    db.prepare('UPDATE integrations SET last_triggered_at = ?, last_error = NULL WHERE id = ?')
      .run(Date.now(), row.id);
  } catch (err: any) {
    const msg = err?.message || String(err);
    db.prepare('UPDATE integrations SET last_triggered_at = ?, last_error = ? WHERE id = ?')
      .run(Date.now(), msg.slice(0, 500), row.id);
    console.error(`[integrations] ${row.type}/${row.name} delivery failed:`, msg);
  }
}

export async function testIntegration(id: string): Promise<{ ok: boolean; error?: string }> {
  const row = db.prepare('SELECT * FROM integrations WHERE id = ?').get(id) as IntegrationRow | undefined;
  if (!row) return { ok: false, error: 'no_existe' };
  const sample: AppEvent = {
    type: 'system',
    title: 'RHDreams · Test de integración',
    message: `Mensaje de prueba para ${row.name}.`,
    level: 'info',
    meta: { test: true },
    timestamp: Date.now(),
  };
  await deliver(row, sample);
  const after = db.prepare('SELECT last_error FROM integrations WHERE id = ?').get(id) as { last_error: string | null } | undefined;
  if (after?.last_error) return { ok: false, error: after.last_error };
  return { ok: true };
}

let started = false;
export function startIntegrationsBus() {
  if (started) return;
  started = true;
  onEvent((event) => {
    const rows = db
      .prepare("SELECT * FROM integrations WHERE status = 'active'")
      .all() as IntegrationRow[];
    for (const row of rows) {
      let events: string[] = [];
      try {
        events = JSON.parse(row.events);
      } catch {}
      // Empty events array means "all events"
      if (events.length > 0 && !events.includes(event.type)) continue;
      // Fire and forget — never block the bus
      deliver(row, event).catch(() => {});
    }
  });
}
