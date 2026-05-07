import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import db, { UserRow } from './db.js';
import { validateApiKey, PublicApiKey } from './api-keys.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';
const JWT_TTL = process.env.JWT_TTL || '7d';
const BCRYPT_ROUNDS = 10;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type AuthedRequest = Request & {
  user?: AuthUser;
  apiKey?: PublicApiKey;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: JWT_TTL } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { id: decoded.sub, email: decoded.email, name: decoded.name, role: decoded.role };
  } catch {
    return null;
  }
}

export function userCount(): number {
  return (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined;
}

export function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  // Allow token in query string for SSE (EventSource cannot set headers).
  const q = (req.query.token as string | undefined) || '';
  return q || null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  // Try API key first (cheap rejection if it doesn't match the prefix).
  if (token.startsWith('rhd_')) {
    const result = validateApiKey(token);
    if (!result.ok) {
      return res.status(401).json({ error: `API key inválida (${result.reason})` });
    }
    req.apiKey = result.key;
    // Synthesize a service user so downstream code doesn't need to special-case API keys.
    req.user = {
      id: `apikey:${result.key!.id}`,
      email: 'api@rhdreams.local',
      name: result.key!.name,
      role: result.key!.scopes.includes('admin') ? 'admin' : 'service',
    };
    return next();
  }

  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Token inválido o expirado' });
  req.user = user;
  next();
}

/** Middleware variant that requires a specific API-key scope (or a JWT user). */
export function requireScope(scope: 'read' | 'write' | 'admin') {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    // JWT users (humans) bypass scope checks.
    if (!req.apiKey) return next();
    const scopes = req.apiKey.scopes;
    if (scopes.includes('admin')) return next();
    if (scopes.includes(scope)) return next();
    return res.status(403).json({ error: `API key no tiene scope '${scope}'` });
  };
}
