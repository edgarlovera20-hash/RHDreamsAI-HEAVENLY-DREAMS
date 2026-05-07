import { Router } from 'express';
import db, { UserRow } from './db.js';
import { hashPassword, verifyPassword, signToken, requireAuth, AuthedRequest, userCount, findUserByEmail } from './auth.js';
import {
  buildRegistrationOptions,
  verifyRegistration,
  buildAuthenticationOptions,
  verifyAuthentication,
  listPasskeys,
  deletePasskey,
} from './passkeys.js';

const router = Router();

function nowId() {
  return `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function toPublicUser(row: UserRow) {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

router.get('/bootstrap-status', (_req, res) => {
  res.json({ needsBootstrap: userCount() === 0 });
});

router.post('/register', async (req: AuthedRequest, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ error: 'email, name y password requeridos' });
  if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

  const isBootstrap = userCount() === 0;
  if (!isBootstrap) {
    // Subsequent registrations require an admin token.
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Solo un admin puede crear usuarios adicionales.' });
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    const { verifyToken } = await import('./auth.js');
    const u = verifyToken(token);
    if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado.' });
  }

  if (findUserByEmail(email)) return res.status(409).json({ error: 'Email ya registrado.' });

  const id = nowId();
  const hash = await hashPassword(password);
  const role = isBootstrap ? 'admin' : 'user';
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, email.toLowerCase(), name, hash, role, Date.now());

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  const pub = toPublicUser(user);
  const token = signToken(pub);
  res.json({ user: pub, token });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas.' });
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas.' });
  const pub = toPublicUser(user);
  const token = signToken(pub);
  res.json({ user: pub, token });
});

router.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

// ---------- Passkeys (WebAuthn) ----------

// Registration: caller must already be authenticated.
router.post('/passkey/register/options', requireAuth, async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as UserRow | undefined;
  if (!userRow) return res.status(404).json({ error: 'Usuario no encontrado' });
  const options = await buildRegistrationOptions(userRow);
  res.json(options);
});

router.post('/passkey/register/verify', requireAuth, async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as UserRow | undefined;
  if (!userRow) return res.status(404).json({ error: 'Usuario no encontrado' });
  const { registration, nickname } = req.body || {};
  if (!registration) return res.status(400).json({ error: 'registration requerido' });
  const result = await verifyRegistration(userRow, registration, nickname);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

router.get('/passkeys', requireAuth, (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  res.json({ passkeys: listPasskeys(req.user.id) });
});

router.delete('/passkeys/:id', requireAuth, (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  if (!deletePasskey(req.user.id, req.params.id)) {
    return res.status(404).json({ error: 'Passkey no encontrada' });
  }
  res.json({ ok: true });
});

// Authentication: public — anyone with a registered key can present it.
router.post('/passkey/login/options', async (req, res) => {
  const { email } = req.body || {};
  const { options } = await buildAuthenticationOptions(typeof email === 'string' ? email : undefined);
  res.json(options);
});

router.post('/passkey/login/verify', async (req, res) => {
  const { response, email } = req.body || {};
  if (!response) return res.status(400).json({ error: 'response requerido' });
  const result = await verifyAuthentication(response, typeof email === 'string' ? email : undefined);
  if (!result.ok) return res.status(401).json({ error: result.error });
  const pub = { id: result.user.id, email: result.user.email, name: result.user.name, role: result.user.role };
  const token = signToken(pub);
  res.json({ user: pub, token });
});

export default router;
