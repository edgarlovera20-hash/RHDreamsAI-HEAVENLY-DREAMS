// ----- Auth token storage + 401 handling -----

export const TOKEN_STORAGE_KEY = 'rhdreams.token';
export const REMEMBERED_EMAIL_KEY = 'rhdreams.rememberedEmail';

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem(TOKEN_STORAGE_KEY) ||
    window.sessionStorage.getItem(TOKEN_STORAGE_KEY)
  );
}

let cachedToken: string | null = readStoredToken();

const unauthorizedListeners = new Set<() => void>();

/**
 * Save the JWT.
 *  - `persist = true` → localStorage (survives browser restart).
 *  - `persist = false` → sessionStorage (cleared when the tab/window closes).
 *  - `token = null` clears both stores.
 */
export function setAuthToken(token: string | null, persist = true) {
  cachedToken = token;
  if (typeof window === 'undefined') return;
  if (token) {
    if (persist) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getAuthToken(): string | null {
  return cachedToken;
}

export function getRememberedEmail(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
}

export function setRememberedEmail(email: string | null) {
  if (typeof window === 'undefined') return;
  if (email) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
}

export function onUnauthorized(cb: () => void): () => void {
  unauthorizedListeners.add(cb);
  return () => unauthorizedListeners.delete(cb);
}

function notifyUnauthorized() {
  for (const cb of unauthorizedListeners) {
    try {
      cb();
    } catch {}
  }
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  description: string | null;
  systemPrompt: string | null;
  providerId: string | null;
  status: string;
  channels: string[];
  avatarColor: string;
  memory: string;
  conversations: number;
  successRate: string;
  capabilities: string[];
};

export type Account = {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  agentId: string | null;
  lastSync: number | null;
  createdAt: number;
  welcomeMessage: string | null;
  followUpMessage: string | null;
  liveStatus: string | null;
};

export type Provider = {
  id: string;
  provider: string;
  label: string;
  apiKeyPreview: string;
  model: string;
  baseUrl: string | null;
  isDefault: boolean;
};

export type ProviderKindInfo = { label: string; model: string; baseUrl?: string };

export type AppEventPayload = {
  type: 'whatsapp_message' | 'account_status' | 'agent_activity' | 'system';
  title: string;
  message: string;
  level?: 'info' | 'success' | 'warning' | 'error';
  meta?: Record<string, any>;
  timestamp: number;
};

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (cachedToken) headers.Authorization = `Bearer ${cachedToken}`;

  const res = await fetch(input, { ...init, headers });
  const text = await res.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (res.status === 401) {
    notifyUnauthorized();
  }
  if (!res.ok) {
    throw new Error(body?.error || `HTTP ${res.status}`);
  }
  return body as T;
}

export const api = {
  async health() {
    return request<{ ok: boolean }>('/api/health');
  },

  async listAgents(): Promise<Agent[]> {
    const res = await request<{ agents: Agent[] }>('/api/agents');
    return res.agents;
  },

  async createAgent(payload: {
    name: string;
    role: string;
    description?: string;
    systemPrompt?: string;
    channels?: string[];
    providerId?: string | null;
    status?: string;
    avatarColor?: string;
  }): Promise<Agent> {
    const res = await request<{ agent: Agent }>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.agent;
  },

  async updateAgent(
    id: string,
    patch: Partial<{
      name: string;
      role: string;
      description: string;
      systemPrompt: string;
      status: string;
      providerId: string | null;
      channels: string[];
    }>
  ): Promise<Agent> {
    const res = await request<{ agent: Agent }>(`/api/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return res.agent;
  },

  async deleteAgent(id: string): Promise<void> {
    await request(`/api/agents/${id}`, { method: 'DELETE' });
  },

  async chatWithAgent(id: string, message: string, history?: { role: string; text: string }[]): Promise<{ reply: string; providerLabel: string; model: string }> {
    return request(`/api/agents/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
  },

  async listAccounts(): Promise<{ accounts: Account[]; max: number; active: number }> {
    return request('/api/accounts');
  },

  async createAccount(payload: {
    name: string;
    agentId?: string | null;
    welcomeMessage?: string;
    followUpMessage?: string;
  }): Promise<Account> {
    const res = await request<{ account: Account }>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.account;
  },

  async updateAccount(id: string, patch: Partial<{ name: string; agentId: string | null; welcomeMessage: string; followUpMessage: string }>): Promise<Account> {
    const res = await request<{ account: Account }>(`/api/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return res.account;
  },

  async deleteAccount(id: string): Promise<void> {
    await request(`/api/accounts/${id}`, { method: 'DELETE' });
  },

  streamAccount(id: string, onMessage: (data: { status: string; qr: string | null; phone: string | null; error?: string }) => void): () => void {
    const url = cachedToken ? `/api/accounts/${id}/stream?token=${encodeURIComponent(cachedToken)}` : `/api/accounts/${id}/stream`;
    const ev = new EventSource(url);
    ev.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch {}
    };
    ev.onerror = () => {
      // Auto-reconnect handled by browser; nothing to do here.
    };
    return () => ev.close();
  },

  streamEvents(onEvent: (event: AppEventPayload) => void): () => void {
    const url = cachedToken ? `/api/events?token=${encodeURIComponent(cachedToken)}` : `/api/events`;
    const ev = new EventSource(url);
    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch {}
    };
    ['whatsapp_message', 'account_status', 'agent_activity', 'system'].forEach((t) => ev.addEventListener(t, handler as EventListener));
    return () => ev.close();
  },

  // ----- Auth -----

  async bootstrapStatus(): Promise<{ needsBootstrap: boolean }> {
    return request('/api/auth/bootstrap-status');
  },

  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },

  async register(email: string, name: string, password: string): Promise<{ user: AuthUser; token: string }> {
    return request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, name, password }) });
  },

  async me(): Promise<AuthUser> {
    const res = await request<{ user: AuthUser }>('/api/auth/me');
    return res.user;
  },

  async listProviders(): Promise<{ providers: Provider[]; kinds: Record<string, ProviderKindInfo> }> {
    return request('/api/providers');
  },

  async createProvider(payload: {
    provider: string;
    label?: string;
    apiKey: string;
    model?: string;
    baseUrl?: string;
    makeDefault?: boolean;
  }): Promise<Provider> {
    const res = await request<{ provider: Provider }>('/api/providers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.provider;
  },

  async updateProvider(id: string, patch: { label?: string; apiKey?: string; model?: string; baseUrl?: string }): Promise<Provider> {
    const res = await request<{ provider: Provider }>(`/api/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return res.provider;
  },

  async setDefaultProvider(id: string): Promise<void> {
    await request(`/api/providers/${id}/default`, { method: 'POST' });
  },

  async deleteProvider(id: string): Promise<void> {
    await request(`/api/providers/${id}`, { method: 'DELETE' });
  },

  async testProvider(id: string): Promise<{ ok: boolean; reply?: string; error?: string }> {
    return request(`/api/providers/${id}/test`, { method: 'POST' });
  },

  // ----- Conversations -----

  async getConversations(agentId: string): Promise<{ conversations: any[] }> {
    return request(`/api/agents/${agentId}/conversations`);
  },

  async getConversationHistory(agentId: string, contactPhone: string): Promise<{ conversation: any }> {
    return request(`/api/agents/${agentId}/conversations/${encodeURIComponent(contactPhone)}`);
  },

  async getConversationStats(agentId: string): Promise<{ stats: { total_conversations: number; total_messages: number; unique_contacts: number } }> {
    return request(`/api/agents/${agentId}/conversation-stats`);
  },

  // ----- Meta WhatsApp Providers -----

  async listMetaProviders(): Promise<{ providers: any[] }> {
    return request('/api/meta-providers');
  },

  async createMetaProvider(payload: { businessAccountId: string; accessToken: string; webhookToken: string }): Promise<{ provider: any }> {
    const res = await request<{ provider: any }>('/api/meta-providers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },

  async deleteMetaProvider(id: string): Promise<void> {
    await request(`/api/meta-providers/${id}`, { method: 'DELETE' });
  },

  // ----- API Keys -----

  async listApiKeys(): Promise<{ keys: ApiKey[] }> {
    return request('/api/api-keys');
  },

  async createApiKey(payload: { name: string; scopes?: ApiKeyScope[]; expiresAt?: number | null }): Promise<{ key: string; meta: ApiKey }> {
    return request('/api/api-keys', { method: 'POST', body: JSON.stringify(payload) });
  },

  async revokeApiKey(id: string): Promise<void> {
    await request(`/api/api-keys/${id}/revoke`, { method: 'POST' });
  },

  async deleteApiKey(id: string): Promise<void> {
    await request(`/api/api-keys/${id}`, { method: 'DELETE' });
  },

  // ----- Integrations -----

  async listIntegrations(): Promise<{ integrations: Integration[] }> {
    return request('/api/integrations');
  },

  async createIntegration(payload: {
    type: IntegrationType;
    name: string;
    url: string;
    secret?: string;
    events?: string[];
  }): Promise<{ integration: Integration }> {
    return request('/api/integrations', { method: 'POST', body: JSON.stringify(payload) });
  },

  async updateIntegration(id: string, patch: Partial<{ name: string; url: string; secret: string; events: string[]; status: string }>): Promise<{ integration: Integration }> {
    return request(`/api/integrations/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },

  async deleteIntegration(id: string): Promise<void> {
    await request(`/api/integrations/${id}`, { method: 'DELETE' });
  },

  async testIntegration(id: string): Promise<{ ok: boolean; error?: string }> {
    return request(`/api/integrations/${id}/test`, { method: 'POST' });
  },

  // ----- Agent Templates -----

  async listAgentTemplates(): Promise<{ templates: AgentTemplate[] }> {
    return request('/api/agent-templates');
  },

  async cloneAgentTemplate(id: string, agentName: string): Promise<{ agent: Agent }> {
    return request(`/api/agent-templates/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify({ agentName }),
    });
  },

  // ----- Passkeys (WebAuthn) -----

  async passkeyRegisterOptions(): Promise<any> {
    return request('/api/auth/passkey/register/options', { method: 'POST', body: '{}' });
  },

  async passkeyRegisterVerify(payload: { registration: any; nickname?: string }): Promise<{ ok: true }> {
    return request('/api/auth/passkey/register/verify', { method: 'POST', body: JSON.stringify(payload) });
  },

  async passkeyLoginOptions(email?: string): Promise<any> {
    return request('/api/auth/passkey/login/options', { method: 'POST', body: JSON.stringify({ email }) });
  },

  async passkeyLoginVerify(payload: { response: any; email?: string }): Promise<{ user: AuthUser; token: string }> {
    return request('/api/auth/passkey/login/verify', { method: 'POST', body: JSON.stringify(payload) });
  },

  async listPasskeys(): Promise<{ passkeys: Passkey[] }> {
    return request('/api/auth/passkeys');
  },

  async deletePasskey(id: string): Promise<void> {
    await request(`/api/auth/passkeys/${id}`, { method: 'DELETE' });
  },
};

export type Passkey = {
  id: string;
  nickname: string | null;
  createdAt: number;
  lastUsedAt: number | null;
};

// ----- Extra public types for new features -----

export type ApiKeyScope = 'read' | 'write' | 'admin';

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  createdAt: number;
  lastUsedAt: number | null;
  expiresAt: number | null;
  revoked: boolean;
};

export type IntegrationType = 'webhook' | 'slack' | 'discord' | 'zapier' | 'n8n' | 'make';

export type Integration = {
  id: string;
  type: IntegrationType;
  name: string;
  url: string;
  events: string[];
  status: string;
  createdAt: number;
  lastTriggeredAt: number | null;
  lastError: string | null;
};

export type AgentTemplate = {
  id: string;
  name: string;
  role: string;
  description: string | null;
  systemPrompt: string | null;
  avatarColor: string;
  capabilities: string[];
  createdAt: number;
};
