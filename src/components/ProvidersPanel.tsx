import { useEffect, useState } from "react";
import { Plus, Trash2, CheckCircle2, X, Sparkles, Loader2, Star, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, Provider, ProviderKindInfo } from "@/lib/api";

const PROVIDER_BRAND: Record<string, { color: string; help: string }> = {
  anthropic: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', help: 'API key desde console.anthropic.com (sk-ant-…)' },
  openai: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', help: 'API key desde platform.openai.com (sk-…)' },
  gemini: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', help: 'API key desde aistudio.google.com/apikey' },
  groq: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/40', help: 'API key desde console.groq.com' },
  deepseek: { color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40', help: 'API key desde platform.deepseek.com' },
  ollama: { color: 'bg-slate-500/20 text-slate-300 border-slate-500/40', help: 'Asegúrate que Ollama esté corriendo (http://localhost:11434)' },
  'openai-compatible': { color: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40', help: 'Para Mistral, Together, Perplexity, etc. Configura baseURL.' },
};

export function ProvidersPanel() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [kinds, setKinds] = useState<Record<string, ProviderKindInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; reply?: string; error?: string } | undefined>>({});
  const [testingId, setTestingId] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    provider: 'anthropic',
    label: '',
    apiKey: '',
    model: '',
    baseUrl: '',
    makeDefault: false,
  });

  async function refresh() {
    try {
      const data = await api.listProviders();
      setProviders(data.providers);
      setKinds(data.kinds);
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
    setEditing(null);
    setDraft({
      provider: 'anthropic',
      label: '',
      apiKey: '',
      model: kinds['anthropic']?.model || '',
      baseUrl: '',
      makeDefault: providers.length === 0,
    });
    setShowForm(true);
  }

  function startEdit(p: Provider) {
    setEditing(p);
    setDraft({
      provider: p.provider,
      label: p.label,
      apiKey: '',
      model: p.model,
      baseUrl: p.baseUrl || '',
      makeDefault: p.isDefault,
    });
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditing(null);
  }

  async function submit() {
    setSubmitting(true);
    try {
      if (editing) {
        await api.updateProvider(editing.id, {
          label: draft.label || undefined,
          apiKey: draft.apiKey || undefined,
          model: draft.model || undefined,
          baseUrl: draft.baseUrl || undefined,
        });
        if (draft.makeDefault && !editing.isDefault) await api.setDefaultProvider(editing.id);
      } else {
        const created = await api.createProvider({
          provider: draft.provider,
          label: draft.label || undefined,
          apiKey: draft.apiKey,
          model: draft.model || undefined,
          baseUrl: draft.baseUrl || undefined,
          makeDefault: draft.makeDefault,
        });
        if (draft.makeDefault) await api.setDefaultProvider(created.id);
      }
      await refresh();
      setShowForm(false);
      setEditing(null);
    } catch (e: any) {
      alert(e?.message || 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este proveedor?')) return;
    try {
      await api.deleteProvider(id);
      await refresh();
    } catch (e: any) {
      alert(e?.message || 'No se pudo eliminar.');
    }
  }

  async function makeDefault(id: string) {
    try {
      await api.setDefaultProvider(id);
      await refresh();
    } catch (e: any) {
      alert(e?.message || 'No se pudo marcar como default.');
    }
  }

  async function test(id: string) {
    setTestingId(id);
    try {
      const result = await api.testProvider(id);
      setTestResult((prev) => ({ ...prev, [id]: result }));
    } catch (e: any) {
      setTestResult((prev) => ({ ...prev, [id]: { ok: false, error: e?.message } }));
    } finally {
      setTestingId(null);
    }
  }

  const providerKindKeys = Object.keys(kinds);
  const brand = PROVIDER_BRAND[draft.provider];

  return (
    <div>
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse-soft" />
            Proveedores de IA
          </h2>
          <p className="text-sm text-slate-400 font-light">Configura qué modelo de IA usan tus agentes. El proveedor por defecto se usa cuando un agente no tiene uno asignado.</p>
        </div>
        {!showForm && (
          <button
            onClick={startCreate}
            className="bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-200 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Agregar Proveedor
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="glass-panel p-3 rounded-xl flex items-center gap-2 text-amber-300 border border-amber-500/30 text-sm mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}. Verifica que el backend esté corriendo (<code className="font-mono">npm run dev:server</code>).</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
          </div>
        )}

        {!loading && !showForm && (
          <>
            {providers.length === 0 ? (
              <div className="glass-panel p-8 rounded-xl text-center">
                <Sparkles className="w-10 h-10 text-amber-400/50 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-1">Aún no tienes proveedores configurados</h3>
                <p className="text-sm text-slate-400 mb-4">Agrega Claude, OpenAI, Gemini, Groq, o cualquier endpoint OpenAI-compatible.</p>
                <button onClick={startCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm">
                  Agregar primer proveedor
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {providers.map((p) => {
                  const b = PROVIDER_BRAND[p.provider];
                  const r = testResult[p.id];
                  return (
                    <div key={p.id} className="glass-panel p-4 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center shrink-0", b?.color || 'bg-slate-700 text-slate-300')}>
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-white truncate">{p.label}</h4>
                            {p.isDefault && (
                              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Star className="w-3 h-3" /> Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            <span className="text-slate-500">{p.provider}</span> · {p.model} · key {p.apiKeyPreview}
                          </div>
                          {r && (
                            <div className={cn("text-xs mt-1", r.ok ? "text-emerald-400" : "text-rose-400")}>
                              {r.ok ? `✓ ${r.reply}` : `✗ ${r.error}`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => test(p.id)}
                          disabled={testingId === p.id}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {testingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Probar
                        </button>
                        {!p.isDefault && (
                          <button
                            onClick={() => makeDefault(p.id)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                          >
                            Marcar default
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(p)}
                          title="Editar proveedor"
                          aria-label="Editar proveedor"
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-blue-400 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => remove(p.id)}
                          title="Eliminar proveedor"
                          aria-label="Eliminar proveedor"
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
              <h3 className="text-sm font-semibold text-white">{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button 
                onClick={cancel} 
                title="Cerrar formulario"
                aria-label="Cerrar formulario"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <label htmlFor="provider-type" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Tipo de Proveedor
                </label>
                <select
                  id="provider-type"
                  disabled={!!editing}
                  value={draft.provider}
                  onChange={(e) => {
                    const p = e.target.value;
                    setDraft((d) => ({
                      ...d,
                      provider: p,
                      model: kinds[p]?.model || '',
                      baseUrl: kinds[p]?.baseUrl || '',
                    }));
                  }}
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none disabled:opacity-50"
                >
                  {providerKindKeys.map((k) => (
                    <option key={k} value={k}>
                      {kinds[k].label}
                    </option>
                  ))}
                </select>
                {brand?.help && <p className="text-[11px] text-slate-500 mt-1">{brand.help}</p>}
              </div>

              <div>
                <label htmlFor="provider-label" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Etiqueta (nombre amigable)
                </label>
                <input
                  id="provider-label"
                  type="text"
                  value={draft.label}
                  onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                  placeholder={kinds[draft.provider]?.label || 'Mi proveedor'}
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label htmlFor="provider-key" className="block text-xs font-medium text-slate-400 mb-1.5">
                  API Key {editing && <span className="text-slate-500">(deja vacío para mantener la actual)</span>}
                </label>
                <input
                  id="provider-key"
                  type="password"
                  value={draft.apiKey}
                  onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
                  placeholder={editing ? '••••••••' : 'sk-...'}
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="provider-model" className="block text-xs font-medium text-slate-400 mb-1.5">
                    Modelo
                  </label>
                  <input
                    id="provider-model"
                    type="text"
                    value={draft.model}
                    onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
                    placeholder={kinds[draft.provider]?.model}
                    className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label htmlFor="provider-url" className="block text-xs font-medium text-slate-400 mb-1.5">
                    Base URL <span className="text-slate-500">(opcional)</span>
                  </label>
                  <input
                    id="provider-url"
                    type="text"
                    value={draft.baseUrl}
                    onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                    placeholder={kinds[draft.provider]?.baseUrl || 'auto'}
                    className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  id="provider-default"
                  type="checkbox"
                  checked={draft.makeDefault}
                  onChange={(e) => setDraft((d) => ({ ...d, makeDefault: e.target.checked }))}
                  className="accent-amber-500 cursor-pointer"
                />
                <label htmlFor="provider-default" className="text-sm text-slate-300 cursor-pointer">
                  Marcar como proveedor por defecto
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={cancel} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={submitting || (!editing && !draft.apiKey)}
                className="bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
