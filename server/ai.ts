import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import db, { ProviderRow } from './db.js';

export type ProviderKind = 'anthropic' | 'openai' | 'gemini' | 'groq' | 'deepseek' | 'ollama' | 'openai-compatible';

export const PROVIDER_DEFAULTS: Record<ProviderKind, { label: string; model: string; baseUrl?: string }> = {
  anthropic: { label: 'Anthropic Claude', model: 'claude-3-5-sonnet-20240620' },
  openai: { label: 'OpenAI', model: 'gpt-4o-mini' },
  gemini: { label: 'Google Gemini', model: 'gemini-2.0-flash' },
  groq: { label: 'Groq', model: 'llama-3.3-70b-versatile', baseUrl: 'https://api.groq.com/openai/v1' },
  deepseek: { label: 'DeepSeek', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' },
  ollama: { label: 'Ollama (Local)', model: 'llama3', baseUrl: 'http://localhost:11434/v1' },
  'openai-compatible': { label: 'OpenAI Compatible', model: 'gpt-4o-mini' },
};

export function getDefaultProvider(): ProviderRow | null {
  const row = db.prepare('SELECT * FROM providers WHERE is_default = 1 LIMIT 1').get() as ProviderRow | undefined;
  if (row) return row;
  const first = db.prepare('SELECT * FROM providers ORDER BY created_at ASC LIMIT 1').get() as ProviderRow | undefined;
  return first ?? null;
}

export function getProvider(id: string | null): ProviderRow | null {
  if (!id) return getDefaultProvider();
  const row = db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as ProviderRow | undefined;
  return row ?? getDefaultProvider();
}

export async function generateText(
  provider: ProviderRow,
  systemPrompt: string,
  userMessage: string,
  options: { maxTokens?: number; history?: { role: 'user' | 'assistant'; text: string }[] } = {}
): Promise<string> {
  const maxTokens = options.maxTokens ?? 1024;
  const history = options.history || [];

  switch (provider.provider as ProviderKind) {
    case 'anthropic': {
      const client = new Anthropic({ apiKey: provider.api_key });
      const res = await client.messages.create({
        model: provider.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          ...history.map((h) => ({ role: h.role, content: h.text })),
          { role: 'user', content: userMessage },
        ],
      });
      const textBlock = res.content.find((b) => b.type === 'text');
      return textBlock && 'text' in textBlock ? textBlock.text : '';
    }

    case 'gemini': {
      const client = new GoogleGenAI({ apiKey: provider.api_key });
      const res = await client.models.generateContent({
        model: provider.model,
        contents: [
          ...history.map((h) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }],
          })),
          { role: 'user', parts: [{ text: userMessage }] },
        ],
        config: { systemInstruction: systemPrompt, maxOutputTokens: maxTokens },
      });
      return res.text ?? '';
    }

    case 'openai':
    case 'groq':
    case 'deepseek':
    case 'ollama':
    case 'openai-compatible': {
      const client = new OpenAI({
        apiKey: provider.api_key,
        baseURL: provider.base_url || undefined,
      });
      const res = await client.chat.completions.create({
        model: provider.model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map((h) => ({
            role: h.role,
            content: h.text,
          })),
          { role: 'user', content: userMessage },
        ],
      });
      return res.choices[0]?.message?.content ?? '';
    }

    default:
      throw new Error(`Provider not supported: ${provider.provider}`);
  }
}

export async function testProvider(provider: ProviderRow): Promise<{ ok: boolean; reply?: string; error?: string }> {
  try {
    const reply = await generateText(
      provider,
      'You are a helpful assistant. Reply in 5 words or less.',
      'Say hello and confirm you are working.',
      { maxTokens: 64 }
    );
    return { ok: true, reply: reply.trim() };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}
