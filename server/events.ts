import { EventEmitter } from 'node:events';
import { Request, Response } from 'express';

export type AppEvent = {
  type: 'whatsapp_message' | 'account_status' | 'agent_activity' | 'system' | 'google' | 'facebook' | 'instagram' | 'tiktok' | 'custom_app';
  title: string;
  message: string;
  level?: 'info' | 'success' | 'warning' | 'error';
  meta?: Record<string, any>;
  timestamp: number;
};

const bus = new EventEmitter();
bus.setMaxListeners(50);

export function emitEvent(event: Omit<AppEvent, 'timestamp'>) {
  const full: AppEvent = { ...event, timestamp: Date.now() };
  bus.emit('event', full);
}

/** Subscribe to every app event (used by outbound integrations / webhooks). */
export function onEvent(handler: (event: AppEvent) => void): () => void {
  bus.on('event', handler);
  return () => {
    bus.off('event', handler);
  };
}

export function eventStreamHandler(_req: Request, res: Response) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const send = (event: AppEvent) => {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  bus.on('event', send);

  // Initial hello so the client confirms connection.
  res.write(`event: hello\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);

  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);

  _req.on('close', () => {
    clearInterval(ping);
    bus.off('event', send);
  });
}
