import { useEffect, useState } from "react";
import { Plus, Trash2, X, Webhook, Loader2, AlertCircle, CheckCircle2, Send, Slack, MessageSquare, Workflow, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, Integration, IntegrationType } from "@/lib/api";

const INTEGRATION_TYPES: {
  id: IntegrationType;
  label: string;
  description: string;
  Icon: any;
  color: string;
  placeholder: string;
}[] = [
  { id: 'slack', label: 'Slack', description: 'Envía eventos a un canal vía Incoming Webhook.', Icon: Slack, color: 'bg-purple-500/20 text-purple-300 border-purple-500/40', placeholder: 'https://hooks.slack.com/services/T.../B.../...' },
  { id: 'discord', label: 'Discord', description: 'Webhook de canal de Discord.', Icon: MessageSquare, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', placeholder: 'https://discord.com/api/webhooks/...' },
  { id: 'zapier', label: 'Zapier', description: 'Catch Hook de Zapier para disparar Zaps.', Icon: Zap, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', placeholder: 'https://hooks.zapier.com/hooks/catch/...' },
  { id: 'n8n', label: 'n8n', description: 'Webhook de un workflow de n8n.', Icon: Workflow, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', placeholder: 'https://n8n.midominio.com/webhook/...' },
  { id: 'make', label: 'Make (Integromat)', description: 'Custom Webhook de un escenario de Make.', Icon: Workflow, color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', placeholder: 'https://hook.eu1.make.com/...' },
  { id: 'webhook', label: 'Webhook genérico', description: 'POST JSON a cualquier URL HTTPS.', Icon: Webhook, color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', placeholder: 'https://api.midominio.com/eventos' },
];

const ALL_EVENTS = [
  { id: 'whatsapp_message', label: 'Mensajes WhatsApp entrantes' },
  { id: 'account_status', label: 'Cambios de estado en cuentas' },
  { id: 'agent_activity', label: 'Actividad de agentes (respuestas)' },
  { id: 'system', label: 'Eventos del sistema' },
];

function typeMeta(type: IntegrationType) {
  return INTEGRATION_TYPES.find((t) => t.id === type) || INTEGRATION_TYPES[INTEGRATION_TYPES.length - 1];
}

function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

export function IntegrationsPanel() {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; error?: string } | undefined>>({});

  const [draft, setDraft] = useState<{
    type: IntegrationType;
    name: string;
    url: string;
    secret: string;
    events: string[];
  }>({
    type: 'slack',
    name: '',
    url: '',
    secret: '',
    events: ['whatsapp_message', 'account_status', 'agent_activity'],
  });

  async function refresh() {
    try {
      const data = await api.listIntegrations();
      setItems(data.integrations || []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function startCreate() {
    setDraft({
      type: 'slack',
      name: '',
      url: '',
      secret: '',
      events: ['whatsapp_message', 'account_status', 'agent_activity'],
    });
    setShowForm(true);
  }

  function toggleEvent(id: string) {
    setDraft((d) => ({
      ...d,
      events: d.events.includes(id) ? d.events.filter((e) => e !== id) : [...d.events, id],
    }));
  }

  async function submit() {
    if (!draft.name.trim() || !draft.url.trim()) return;
    setSubmitting(true);
    try {
      await api.createIntegration({
        type: draft.type,
        name: draft.name.trim(),
        url: draft.url.trim(),
        secret: draft.secret.trim() || undefined,
        events: draft.events,
      });
      setShowForm(false);
      await refresh();
    } catch (e: any) {
      alert(e?.message || 'No se pudo crear la integración.');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta integración? Dejará de recibir eventos.')) return;
    try {
      await api.deleteIntegration(id);
      await refresh();
    } catch (e: any) {
      alert(e?.message || 'No se pudo eliminar.');
    }
  }

  async function test(id: string) {
    setTesting(id);
    try {
      const result = await api.testIntegration(id);
      setTestResult((prev) => ({ ...prev, [id]: result }));
      await refresh();
    } catch (e: any) {
      setTestResult((prev) => ({ ...prev, [id]: { ok: false, error: e?.message } }));
    } finally {
      setTesting(null);
    }
  }

  async function toggleStatus(item: Integration) {
    try {
      await api.updateIntegration(item.id, { status: item.status === 'active' ? 'paused' : 'active' });
      await refresh();
    } catch (e: any) {
      alert(e?.message || 'No se pudo cambiar estado.');
    }
  }

  const draftMeta = typeMeta(draft.type);

  return (
    <div>
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Webhook className="w-5 h-5 text-blue-400" />
            Integraciones
          </h2>
          <p className="text-sm text-slate-400 font-light">
            Conecta RHDreams con Slack, Discord, Zapier, n8n, Make o cualquier webhook propio.
            Cada evento de la app se envía como JSON a las integraciones suscritas.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={startCreate}
            className="bg-blue-500/20 border border-blue-500/40 hover:bg-blue-500/30 text-blue-200 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Nueva Integración
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="glass-panel p-3 rounded-xl flex items-center gap-2 text-amber-300 border border-amber-500/30 text-sm mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
          </div>
        )}

        {!loading && !showForm && (
          <>
            {items.length === 0 ? (
              <div className="glass-panel p-8 rounded-xl text-center">
                <Webhook className="w-10 h-10 text-blue-400/50 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-1">Sin integraciones configuradas</h3>
                <p className="text-sm text-slate-400 mb-4">Conecta una app externa para recibir eventos en tiempo real.</p>
                <button onClick={startCreate} className="bg-blue-500 hover:bg-blue-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm">
                  Conectar primera app
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {items.map((it) => {
                  const meta = typeMeta(it.type);
                  const Icon = meta.Icon;
                  const r = testResult[it.id];
                  const paused = it.status !== 'active';
                  return (
                    <div key={it.id} className={cn(
                      "glass-panel p-4 rounded-xl flex items-center justify-between gap-4 border",
                      paused ? "border-slate-700/50 opacity-60" : "border-slate-700/50"
                    )}>
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center shrink-0", meta.color)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-white truncate text-sm">{it.name}</h4>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-300 bg-slate-700/50 px-1.5 py-0.5 rounded">
                              {meta.label}
                            </span>
                            {paused && (
                              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                Pausada
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 truncate font-mono">{it.url}</div>
                          {it.events.length > 0 && (
                            <div className="text-[11px] text-slate-500 mt-1">
                              Suscrita a: {it.events.join(', ')}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 mt-1">
                            Último envío: {formatDate(it.lastTriggeredAt)}
                            {it.lastError && <span className="text-rose-400"> · {it.lastError}</span>}
                          </div>
                          {r && (
                            <div className={cn("text-xs mt-1", r.ok ? "text-emerald-400" : "text-rose-400")}>
                              {r.ok ? '✓ Test exitoso' : `✗ ${r.error}`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => test(it.id)}
                          disabled={testing === it.id}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {testing === it.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Probar
                        </button>
                        <button
                          onClick={() => toggleStatus(it)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-blue-400 transition-colors"
                        >
                          {paused ? 'Activar' : 'Pausar'}
                        </button>
                        <button
                          onClick={() => remove(it.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {showForm && (
          <div className="glass-panel p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Nueva Integración</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {INTEGRATION_TYPES.map((t) => {
                    const Icon = t.Icon;
                    const selected = draft.type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, type: t.id }))}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-all flex items-center gap-2",
                          selected ? `${t.color} border-current` : "border-slate-700 hover:border-slate-600 text-slate-300"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">{draftMeta.description}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre interno</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Ej: #reclutamiento (Slack)"
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">URL del Webhook</label>
                <input
                  type="text"
                  value={draft.url}
                  onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                  placeholder={draftMeta.placeholder}
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Secreto compartido <span className="text-slate-500">(opcional)</span>
                </label>
                <input
                  type="password"
                  value={draft.secret}
                  onChange={(e) => setDraft((d) => ({ ...d, secret: e.target.value }))}
                  placeholder="Se enviará en la cabecera X-RHDreams-Signature"
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Eventos suscritos</label>
                <div className="grid gap-2">
                  {ALL_EVENTS.map((ev) => {
                    const checked = draft.events.includes(ev.id);
                    return (
                      <label
                        key={ev.id}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border",
                          checked ? "bg-blue-500/10 border-blue-500/30" : "bg-slate-900/40 border-slate-700/50 hover:border-slate-600"
                        )}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleEvent(ev.id)} className="accent-blue-500" />
                        <span className="text-sm text-slate-200">{ev.label}</span>
                        <code className="ml-auto text-[10px] text-slate-500 font-mono">{ev.id}</code>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={submitting || !draft.name.trim() || !draft.url.trim()}
                className="bg-blue-500 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-400 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle2 className="w-4 h-4" />
                Conectar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
