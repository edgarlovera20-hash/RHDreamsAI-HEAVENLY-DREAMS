import { useEffect, useState } from "react";
import { Plus, Trash2, X, Key, Loader2, AlertCircle, Copy, Check, Ban, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, ApiKey, ApiKeyScope } from "@/lib/api";

const ALL_SCOPES: { id: ApiKeyScope; label: string; description: string }[] = [
  { id: 'read', label: 'Lectura', description: 'Listar agentes, candidatos, conversaciones.' },
  { id: 'write', label: 'Escritura', description: 'Crear/editar agentes, enviar mensajes.' },
  { id: 'admin', label: 'Administración', description: 'Acceso total — solo para integraciones internas.' },
];

function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<{ name: string; scopes: ApiKeyScope[]; expiresInDays: string }>({
    name: '',
    scopes: ['read'],
    expiresInDays: '',
  });

  const [createdKey, setCreatedKey] = useState<{ key: string; meta: ApiKey } | null>(null);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    try {
      const data = await api.listApiKeys();
      setKeys(data.keys || []);
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
    setDraft({ name: '', scopes: ['read'], expiresInDays: '' });
    setShowForm(true);
  }

  function toggleScope(scope: ApiKeyScope) {
    setDraft((d) => ({
      ...d,
      scopes: d.scopes.includes(scope) ? d.scopes.filter((s) => s !== scope) : [...d.scopes, scope],
    }));
  }

  async function submit() {
    if (!draft.name.trim() || draft.scopes.length === 0) return;
    setSubmitting(true);
    try {
      const expiresAt = draft.expiresInDays
        ? Date.now() + Number(draft.expiresInDays) * 86400000
        : null;
      const created = await api.createApiKey({
        name: draft.name.trim(),
        scopes: draft.scopes,
        expiresAt,
      });
      setCreatedKey(created);
      setShowForm(false);
      await refresh();
    } catch (e: any) {
      alert(e?.message || 'No se pudo crear la API key.');
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('¿Revocar esta API key? Las apps que la usen dejarán de funcionar de inmediato.')) return;
    try {
      await api.revokeApiKey(id);
      await refresh();
    } catch (e: any) {
      alert(e?.message || 'No se pudo revocar.');
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar permanentemente esta API key?')) return;
    try {
      await api.deleteApiKey(id);
      await refresh();
    } catch (e: any) {
      alert(e?.message || 'No se pudo eliminar.');
    }
  }

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('No se pudo copiar al portapapeles.');
    }
  }

  return (
    <div>
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-fuchsia-400" />
            API Keys
          </h2>
          <p className="text-sm text-slate-400 font-light">
            Genera tokens para que apps externas (Zapier, n8n, scripts propios) llamen a la API de RHDreams.
            Envía la key como <code className="text-fuchsia-300 font-mono">Authorization: Bearer rhd_live_…</code>.
          </p>
        </div>
        {!showForm && !createdKey && (
          <button
            onClick={startCreate}
            className="bg-fuchsia-500/20 border border-fuchsia-500/40 hover:bg-fuchsia-500/30 text-fuchsia-200 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Generar Key
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

        {/* Created-key one-time display */}
        {createdKey && (
          <div className="glass-panel p-5 rounded-xl border-2 border-fuchsia-500/40 mb-4 shadow-[0_0_25px_rgba(217,70,239,0.2)]">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-fuchsia-400" />
              <h3 className="text-sm font-bold text-fuchsia-300 uppercase tracking-wider">Tu API Key — cópiala AHORA</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Esta es la única vez que verás la key completa. Si la pierdes, tienes que generar otra.
            </p>
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-lg p-3 font-mono text-sm text-fuchsia-200 break-all">
              <code className="flex-1">{createdKey.key}</code>
              <button
                onClick={() => copyKey(createdKey.key)}
                className="shrink-0 p-2 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/40 text-fuchsia-300 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => { setCreatedKey(null); setCopied(false); }}
              className="mt-4 text-xs text-slate-400 hover:text-white"
            >
              Ya la guardé, cerrar →
            </button>
          </div>
        )}

        {!loading && !showForm && !createdKey && (
          <>
            {keys.length === 0 ? (
              <div className="glass-panel p-8 rounded-xl text-center">
                <Key className="w-10 h-10 text-fuchsia-400/50 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-1">Aún no has generado API keys</h3>
                <p className="text-sm text-slate-400 mb-4">Crea una key para conectar RHDreams con apps externas.</p>
                <button onClick={startCreate} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm">
                  Generar primera key
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {keys.map((k) => (
                  <div key={k.id} className={cn(
                    "glass-panel p-4 rounded-xl flex items-center justify-between gap-4 border",
                    k.revoked ? "border-rose-500/30 opacity-60" : "border-slate-700/50"
                  )}>
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={cn(
                        "w-10 h-10 rounded-lg border flex items-center justify-center shrink-0",
                        k.revoked ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400"
                      )}>
                        <Key className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-white truncate text-sm">{k.name}</h4>
                          {k.revoked && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded">
                              Revocada
                            </span>
                          )}
                          {k.scopes.map((s) => (
                            <span key={s} className="text-[10px] uppercase tracking-wider font-bold text-fuchsia-300 bg-fuchsia-500/10 border border-fuchsia-500/30 px-1.5 py-0.5 rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-mono truncate">{k.prefix}</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Creada: {formatDate(k.createdAt)} · Último uso: {formatDate(k.lastUsedAt)}
                          {k.expiresAt ? ` · Expira: ${formatDate(k.expiresAt)}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!k.revoked && (
                        <button
                          onClick={() => revoke(k.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors flex items-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" /> Revocar
                        </button>
                      )}
                      <button
                        onClick={() => remove(k.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {showForm && (
          <div className="glass-panel p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Nueva API Key</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre / Descripción</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Ej: n8n - sincronización candidatos"
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fuchsia-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Permisos (scopes)</label>
                <div className="grid gap-2">
                  {ALL_SCOPES.map((s) => {
                    const checked = draft.scopes.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                          checked ? "bg-fuchsia-500/10 border-fuchsia-500/30" : "bg-slate-900/40 border-slate-700/50 hover:border-slate-600"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleScope(s.id)}
                          className="mt-1 accent-fuchsia-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-white">{s.label} <span className="text-fuchsia-300 font-mono text-xs">({s.id})</span></div>
                          <div className="text-xs text-slate-400">{s.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Expira en (días) · opcional</label>
                <input
                  type="number"
                  min={1}
                  value={draft.expiresInDays}
                  onChange={(e) => setDraft((d) => ({ ...d, expiresInDays: e.target.value }))}
                  placeholder="Dejar vacío = sin expiración"
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fuchsia-500/50 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={submitting || !draft.name.trim() || draft.scopes.length === 0}
                className="bg-fuchsia-500 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-fuchsia-400 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Generar Key
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
