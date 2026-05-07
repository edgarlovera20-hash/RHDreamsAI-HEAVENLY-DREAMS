import { useEffect, useState } from "react";
import { Fingerprint, Plus, Trash2, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, Passkey } from "@/lib/api";
import { isPasskeySupported, isPlatformAuthenticatorAvailable, registerPasskey } from "@/lib/passkeys";

function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

export function PasskeysPanel() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [nickname, setNickname] = useState('');

  async function refresh() {
    try {
      const data = await api.listPasskeys();
      setPasskeys(data.passkeys || []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSupported(isPasskeySupported());
    isPlatformAuthenticatorAvailable().then(setBiometric);
    refresh();
  }, []);

  async function add() {
    setAdding(true);
    setError(null);
    try {
      await registerPasskey(nickname.trim() || undefined);
      setNickname('');
      setShowForm(false);
      await refresh();
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (/NotAllowedError|aborted/i.test(msg)) {
        setError('Cancelaste el registro de huella.');
      } else if (/InvalidStateError/i.test(msg)) {
        setError('Esta huella ya está registrada en tu cuenta.');
      } else {
        setError(msg);
      }
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta huella? Tendrás que volver a registrarla para usarla en otro inicio de sesión.')) return;
    try {
      await api.deletePasskey(id);
      await refresh();
    } catch (e: any) {
      alert(e?.message || 'No se pudo eliminar.');
    }
  }

  return (
    <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-blue-400 animate-pulse-soft" />
          <h3 className="font-medium text-sm text-slate-200">Inicio con huella digital</h3>
        </div>
        {!showForm && supported && (
          <button
            onClick={() => setShowForm(true)}
            className="cta flex items-center gap-2 bg-blue-500/20 border border-blue-500/40 hover:bg-blue-500/30 text-blue-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar huella
          </button>
        )}
      </div>

      <div className="p-5">
        {!supported && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-200 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Tu navegador no soporta WebAuthn</div>
              <div className="text-xs text-amber-300/80 mt-1">
                Usa Chrome, Edge, Safari o Firefox modernos. En Windows Hello, macOS, iOS y Android,
                la huella digital se ofrecerá automáticamente.
              </div>
            </div>
          </div>
        )}

        {supported && !biometric && (
          <div className="mb-4 bg-slate-900/40 border border-white/10 rounded-lg p-3 text-slate-300 text-xs">
            Tu dispositivo no detecta un autenticador biométrico (huella / Face ID / Windows Hello).
            Aún puedes usar una llave de seguridad USB o NFC.
          </div>
        )}

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-300 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {showForm && (
          <div className="mb-4 glass-panel p-4 rounded-xl border border-blue-500/20">
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Vas a registrar este dispositivo. El navegador te pedirá usar la huella, Face ID,
              PIN o llave de seguridad. Una vez registrada, podrás iniciar sesión sin escribir tu contraseña.
            </p>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre (opcional)</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej: Mi laptop del trabajo"
              className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowForm(false); setNickname(''); setError(null); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={add}
                disabled={adding}
                className="cta bg-blue-500 hover:bg-blue-400 text-slate-900 font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                Registrar este dispositivo
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-sm text-slate-400 py-2">
            Aún no tienes huellas registradas. {supported && 'Agrega una para iniciar sesión sin contraseña.'}
          </div>
        ) : (
          <div className="grid gap-2">
            {passkeys.map((k) => (
              <div
                key={k.id}
                className={cn(
                  "glass-panel-hover flex items-center gap-3 p-3 rounded-lg border border-white/5"
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {k.nickname || 'Dispositivo sin nombre'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Creada: {formatDate(k.createdAt)} · Último uso: {formatDate(k.lastUsedAt)}
                  </div>
                </div>
                <button
                  onClick={() => remove(k.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Eliminar huella"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
