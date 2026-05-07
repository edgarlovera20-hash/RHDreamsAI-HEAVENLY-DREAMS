import { Router } from 'express';
import db, { UserRow } from './db.js';
import { hashPassword, verifyPassword, signToken, requireAuth, AuthedRequest, userCount, findUserByEmail } from './auth.js';

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

export default router;
