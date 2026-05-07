import { useEffect, useState } from "react";
import { Plus, Trash2, X, MessageSquare, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export function MetaProvidersPanel() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [draft, setDraft] = useState({
    businessAccountId: '',
    accessToken: '',
    webhookToken: '',
  });

  async function refresh() {
    try {
      const data = await api.listMetaProviders();
      setProviders(data.providers || []);
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
      businessAccountId: '',
      accessToken: '',
      webhookToken: '',
    });
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
  }

  async function submit() {
    setSubmitting(true);
    try {
      await api.createMetaProvider({
        businessAccountId: draft.businessAccountId,
        accessToken: draft.accessToken,
        webhookToken: draft.webhookToken,
      });
      await refresh();
      setShowForm(false);
    } catch (e: any) {
      alert(e?.message || 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta configuración de Meta WhatsApp? Los canales activos se desconectarán.')) return;
    try {
      await api.deleteMetaProvider(id);
      await refresh();
    } catch (e: any) {
      alert(e?.message || 'No se pudo eliminar.');
    }
  }

  return (
    <div>
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            Meta WhatsApp Business API
          </h2>
          <p className="text-sm text-slate-400 font-light">Configura cuentas de Meta para WhatsApp Business. Necesitas Business Account ID, Access Token y Webhook Token.</p>
        </div>
        {!showForm && (
          <button
            onClick={startCreate}
            className="bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-200 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Agregar Cuenta
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="glass-panel p-3 rounded-xl flex items-center gap-2 text-amber-300 border border-amber-500/30 text-sm mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}. Verifica que el backend esté corriendo.</span>
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
                <MessageSquare className="w-10 h-10 text-emerald-400/50 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-1">Aún no tienes cuentas de Meta WhatsApp configuradas</h3>
                <p className="text-sm text-slate-400 mb-4">Agrega una cuenta de Meta WhatsApp Business para habilitar canales de WhatsApp con tus agentes.</p>
                <button onClick={startCreate} className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm">
                  Agregar primera cuenta
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {providers.map((p: any) => (
                  <div key={p.id} className="glass-panel p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-white truncate text-sm">Business Account: {p.businessAccountId}</h4>
                        <div className="text-xs text-slate-400 mt-1">
                          <div className="truncate">Access Token: {p.accessToken?.slice(0, 15)}...{p.accessToken?.slice(-10)}</div>
                          <div className="truncate">Webhook Token: {p.webhookToken?.slice(0, 15)}...{p.webhookToken?.slice(-10)}</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => remove(p.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {showForm && (
          <div className="glass-panel p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Nueva Cuenta Meta WhatsApp</h3>
              <button onClick={cancel} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Business Account ID</label>
                <input
                  type="text"
                  value={draft.businessAccountId}
                  onChange={(e) => setDraft((d) => ({ ...d, businessAccountId: e.target.value }))}
                  placeholder="Ej: 123456789012345"
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">Tu Business Account ID de Meta. Puedes encontrarlo en tu Business Manager.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Access Token</label>
                <input
                  type="password"
                  value={draft.accessToken}
                  onChange={(e) => setDraft((d) => ({ ...d, accessToken: e.target.value }))}
                  placeholder="EAAxxxx..."
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                />
                <p className="text-[11px] text-slate-500 mt-1">Token de acceso de larga duración para tu aplicación Meta. Disponible en tu App Dashboard.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Webhook Token (Verify Token)</label>
                <input
                  type="password"
                  value={draft.webhookToken}
                  onChange={(e) => setDraft((d) => ({ ...d, webhookToken: e.target.value }))}
                  placeholder="token_seguro_para_webhook"
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                />
                <p className="text-[11px] text-slate-500 mt-1">Token que usarás para verificar webhooks desde Meta. Puede ser cualquier string seguro que definas.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={cancel} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={submitting || !draft.businessAccountId || !draft.accessToken || !draft.webhookToken}
                className="bg-emerald-500 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-400 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar Configuración
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
