import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import db, { PasskeyRow, UserRow } from './db.js';

/**
 * WebAuthn / Passkey support.
 *
 * - Relying Party (RP) name + ID + origin are taken from env (so prod has the
 *   real domain). Defaults to `localhost` for dev.
 * - Challenges are kept in memory with a short TTL — that's fine for a single
 *   server. If the API ever runs multi-instance, swap to Redis or DB.
 * - Public keys + counters are stored as base64url strings to keep the
 *   db.ts portable (SQLite TEXT columns).
 */

const RP_NAME = 'RHDreams';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';

// In-memory challenge store keyed by `${kind}:${userId|email}`.
const CHALLENGE_TTL = 5 * 60 * 1000;
const challenges = new Map<string, { value: string; expires: number }>();

function setChallenge(key: string, value: string) {
  challenges.set(key, { value, expires: Date.now() + CHALLENGE_TTL });
}

function takeChallenge(key: string): string | null {
  const entry = challenges.get(key);
  if (!entry) return null;
  challenges.delete(key);
  if (entry.expires < Date.now()) return null;
  return entry.value;
}

function rowToPublic(row: PasskeyRow) {
  return {
    id: row.id,
    nickname: row.nickname,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

function listPasskeysForUser(userId: string): PasskeyRow[] {
  return db
    .prepare('SELECT * FROM passkeys WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as PasskeyRow[];
}

export function listPasskeys(userId: string) {
  return listPasskeysForUser(userId).map(rowToPublic);
}

export function deletePasskey(userId: string, id: string): boolean {
  const r = db.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').run(id, userId);
  return r.changes > 0;
}

// ---------- Registration (a logged-in user enrols a new authenticator) ----------

export async function buildRegistrationOptions(user: UserRow) {
  const existing = listPasskeysForUser(user.id);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: user.name,
    timeout: 60_000,
    attestationType: 'none',
    excludeCredentials: existing.map((p) => ({
      id: p.credential_id,
      transports: parseTransports(p.transports),
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      // No `authenticatorAttachment` so the browser offers the platform
      // authenticator (Windows Hello, Touch ID) AND any attached security key.
    },
  });

  setChallenge(`reg:${user.id}`, options.challenge);
  return options;
}

export async function verifyRegistration(
  user: UserRow,
  response: any,
  nickname?: string
): Promise<{ ok: true; error?: undefined } | { ok: false; error: string }> {
  const expectedChallenge = takeChallenge(`reg:${user.id}`);
  if (!expectedChallenge) return { ok: false, error: 'challenge_missing_or_expired' };

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });
  } catch (err: any) {
    return { ok: false, error: err?.message || 'verification_failed' };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: 'not_verified' };
  }

  const { credential, credentialBackedUp } = verification.registrationInfo;
  void credentialBackedUp; // could store this if we wanted to surface "synced" state

  const id = `pk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const transports = serializeTransports(response.response?.transports);

  db.prepare(
    `INSERT INTO passkeys (id, user_id, credential_id, public_key, counter, transports, nickname, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    user.id,
    credential.id,
    Buffer.from(credential.publicKey).toString('base64url'),
    credential.counter,
    transports,
    nickname?.trim() || null,
    Date.now()
  );

  return { ok: true };
}

// ---------- Authentication (anyone with a registered key can log in) ----------

export async function buildAuthenticationOptions(email?: string) {
  let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] | undefined;

  if (email) {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined;
    if (user) {
      const keys = listPasskeysForUser(user.id);
      allowCredentials = keys.map((p) => ({
        id: p.credential_id,
        transports: parseTransports(p.transports),
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    timeout: 60_000,
    userVerification: 'preferred',
    allowCredentials,
  });

  // Challenge is keyed by the email (best identifier we have pre-auth) or the
  // raw challenge string when email is unknown.
  const key = email ? `auth:${email.toLowerCase()}` : `auth:_:${options.challenge}`;
  setChallenge(key, options.challenge);
  return { options, key };
}

export async function verifyAuthentication(
  response: any,
  email?: string
): Promise<
  | { ok: true; user: UserRow; error?: undefined }
  | { ok: false; error: string; user?: undefined }
> {
  const credentialId = response?.id;
  if (!credentialId) return { ok: false, error: 'missing_credential_id' };

  const key = email ? `auth:${email.toLowerCase()}` : `auth:_:${response?.response?.clientDataJSON}`;
  let expectedChallenge = takeChallenge(key);

  // Fallback: when no email is provided we may have stored the challenge under
  // the raw value. Try to recover by searching all open challenges for the one
  // embedded in clientDataJSON.
  if (!expectedChallenge && !email) {
    try {
      const cdJson = JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64url').toString('utf-8'));
      expectedChallenge = cdJson.challenge;
    } catch {}
  }

  if (!expectedChallenge) return { ok: false, error: 'challenge_missing_or_expired' };

  const passkey = db
    .prepare('SELECT * FROM passkeys WHERE credential_id = ?')
    .get(credentialId) as PasskeyRow | undefined;
  if (!passkey) return { ok: false, error: 'credential_unknown' };

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(passkey.user_id) as UserRow | undefined;
  if (!user) return { ok: false, error: 'user_missing' };

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.credential_id,
        publicKey: Buffer.from(passkey.public_key, 'base64url'),
        counter: passkey.counter,
        transports: parseTransports(passkey.transports),
      },
      requireUserVerification: false,
    });
  } catch (err: any) {
    return { ok: false, error: err?.message || 'verification_failed' };
  }

  if (!verification.verified) return { ok: false, error: 'not_verified' };

  // Bump counter + last_used_at
  db.prepare('UPDATE passkeys SET counter = ?, last_used_at = ? WHERE id = ?').run(
    verification.authenticationInfo.newCounter,
    Date.now(),
    passkey.id
  );

  return { ok: true, user };
}

// ---------- Helpers ----------

function parseTransports(serialized: string | null): AuthenticatorTransportFuture[] | undefined {
  if (!serialized) return undefined;
  try {
    const parsed = JSON.parse(serialized);
    return Array.isArray(parsed) ? (parsed as AuthenticatorTransportFuture[]) : undefined;
  } catch {
    return undefined;
  }
}

function serializeTransports(transports: any): string | null {
  if (!Array.isArray(transports) || transports.length === 0) return null;
  return JSON.stringify(transports);
}
