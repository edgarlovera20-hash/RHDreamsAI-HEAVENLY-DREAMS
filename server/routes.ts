import { Router, Request, Response } from 'express';
import db, { ProviderRow, AgentRow, AccountRow, MetaProviderRow, AgentTemplateRow, ConversationRow } from './db.js';
import { startSession, destroySession, subscribe, getStatus, activeSessionCount, MAX_ACTIVE_SESSIONS } from './whatsapp.js';
import { testProvider, PROVIDER_DEFAULTS, ProviderKind, getProvider, generateText } from './ai.js';
import { saveMessage, getConversationHistory, updateMemorySummary, getConversationStats } from './agent-memory.js';
import { addMetaProvider, getMetaProviders } from './meta-whatsapp.js';
import { listApiKeys, createApiKey, revokeApiKey, deleteApiKey, ApiKeyScope } from './api-keys.js';
import { listIntegrations, createIntegration, updateIntegration, deleteIntegration, testIntegration, IntegrationType } from './integrations.js';
import { AuthedRequest } from './auth.js';

const router = Router();

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function rowToAccount(r: AccountRow) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    status: r.status,
    agentId: r.agent_id,
    lastSync: r.last_sync,
    createdAt: r.created_at,
    welcomeMessage: r.welcome_message,
    followUpMessage: r.followup_message,
  };
}

function rowToAgent(r: AgentRow) {
  let capabilities: string[] = [];
  try {
    capabilities = JSON.parse((r as any).capabilities || '[]');
  } catch {}
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    description: r.description,
    systemPrompt: r.system_prompt,
    providerId: r.provider_id,
    status: r.status,
    channels: JSON.parse(r.channels || '[]'),
    avatarColor: r.avatar_color,
    memory: r.memory,
    conversations: r.conversations,
    successRate: r.success_rate,
    capabilities,
  };
}

function rowToProvider(r: ProviderRow) {
  return {
    id: r.id,
    provider: r.provider,
    label: r.label,
    apiKeyPreview: r.api_key.length > 8 ? `${r.api_key.slice(0, 4)}…${r.api_key.slice(-4)}` : '••••',
    model: r.model,
    baseUrl: r.base_url,
    isDefault: !!r.is_default,
  };
}

// ---------- Accounts ----------

router.get('/accounts', (_req, res) => {
  const rows = db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all() as AccountRow[];
  const enriched = rows.map((r) => {
    const live = getStatus(r.id);
    return {
      ...rowToAccount(r),
      liveStatus: live?.status ?? null,
    };
  });
  res.json({ accounts: enriched, max: MAX_ACTIVE_SESSIONS, active: activeSessionCount() });
});

router.post('/accounts', async (req, res) => {
  const { name, agentId, welcomeMessage, followUpMessage } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name requerido' });
  }
  if (activeSessionCount() >= MAX_ACTIVE_SESSIONS) {
    return res.status(400).json({ error: `Máximo de ${MAX_ACTIVE_SESSIONS} cuentas activas alcanzado.` });
  }
  const id = nowId('wa');
  db.prepare(
    `INSERT INTO accounts (id, name, status, agent_id, welcome_message, followup_message, created_at)
     VALUES (?, ?, 'pending', ?, ?, ?, ?)`
  ).run(id, name, agentId || null, welcomeMessage || null, followUpMessage || null, Date.now());
  try {
    await startSession(id);
  } catch (err: any) {
    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    return res.status(500).json({ error: err?.message || 'No se pudo iniciar la sesión.' });
  }
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow;
  res.json({ account: rowToAccount(row) });
});

router.patch('/accounts/:id', (req, res) => {
  const { agentId, welcomeMessage, followUpMessage, name } = req.body || {};
  const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id) as AccountRow | undefined;
  if (!existing) return res.status(404).json({ error: 'No encontrada' });
  db.prepare(
    `UPDATE accounts SET
      name = COALESCE(?, name),
      agent_id = COALESCE(?, agent_id),
      welcome_message = COALESCE(?, welcome_message),
      followup_message = COALESCE(?, followup_message)
     WHERE id = ?`
  ).run(
    name ?? null,
    agentId ?? null,
    welcomeMessage ?? null,
    followUpMessage ?? null,
    req.params.id
  );
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id) as AccountRow;
  res.json({ account: rowToAccount(row) });
});

router.delete('/accounts/:id', async (req, res) => {
  const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id) as AccountRow | undefined;
  if (!existing) return res.status(404).json({ error: 'No encontrada' });
  await destroySession(req.params.id);
  db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// SSE stream for QR + status updates.
router.get('/accounts/:id/stream', (req: Request, res: Response) => {
  const exists = db.prepare('SELECT id FROM accounts WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).end();

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const send = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const unsubscribe = subscribe(req.params.id, send);
  // Fallback: also poll DB periodically in case session was already running.
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);

  req.on('close', () => {
    clearInterval(ping);
    unsubscribe();
  });
});

// ---------- Providers ----------

router.get('/providers', (_req, res) => {
  const rows = db.prepare('SELECT * FROM providers ORDER BY created_at ASC').all() as ProviderRow[];
  res.json({ providers: rows.map(rowToProvider), kinds: PROVIDER_DEFAULTS });
});

router.post('/providers', (req, res) => {
  const { provider, label, apiKey, model, baseUrl, makeDefault } = req.body || {};
  if (!provider || !apiKey) return res.status(400).json({ error: 'provider y apiKey requeridos' });
  if (!(provider in PROVIDER_DEFAULTS)) return res.status(400).json({ error: 'provider no válido' });
  const def = PROVIDER_DEFAULTS[provider as ProviderKind];
  const id = nowId('prov');
  const finalLabel = label || def.label;
  const finalModel = model || def.model;
  const finalBase = baseUrl || def.baseUrl || null;
  db.prepare(
    `INSERT INTO providers (id, provider, label, api_key, model, base_url, is_default, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, provider, finalLabel, apiKey, finalModel, finalBase, makeDefault ? 1 : 0, Date.now());

  if (makeDefault) {
    db.prepare('UPDATE providers SET is_default = 0 WHERE id != ?').run(id);
  } else {
    // If first provider, mark default automatically.
    const count = (db.prepare('SELECT COUNT(*) as c FROM providers').get() as { c: number }).c;
    if (count === 1) db.prepare('UPDATE providers SET is_default = 1 WHERE id = ?').run(id);
  }
  const row = db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as ProviderRow;
  res.json({ provider: rowToProvider(row) });
});

router.patch('/providers/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.id) as ProviderRow | undefined;
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  const { label, apiKey, model, baseUrl } = req.body || {};
  db.prepare(
    `UPDATE providers SET
      label = COALESCE(?, label),
      api_key = COALESCE(?, api_key),
      model = COALESCE(?, model),
      base_url = COALESCE(?, base_url)
     WHERE id = ?`
  ).run(label ?? null, apiKey ?? null, model ?? null, baseUrl ?? null, req.params.id);
  const row = db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.id) as ProviderRow;
  res.json({ provider: rowToProvider(row) });
});

router.post('/providers/:id/default', (req, res) => {
  const existing = db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.id) as ProviderRow | undefined;
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('UPDATE providers SET is_default = 0').run();
  db.prepare('UPDATE providers SET is_default = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.delete('/providers/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.id) as ProviderRow | undefined;
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('DELETE FROM providers WHERE id = ?').run(req.params.id);
  if (existing.is_default) {
    const next = db.prepare('SELECT id FROM providers ORDER BY created_at ASC LIMIT 1').get() as { id?: string } | undefined;
    if (next?.id) db.prepare('UPDATE providers SET is_default = 1 WHERE id = ?').run(next.id);
  }
  res.json({ ok: true });
});

router.post('/providers/:id/test', async (req, res) => {
  const row = db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.id) as ProviderRow | undefined;
  if (!row) return res.status(404).json({ error: 'No encontrado' });
  const result = await testProvider(row);
  res.json(result);
});

// ---------- Agents ----------

router.get('/agents', (_req, res) => {
  const rows = db.prepare('SELECT * FROM agents ORDER BY created_at ASC').all() as AgentRow[];
  res.json({ agents: rows.map(rowToAgent) });
});

const AGENT_AVATAR_PALETTE = ['bg-cyan-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500', 'bg-indigo-500', 'bg-blue-500', 'bg-fuchsia-500'];

router.post('/agents', (req, res) => {
  const { name, role, description, systemPrompt, channels, providerId, status, avatarColor, capabilities } = req.body || {};
  if (!name || !role) return res.status(400).json({ error: 'name y role requeridos' });
  const id = nowId('ag');
  const color = avatarColor || AGENT_AVATAR_PALETTE[Math.floor(Math.random() * AGENT_AVATAR_PALETTE.length)];
  db.prepare(
    `INSERT INTO agents (id, name, role, description, system_prompt, provider_id, status, channels, avatar_color, memory, conversations, success_rate, capabilities, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '0 GB', 0, '-', ?, ?)`
  ).run(
    id,
    name,
    role,
    description || null,
    systemPrompt || null,
    providerId || null,
    status || 'Active',
    JSON.stringify(Array.isArray(channels) ? channels : []),
    color,
    JSON.stringify(Array.isArray(capabilities) ? capabilities : []),
    Date.now()
  );
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as AgentRow;
  res.json({ agent: rowToAgent(row) });
});

router.patch('/agents/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as AgentRow | undefined;
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  const { name, role, description, systemPrompt, status, providerId, channels, capabilities } = req.body || {};
  db.prepare(
    `UPDATE agents SET
      name = COALESCE(?, name),
      role = COALESCE(?, role),
      description = COALESCE(?, description),
      system_prompt = COALESCE(?, system_prompt),
      status = COALESCE(?, status),
      provider_id = COALESCE(?, provider_id),
      channels = COALESCE(?, channels),
      capabilities = COALESCE(?, capabilities)
     WHERE id = ?`
  ).run(
    name ?? null,
    role ?? null,
    description ?? null,
    systemPrompt ?? null,
    status ?? null,
    providerId ?? null,
    Array.isArray(channels) ? JSON.stringify(channels) : null,
    Array.isArray(capabilities) ? JSON.stringify(capabilities) : null,
    req.params.id
  );
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as AgentRow;
  res.json({ agent: rowToAgent(row) });
});

router.delete('/agents/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as AgentRow | undefined;
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/agents/:id/chat', async (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as AgentRow | undefined;
  if (!agent) return res.status(404).json({ error: 'No encontrado' });
  const { message, history } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message requerido' });

  const provider = getProvider(agent.provider_id);
  if (!provider) {
    return res.status(400).json({ error: 'No hay proveedor de IA configurado. Agrega uno en Configuración → Proveedores IA.' });
  }

  const system = agent.system_prompt || `Eres ${agent.name}, especializado en ${agent.role}. ${agent.description || ''}`.trim();
  // For now, history is informational. We send only the latest user message; full history support comes later.
  const contextSuffix = Array.isArray(history) && history.length > 0
    ? `\n\nContexto previo:\n${history.map((h: any) => `${h.role}: ${h.text}`).join('\n')}`
    : '';

  try {
    const reply = await generateText(provider, system + contextSuffix, message, { maxTokens: 1024 });
    db.prepare('UPDATE agents SET conversations = conversations + 1 WHERE id = ?').run(req.params.id);
    res.json({ reply, providerLabel: provider.label, model: provider.model });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error en la llamada al LLM' });
  }
});

// ---------- Agent Conversations ----------

router.get('/agents/:id/conversations', (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as AgentRow | undefined;
  if (!agent) return res.status(404).json({ error: 'Agente no encontrado' });

  const conversations = db
    .prepare('SELECT * FROM agent_conversations WHERE agent_id = ? ORDER BY last_message_at DESC')
    .all(req.params.id) as ConversationRow[];

  res.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      contactPhone: c.contact_phone,
      contactName: c.contact_name,
      totalMessages: c.total_messages,
      lastMessageAt: c.last_message_at,
      memorySummary: c.memory_summary,
      createdAt: c.created_at,
    })),
    stats: getConversationStats(req.params.id),
  });
});

router.get('/agents/:id/conversation-stats', (req, res) => {
  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(req.params.id) as { id: string } | undefined;
  if (!agent) return res.status(404).json({ error: 'Agente no encontrado' });
  res.json({ stats: getConversationStats(req.params.id) });
});

router.get('/agents/:id/conversations/:contactPhone', (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as AgentRow | undefined;
  if (!agent) return res.status(404).json({ error: 'Agente no encontrado' });

  const conversation = db
    .prepare(
      'SELECT * FROM agent_conversations WHERE agent_id = ? AND contact_phone = ?'
    )
    .get(req.params.id, req.params.contactPhone) as ConversationRow | undefined;

  if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });

  const history = getConversationHistory(req.params.id, req.params.contactPhone);

  res.json({
    conversation: {
      id: conversation.id,
      contactPhone: conversation.contact_phone,
      contactName: conversation.contact_name,
      totalMessages: conversation.total_messages,
      lastMessageAt: conversation.last_message_at,
      memorySummary: conversation.memory_summary,
      createdAt: conversation.created_at,
    },
    history,
  });
});

router.post('/agents/:id/conversations/:contactPhone/save', async (req, res) => {
  const { accountId, contactName, userMessage, assistantReply } = req.body || {};
  if (!accountId || !userMessage || !assistantReply) {
    return res.status(400).json({ error: 'accountId, userMessage y assistantReply requeridos' });
  }

  try {
    await saveMessage(req.params.id, accountId, req.params.contactPhone, contactName || null, userMessage, assistantReply);

    // Update memory summary if enough messages
    await updateMemorySummary(req.params.id, accountId, req.params.contactPhone);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error al guardar mensaje' });
  }
});

// ---------- Meta WhatsApp Providers ----------

router.get('/meta-providers', async (_req, res) => {
  try {
    const providers = await getMetaProviders();
    res.json({
      providers: providers.map((p) => ({
        id: p.id,
        businessAccountId: p.business_account_id,
        status: p.status,
        createdAt: p.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error al obtener proveedores' });
  }
});

router.post('/meta-providers', async (req, res) => {
  const { businessAccountId, accessToken, webhookToken } = req.body || {};
  if (!businessAccountId || !accessToken || !webhookToken) {
    return res.status(400).json({ error: 'businessAccountId, accessToken y webhookToken requeridos' });
  }

  try {
    const provider = await addMetaProvider({ businessAccountId, accessToken, webhookToken });
    res.json({
      provider: {
        id: provider.id,
        businessAccountId: provider.business_account_id,
        status: provider.status,
        createdAt: provider.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error al agregar proveedor Meta' });
  }
});

router.delete('/meta-providers/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM meta_providers WHERE id = ?').get(req.params.id) as MetaProviderRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Proveedor no encontrado' });
  db.prepare('DELETE FROM meta_providers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Note: the public Meta webhook (no auth) lives in `meta-webhook.ts` and is
// mounted directly in `index.ts` so Meta's calls don't hit the auth middleware.

// ---------- Agent Templates ----------

function rowToTemplate(t: AgentTemplateRow) {
  let capabilities: string[] = [];
  try {
    capabilities = JSON.parse(t.capabilities || '[]');
  } catch {}
  return {
    id: t.id,
    name: t.name,
    role: t.role,
    description: t.description,
    systemPrompt: t.system_prompt,
    avatarColor: t.avatar_color,
    capabilities,
    createdAt: t.created_at,
  };
}

router.get('/agent-templates', (_req, res) => {
  const templates = db.prepare('SELECT * FROM agent_templates ORDER BY created_at ASC').all() as AgentTemplateRow[];
  res.json({ templates: templates.map(rowToTemplate) });
});

router.post('/agent-templates', (req, res) => {
  const { name, role, description, systemPrompt, avatarColor, capabilities } = req.body || {};
  if (!name || !role) return res.status(400).json({ error: 'name y role requeridos' });

  const id = nowId('tpl');
  const color = avatarColor || AGENT_AVATAR_PALETTE[Math.floor(Math.random() * AGENT_AVATAR_PALETTE.length)];

  db.prepare(
    `INSERT INTO agent_templates (id, name, role, description, system_prompt, avatar_color, capabilities, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    name,
    role,
    description || null,
    systemPrompt || null,
    color,
    JSON.stringify(Array.isArray(capabilities) ? capabilities : []),
    Date.now()
  );

  const row = db.prepare('SELECT * FROM agent_templates WHERE id = ?').get(id) as AgentTemplateRow;
  res.json({ template: rowToTemplate(row) });
});

router.delete('/agent-templates/:id', (req, res) => {
  const r = db.prepare('DELETE FROM agent_templates WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Template no encontrado' });
  res.json({ ok: true });
});

router.post('/agent-templates/:id/clone', (req, res) => {
  const template = db.prepare('SELECT * FROM agent_templates WHERE id = ?').get(req.params.id) as AgentTemplateRow | undefined;
  if (!template) return res.status(404).json({ error: 'Template no encontrado' });

  const { agentName } = req.body || {};
  if (!agentName) return res.status(400).json({ error: 'agentName requerido' });

  const agentId = nowId('ag');
  db.prepare(
    `INSERT INTO agents (id, name, role, description, system_prompt, status, channels, avatar_color, memory, conversations, success_rate, capabilities, created_at)
     VALUES (?, ?, ?, ?, ?, 'Active', '[]', ?, '0 GB', 0, '-', ?, ?)`
  ).run(
    agentId,
    agentName,
    template.role,
    template.description,
    template.system_prompt,
    template.avatar_color,
    template.capabilities || '[]',
    Date.now()
  );

  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as AgentRow;
  res.json({ agent: rowToAgent(row) });
});

// ---------- API Keys ----------

router.get('/api-keys', (_req, res) => {
  res.json({ keys: listApiKeys() });
});

router.post('/api-keys', (req: AuthedRequest, res) => {
  const { name, scopes, expiresAt } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name requerido' });

  const validScopes: ApiKeyScope[] = ['read', 'write', 'admin'];
  const normalizedScopes: ApiKeyScope[] = Array.isArray(scopes)
    ? (scopes.filter((s: any) => validScopes.includes(s)) as ApiKeyScope[])
    : ['read'];

  const created = createApiKey({
    name,
    scopes: normalizedScopes,
    expiresAt: expiresAt ? Number(expiresAt) : null,
    createdBy: req.user?.id || null,
  });

  // The full key is returned ONCE here. Callers must store it themselves.
  res.json(created);
});

router.post('/api-keys/:id/revoke', (req, res) => {
  if (!revokeApiKey(req.params.id)) return res.status(404).json({ error: 'API key no encontrada' });
  res.json({ ok: true });
});

router.delete('/api-keys/:id', (req, res) => {
  if (!deleteApiKey(req.params.id)) return res.status(404).json({ error: 'API key no encontrada' });
  res.json({ ok: true });
});

// ---------- Outbound Integrations ----------

router.get('/integrations', (_req, res) => {
  res.json({ integrations: listIntegrations() });
});

router.post('/integrations', (req, res) => {
  const { type, name, url, secret, events } = req.body || {};
  if (!type || !name || !url) return res.status(400).json({ error: 'type, name y url requeridos' });
  try {
    const integration = createIntegration({
      type: type as IntegrationType,
      name,
      url,
      secret,
      events: Array.isArray(events) ? events : [],
    });
    res.json({ integration });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'No se pudo crear' });
  }
});

router.patch('/integrations/:id', (req, res) => {
  const updated = updateIntegration(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Integración no encontrada' });
  res.json({ integration: updated });
});

router.delete('/integrations/:id', (req, res) => {
  if (!deleteIntegration(req.params.id)) return res.status(404).json({ error: 'Integración no encontrada' });
  res.json({ ok: true });
});

router.post('/integrations/:id/test', async (req, res) => {
  const result = await testIntegration(req.params.id);
  res.json(result);
});

export default router;
