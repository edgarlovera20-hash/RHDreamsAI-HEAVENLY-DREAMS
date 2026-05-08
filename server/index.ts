import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes.js';
import authRoutes from './authRoutes.js';
import { requireAuth } from './auth.js';
import { eventStreamHandler } from './events.js';
import { shutdownAll } from './whatsapp.js';
import { metaWebhookGet, metaWebhookPost } from './meta-webhook.js';
import { startIntegrationsBus } from './integrations.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

if (!process.env.JWT_SECRET) {
  console.warn('[rhdreams api] WARNING: JWT_SECRET is not set. Using insecure default. Set JWT_SECRET in .env for production.');
}

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ 
  limit: '2mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);

// Meta webhook is public — Meta calls it without auth.
app.get('/api/meta-webhook', metaWebhookGet);
app.post('/api/meta-webhook', metaWebhookPost);

// All other /api routes require authentication.
app.get('/api/events', requireAuth, eventStreamHandler);
app.use('/api', requireAuth, routes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api error]', err);
  res.status(500).json({ error: err?.message || 'internal_error' });
});

startIntegrationsBus();

const server = app.listen(PORT, () => {
  console.log(`[rhdreams api] listening on http://localhost:${PORT}`);
});

const shutdown = async () => {
  console.log('\n[rhdreams api] shutting down…');
  server.close();
  await shutdownAll();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
