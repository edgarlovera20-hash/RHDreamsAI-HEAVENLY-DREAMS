import db, { ConversationRow } from './db.js';
import { generateText, getProvider } from './ai.js';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export async function saveMessage(
  agentId: string,
  accountId: string,
  contactPhone: string,
  contactName: string | null,
  userMessage: string,
  assistantReply: string
): Promise<void> {
  let conversation = db
    .prepare(
      'SELECT * FROM agent_conversations WHERE agent_id = ? AND account_id = ? AND contact_phone = ?'
    )
    .get(agentId, accountId, contactPhone) as ConversationRow | undefined;

  const timestamp = Date.now();

  if (!conversation) {
    const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const messages: Message[] = [
      { role: 'user', text: userMessage, timestamp },
      { role: 'assistant', text: assistantReply, timestamp },
    ];

    db.prepare(
      `INSERT INTO agent_conversations
       (id, agent_id, account_id, contact_phone, contact_name, messages, total_messages, last_message_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 2, ?, ?)`
    ).run(
      id,
      agentId,
      accountId,
      contactPhone,
      contactName || null,
      JSON.stringify(messages),
      timestamp,
      timestamp
    );
  } else {
    const messages: Message[] = JSON.parse(conversation.messages);
    messages.push(
      { role: 'user', text: userMessage, timestamp },
      { role: 'assistant', text: assistantReply, timestamp }
    );

    // Keep last 50 messages for context
    const trimmedMessages = messages.slice(-50);

    db.prepare(
      `UPDATE agent_conversations
       SET messages = ?, total_messages = ?, last_message_at = ?, contact_name = COALESCE(?, contact_name)
       WHERE id = ?`
    ).run(
      JSON.stringify(trimmedMessages),
      conversation.total_messages + 2,
      timestamp,
      contactName || null,
      conversation.id
    );
  }
}

export function getConversationHistory(
  agentId: string,
  contactPhone: string,
  accountId?: string | null
): Message[] {
  const conversation = accountId
    ? (db
        .prepare(
          'SELECT * FROM agent_conversations WHERE agent_id = ? AND account_id = ? AND contact_phone = ?'
        )
        .get(agentId, accountId, contactPhone) as ConversationRow | undefined)
    : (db
        .prepare(
          'SELECT * FROM agent_conversations WHERE agent_id = ? AND contact_phone = ? ORDER BY last_message_at DESC LIMIT 1'
        )
        .get(agentId, contactPhone) as ConversationRow | undefined);

  if (!conversation) return [];
  return JSON.parse(conversation.messages) as Message[];
}

export async function updateMemorySummary(agentId: string, accountId: string, contactPhone: string): Promise<void> {
  const conversation = db
    .prepare(
      'SELECT * FROM agent_conversations WHERE agent_id = ? AND account_id = ? AND contact_phone = ?'
    )
    .get(agentId, accountId, contactPhone) as ConversationRow | undefined;

  if (!conversation || conversation.total_messages < 20) return;

  const messages: Message[] = JSON.parse(conversation.messages);
  const agent = db
    .prepare('SELECT provider_id FROM agents WHERE id = ?')
    .get(agentId) as { provider_id: string | null } | undefined;
  const provider = getProvider(agent?.provider_id ?? null);

  if (!provider) return;

  const messagesSummary = messages
    .map((m) => `${m.role === 'user' ? 'Candidato' : 'Agente'}: ${m.text}`)
    .join('\n');

  try {
    const summary = await generateText(
      provider,
      'Resume brevemente los puntos clave de esta conversación con un candidato, enfocándote en su experiencia, intereses y estado en el proceso de selección.',
      messagesSummary,
      { maxTokens: 500 }
    );

    db.prepare('UPDATE agent_conversations SET memory_summary = ? WHERE id = ?').run(
      summary,
      conversation.id
    );
  } catch (error) {
    console.error('[Agent Memory] Failed to update summary:', error);
  }
}

export function getConversationStats(agentId: string, accountId?: string | null) {
  const row = accountId
    ? (db
        .prepare(
          `SELECT
            COUNT(*) as total_conversations,
            COALESCE(SUM(total_messages), 0) as total_messages,
            COUNT(DISTINCT contact_phone) as unique_contacts
           FROM agent_conversations
           WHERE agent_id = ? AND account_id = ?`
        )
        .get(agentId, accountId) as
        | { total_conversations: number; total_messages: number; unique_contacts: number }
        | undefined)
    : (db
        .prepare(
          `SELECT
            COUNT(*) as total_conversations,
            COALESCE(SUM(total_messages), 0) as total_messages,
            COUNT(DISTINCT contact_phone) as unique_contacts
           FROM agent_conversations
           WHERE agent_id = ?`
        )
        .get(agentId) as
        | { total_conversations: number; total_messages: number; unique_contacts: number }
        | undefined);

  return row ?? { total_conversations: 0, total_messages: 0, unique_contacts: 0 };
}
