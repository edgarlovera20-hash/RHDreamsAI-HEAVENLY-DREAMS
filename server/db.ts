import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'rhdreams.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    label TEXT NOT NULL,
    api_key TEXT NOT NULL,
    model TEXT NOT NULL,
    base_url TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT,
    provider_id TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    channels TEXT NOT NULL DEFAULT '[]',
    avatar_color TEXT NOT NULL DEFAULT 'bg-cyan-500',
    memory TEXT DEFAULT '0 GB',
    conversations INTEGER DEFAULT 0,
    success_rate TEXT DEFAULT '-',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    agent_id TEXT,
    last_sync INTEGER,
    created_at INTEGER NOT NULL,
    welcome_message TEXT,
    followup_message TEXT,
    whatsapp_provider TEXT DEFAULT 'whatsapp-web',
    meta_phone_id TEXT,
    meta_access_token TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS agent_conversations (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_name TEXT,
    messages TEXT NOT NULL DEFAULT '[]',
    memory_summary TEXT,
    total_messages INTEGER DEFAULT 0,
    last_message_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS meta_providers (
    id TEXT PRIMARY KEY,
    business_account_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    webhook_token TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'connected',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agent_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT,
    avatar_color TEXT NOT NULL DEFAULT 'bg-cyan-500',
    capabilities TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    prefix TEXT NOT NULL,
    scopes TEXT NOT NULL DEFAULT '[]',
    created_by TEXT,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER,
    expires_at INTEGER,
    revoked INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    config TEXT NOT NULL DEFAULT '{}',
    events TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    last_triggered_at INTEGER,
    last_error TEXT
  );

  CREATE TABLE IF NOT EXISTS passkeys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT,
    nickname TEXT,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Lightweight migration: add capabilities column to existing agents and templates if missing.
function ensureColumn(table: string, column: string, decl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
  }
}
ensureColumn('agents', 'capabilities', "TEXT NOT NULL DEFAULT '[]'");
ensureColumn('agent_templates', 'capabilities', "TEXT NOT NULL DEFAULT '[]'");

const agentCount = (db.prepare('SELECT COUNT(*) as c FROM agents').get() as { c: number }).c;
if (agentCount === 0) {
  const insertAgent = db.prepare(`
    INSERT INTO agents (id, name, role, description, system_prompt, status, channels, avatar_color, memory, conversations, success_rate, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = Date.now();
  insertAgent.run(
    'ag-1',
    'Sourcing Bot Alfa',
    'Sourcing & Outreach',
    'Busca candidatos pasivos en LinkedIn y envía el primer mensaje de contacto.',
    'Eres un reclutador especializado en outreach a candidatos pasivos. Tu tono es profesional, cercano y directo. Adaptas cada mensaje al perfil de la persona.',
    'Active',
    JSON.stringify(['LinkedIn', 'Email']),
    'bg-cyan-500',
    '1.2 GB',
    154,
    '28%',
    now
  );
  insertAgent.run(
    'ag-2',
    'Eva - Resume Screener',
    'Screening',
    'Analiza CVs entrantes y los clasifica según el JD de la oferta.',
    'Eres Eva, una analista de RRHH experta en evaluación de CVs. Comparas perfiles contra job descriptions y devuelves un score (0-100) más justificación breve.',
    'Active',
    JSON.stringify(['Plataforma ATS', 'Indeed', 'Email']),
    'bg-purple-500',
    '4.8 GB',
    830,
    '95%',
    now
  );
  insertAgent.run(
    'ag-3',
    'Agendador Automático',
    'Scheduling',
    'Se encarga de cuadrar horarios entre reclutadores y candidatos por WhatsApp.',
    'Eres un asistente que coordina entrevistas. Propones horarios, confirmas disponibilidad y envías recordatorios. Tono cercano y eficiente.',
    'Draft',
    JSON.stringify(['WhatsApp', 'Google Calendar']),
    'bg-amber-500',
    '0 GB',
    0,
    '-',
    now
  );
}

export default db;

export type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  created_at: number;
};

export type ProviderRow = {
  id: string;
  provider: string;
  label: string;
  api_key: string;
  model: string;
  base_url: string | null;
  is_default: number;
  created_at: number;
};

export type AgentRow = {
  id: string;
  name: string;
  role: string;
  description: string | null;
  system_prompt: string | null;
  provider_id: string | null;
  status: string;
  channels: string;
  avatar_color: string;
  memory: string;
  conversations: number;
  success_rate: string;
  created_at: number;
};

export type AccountRow = {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  agent_id: string | null;
  last_sync: number | null;
  created_at: number;
  welcome_message: string | null;
  followup_message: string | null;
  whatsapp_provider?: string;
  meta_phone_id?: string | null;
  meta_access_token?: string | null;
};

export type ConversationRow = {
  id: string;
  agent_id: string;
  account_id: string;
  contact_phone: string;
  contact_name: string | null;
  messages: string;
  memory_summary: string | null;
  total_messages: number;
  last_message_at: number | null;
  created_at: number;
};

export type MetaProviderRow = {
  id: string;
  business_account_id: string;
  access_token: string;
  webhook_token: string;
  status: string;
  created_at: number;
};

export type AgentTemplateRow = {
  id: string;
  name: string;
  role: string;
  description: string | null;
  system_prompt: string | null;
  avatar_color: string;
  capabilities: string;
  created_at: number;
};

export type ApiKeyRow = {
  id: string;
  name: string;
  key_hash: string;
  prefix: string;
  scopes: string;
  created_by: string | null;
  created_at: number;
  last_used_at: number | null;
  expires_at: number | null;
  revoked: number;
};

export type IntegrationRow = {
  id: string;
  type: string;
  name: string;
  config: string;
  events: string;
  status: string;
  created_at: number;
  last_triggered_at: number | null;
  last_error: string | null;
};

export type PasskeyRow = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  nickname: string | null;
  created_at: number;
  last_used_at: number | null;
};

// Seed a curated set of specialized agent templates the first time the table is empty.
const tplCount = (db.prepare('SELECT COUNT(*) as c FROM agent_templates').get() as { c: number }).c;
if (tplCount === 0) {
  const insertTpl = db.prepare(
    `INSERT INTO agent_templates (id, name, role, description, system_prompt, avatar_color, capabilities, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const seedNow = Date.now();
  const SEEDS: Array<[
    string, string, string, string, string, string, string[]
  ]> = [
    [
      'tpl-sourcer',
      'Sourcer Pro',
      'Sourcing & Outreach',
      'Encuentra candidatos pasivos y envía el primer mensaje personalizado.',
      'Eres un reclutador especializado en outreach. Tu tono es cercano, profesional y directo. Identificas el stack del candidato y propones cómo conectar.',
      'bg-cyan-500',
      ['linkedin_search', 'send_message', 'tag_candidate'],
    ],
    [
      'tpl-screener',
      'CV Screener',
      'Screening',
      'Analiza CVs entrantes y los puntúa contra el job description.',
      'Eres una analista experta en evaluación de CVs. Comparas perfiles contra el JD y devuelves un score 0-100, justificación breve y banderas rojas.',
      'bg-purple-500',
      ['parse_cv', 'score_candidate', 'tag_candidate'],
    ],
    [
      'tpl-scheduler',
      'Interview Scheduler',
      'Scheduling',
      'Coordina horarios entre reclutadores y candidatos por WhatsApp/Email.',
      'Eres un asistente que coordina entrevistas. Propones 3 horarios, confirmas disponibilidad y envías recordatorios 24h antes. Tono cercano y eficiente.',
      'bg-amber-500',
      ['schedule_meeting', 'send_calendar_invite', 'send_reminder'],
    ],
    [
      'tpl-engager',
      'Talent Nurturer',
      'Engagement',
      'Mantiene calientes a candidatos pasivos con contenido relevante.',
      'Eres un community manager de talento. Cada N semanas envías a candidatos pasivos contenido útil sobre su industria sin pedirles nada a cambio.',
      'bg-rose-500',
      ['send_message', 'send_email'],
    ],
    [
      'tpl-onboarder',
      'Onboarding Buddy',
      'Onboarding',
      'Da la bienvenida al nuevo hire y resuelve dudas de los primeros 30 días.',
      'Eres el buddy virtual del nuevo empleado. Respondes dudas de RRHH, equipo, beneficios y onboarding técnico con tono amistoso.',
      'bg-emerald-500',
      ['send_message', 'send_email'],
    ],
    [
      'tpl-reporter',
      'Pipeline Reporter',
      'Analytics',
      'Genera reportes semanales del embudo y los envía por Slack/Email.',
      'Eres un analista de RRHH. Cada lunes resumes el estado del pipeline: candidatos por etapa, time-to-hire y bottlenecks accionables.',
      'bg-indigo-500',
      ['generate_report', 'send_email', 'webhook'],
    ],
    [
      'tpl-rejection',
      'Empathetic Rejector',
      'Communication',
      'Envía rechazos con feedback constructivo y deja la puerta abierta.',
      'Eres un comunicador empático. Redactas rechazos personalizados con feedback específico y mantienes al candidato en la red para futuras vacantes.',
      'bg-fuchsia-500',
      ['send_email', 'tag_candidate'],
    ],
    [
      'tpl-offer',
      'Offer Negotiator',
      'Closing',
      'Presenta la oferta, responde objeciones y cierra el acuerdo.',
      'Eres un cerrador. Presentas la oferta con claridad, manejas objeciones de salario y beneficios con datos del mercado, y guías al cierre.',
      'bg-blue-500',
      ['send_message', 'send_email', 'send_calendar_invite'],
    ],
  ];
  for (const [id, name, role, desc, prompt, color, caps] of SEEDS) {
    insertTpl.run(id, name, role, desc, prompt, color, JSON.stringify(caps), seedNow);
  }
}

// Seed the default admin account (idempotent — only runs if it doesn't exist).
// Identifier is stored lowercased because findUserByEmail() lowercases lookups.
const DEFAULT_USER = {
  id: 'usr-default-edlovera97',
  email: process.env.DEFAULT_ADMIN_EMAIL || 'admin',
  name: 'Admin RHDreams',
  password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'
};
const existsDefault = db.prepare('SELECT id FROM users WHERE id = ?').get(DEFAULT_USER.id) as { id: string } | undefined;
if (!existsDefault) {
  const hash = bcrypt.hashSync(DEFAULT_USER.password, 10);
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(DEFAULT_USER.id, DEFAULT_USER.email, DEFAULT_USER.name, hash, 'admin', Date.now());
  console.log(`[rhdreams db] seeded default admin user: ${DEFAULT_USER.email}`);
}
