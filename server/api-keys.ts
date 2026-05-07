import crypto from 'crypto';
import db, { ApiKeyRow } from './db.js';

/**
 * RHDreams API key format:
 *   rhd_live_<24 random chars>
 * Stored as SHA-256 hash; only the prefix `rhd_live_<first 6>` is kept in the
 * clear so we can show a readable hint in the UI ("rhd_live_a1b2c3…").
 */

const KEY_PREFIX = 'rhd_live_';
const RANDOM_LEN = 24;

export type ApiKeyScope = 'read' | 'write' | 'admin';

export interface PublicApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  createdAt: number;
  lastUsedAt: number | null;
  expiresAt: number | null;
  revoked: boolean;
}

export function rowToPublic(row: ApiKeyRow): PublicApiKey {
  let scopes: ApiKeyScope[] = ['read'];
  try {
    const parsed = JSON.parse(row.scopes);
    if (Array.isArray(parsed)) scopes = parsed as ApiKeyScope[];
  } catch {}
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    scopes,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    revoked: !!row.revoked,
  };
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomKey(): string {
  // url-safe base64 trimmed
  const buf = crypto.randomBytes(RANDOM_LEN);
  return buf.toString('base64url').slice(0, RANDOM_LEN);
}

export function listApiKeys(): PublicApiKey[] {
  const rows = db
    .prepare('SELECT * FROM api_keys ORDER BY created_at DESC')
    .all() as ApiKeyRow[];
  return rows.map(rowToPublic);
}

export interface CreateApiKeyInput {
  name: string;
  scopes?: ApiKeyScope[];
  expiresAt?: number | null;
  createdBy?: string | null;
}

export interface CreatedApiKey {
  key: string; // returned ONCE in plaintext
  meta: PublicApiKey;
}

export function createApiKey(input: CreateApiKeyInput): CreatedApiKey {
  const id = `key-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const random = randomKey();
  const fullKey = `${KEY_PREFIX}${random}`;
  const hash = sha256(fullKey);
  const prefix = `${KEY_PREFIX}${random.slice(0, 6)}…`;
  const scopes = (input.scopes && input.scopes.length > 0) ? input.scopes : (['read'] as ApiKeyScope[]);

  db.prepare(
    `INSERT INTO api_keys (id, name, key_hash, prefix, scopes, created_by, created_at, expires_at, revoked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    input.name,
    hash,
    prefix,
    JSON.stringify(scopes),
    input.createdBy || null,
    Date.now(),
    input.expiresAt ?? null
  );

  const row = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id) as ApiKeyRow;
  return { key: fullKey, meta: rowToPublic(row) };
}

export function revokeApiKey(id: string): boolean {
  const r = db.prepare('UPDATE api_keys SET revoked = 1 WHERE id = ?').run(id);
  return r.changes > 0;
}

export function deleteApiKey(id: string): boolean {
  const r = db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  return r.changes > 0;
}

/**
 * Validate a key string from `Authorization: Bearer <key>` and, if valid,
 * touch `last_used_at` and return the matching row (without secret data).
 */
export function validateApiKey(rawKey: string): { ok: boolean; key?: PublicApiKey; reason?: string } {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) return { ok: false, reason: 'wrong_prefix' };
  const hash = sha256(rawKey);
  const row = db.prepare('SELECT * FROM api_keys WHERE key_hash = ?').get(hash) as ApiKeyRow | undefined;
  if (!row) return { ok: false, reason: 'unknown' };
  if (row.revoked) return { ok: false, reason: 'revoked' };
  if (row.expires_at && row.expires_at < Date.now()) return { ok: false, reason: 'expired' };

  db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(Date.now(), row.id);
  return { ok: true, key: rowToPublic(row) };
}
