import { useEffect, useMemo, useState } from "react";
import { Search, Smartphone, Zap, QrCode, Trash2, CheckCircle2, RotateCcw, X, SmartphoneNfc, MessageSquare, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, Account, Agent } from "@/lib/api";
import { Stepper, StepperStep } from "@/components/Stepper";

type ModalStep = 'info' | 'qr' | 'success' | 'error';

const LINK_STEPS: StepperStep[] = [
  { id: 'info', label: 'Datos', description: 'Nombre y agente' },
  { id: 'qr', label: 'Escanear', description: 'Código QR' },
  { id: 'success', label: 'Conectado', description: 'Listo' },
];

function modalStepIndex(step: ModalStep): number {
  if (step === 'info') return 0;
  if (step === 'qr') return 1;
  if (step === 'success') return 2;
  return 1; // error → highlight QR step as errored
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Inicializando',
  initializing: 'Inicializando',
  qr: 'Esperando QR',
  authenticating: 'Autenticando',
  connected: 'Conectado',
  disconnected: 'Desconectado',
  error: 'Error',
};

function relativeTime(ts: number | null) {
  if (!ts) return 'Nunca';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Hace segundos';
  if (diff < 3_600_000) return `Hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Hace ${Math.floor(diff / 3_600_000)} h`;
  return `Hace ${Math.floor(diff / 86_400_000)} d`;
}

export function WhatsAppAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [maxActive, setMaxActive] = useState(3);
  const [activeCount, setActiveCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchFilter, setSearchFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('info');
  const [creatingAccountId, setCreatingAccountId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newAccountName, setNewAccountName] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');

  const [accountToUnlink, setAccountToUnlink] = useState<Account | null>(null);
  const [accountToAutomate, setAccountToAutomate] = useState<Account | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [followUpMessage, setFollowUpMessage] = useState('');

  async function refresh() {
    try {
      const data = await api.listAccounts();
      setAccounts(data.accounts);
      setMaxActive(data.max);
      setActiveCount(data.active);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'No se pudo conectar con el backend.');
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [agentsList] = await Promise.all([api.listAgents(), refresh()]);
        if (!alive) return;
        setAgents(agentsList);
      } catch (err: any) {
        if (alive) setLoadError(err?.message || 'No se pudo conectar.');
      }
    })();
    const t = setInterval(refresh, 10_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Stream the QR + status while creating a new account.
  useEffect(() => {
    if (!creatingAccountId) return;
    const close = api.streamAccount(creatingAccountId, (data) => {
      setQrDataUrl(data.qr);
      if (data.status === 'qr') setModalStep('qr');
      if (data.status === 'authenticating') setModalStep('qr');
      if (data.status === 'connected') {
        setModalStep('success');
        refresh();
        setTimeout(() => {
          resetModal();
        }, 1800);
      }
      if (data.status === 'error' || data.status === 'disconnected') {
        if (data.error) {
          setLinkError(data.error);
          setModalStep('error');
        }
      }
    });
    return close;
  }, [creatingAccountId]);

  const filteredAccounts = useMemo(
    () =>
      accounts.filter(
        (acc) =>
          acc.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          (acc.phone || '').includes(searchFilter)
      ),
    [accounts, searchFilter]
  );

  const atCapacity = activeCount >= maxActive;

  function resetModal() {
    setIsModalOpen(false);
    setModalStep('info');
    setNewAccountName('');
    setSelectedAgent('');
    setCreatingAccountId(null);
    setQrDataUrl(null);
    setLinkError(null);
    setSubmitting(false);
  }

  async function startLinking() {
    if (!newAccountName) return;
    setSubmitting(true);
    setLinkError(null);
    try {
      const account = await api.createAccount({
        name: newAccountName,
        agentId: selectedAgent || null,
      });
      setCreatingAccountId(account.id);
      setModalStep('qr');
      await refresh();
    } catch (err: any) {
      setLinkError(err?.message || 'No se pudo iniciar la sesión.');
      setModalStep('error');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeAccount() {
    if (!accountToUnlink) return;
    try {
      await api.deleteAccount(accountToUnlink.id);
      setAccountToUnlink(null);
      await refresh();
    } catch (err: any) {
      alert(err?.message || 'No se pudo desvincular.');
    }
  }

  async function assignAgent(accountId: string, agentId: string) {
    try {
      await api.updateAccount(accountId, { agentId: agentId || null });
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, agentId: agentId || null } : a)));
    } catch (err: any) {
      alert(err?.message || 'No se pudo asignar el agente.');
    }
  }

  function openAutomationConfig(account: Account) {
    setAccountToAutomate(account);
    setWelcomeMessage(account.welcomeMessage || '');
    setFollowUpMessage(account.followUpMessage || '');
  }

  async function saveAutomationConfig() {
    if (!accountToAutomate) return;
    try {
      await api.updateAccount(accountToAutomate.id, { welcomeMessage, followUpMessage });
      setAccountToAutomate(null);
      await refresh();
    } catch (err: any) {
      alert(err?.message || 'No se pudo guardar.');
    }
  }

  function statusOf(account: Account): { kind: 'connected' | 'pending' | 'error'; label: string } {
    const live = account.liveStatus || account.status;
    if (live === 'connected') return { kind: 'connected', label: 'Conectado' };
    if (live === 'error') return { kind: 'error', label: STATUS_LABEL[live] };
    if (live === 'disconnected') return { kind: 'error', label: 'Desconectado' };
    return { kind: 'pending', label: STATUS_LABEL[live] || 'Pendiente' };
  }

  return (
    <div className="page-enter flex flex-col gap-6 h-full pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div style={{ fontFamily: 'Georgia' }}>
          <h1 className="text-2xl font-semibold tracking-tight text-white mt-2">Cuentas de WhatsApp</h1>
          <p className="text-slate-400">Escanea códigos QR para enlazar hasta {maxActive} cuentas y asígnalas a tus Agentes AI.</p>
          <p className="text-xs text-slate-500 mt-1">{activeCount} / {maxActive} cuentas activas</p>
        </div>
        <button
          onClick={() => {
            if (atCapacity) return;
            resetModal();
            setIsModalOpen(true);
          }}
          disabled={atCapacity}
          className="bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600/40 text-emerald-50 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <QrCode className="w-4 h-4" />
          Enlazar Nueva Cuenta
        </button>
      </div>

      {loadError && (
        <div className="glass-panel p-3 rounded-xl flex items-center gap-2 text-amber-300 border border-amber-500/30 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Backend no disponible: {loadError}. Verifica que <code className="font-mono">npm run dev:server</code> esté corriendo.</span>
        </div>
      )}

      <div className="glass-panel p-2 rounded-xl flex items-center gap-2 max-w-sm">
        <Search className="w-4 h-4 ml-2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar cuenta..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full bg-transparent border-none outline-none focus:ring-0 text-white text-sm placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAccounts.map((account) => {
          const s = statusOf(account);
          return (
            <div key={account.id} className="glass-panel rounded-2xl flex flex-col p-6 border border-slate-700/50 hover:border-emerald-500/30 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      s.kind === 'connected' && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50",
                      s.kind === 'pending' && "bg-amber-500/20 text-amber-400 border border-amber-500/50",
                      s.kind === 'error' && "bg-rose-500/20 text-rose-400 border border-rose-500/50",
                    )}
                  >
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg tracking-tight group-hover:text-emerald-400 transition-colors">{account.name}</h3>
                    <p className="text-slate-400 text-sm font-mono">{account.phone || '—'}</p>
                  </div>
                </div>
                <div
                  className={cn(
                    "px-2 py-1 flex items-center gap-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold",
                    s.kind === 'connected' && "bg-emerald-500/20 text-emerald-400",
                    s.kind === 'pending' && "bg-amber-500/20 text-amber-400",
                    s.kind === 'error' && "bg-rose-500/20 text-rose-400",
                  )}
                >
                  {s.kind === 'connected' ? <CheckCircle2 className="w-3 h-3" /> : s.kind === 'pending' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                  {s.label}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Agente Asignado
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-8 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-colors appearance-none"
                      value={account.agentId || ''}
                      onChange={(e) => assignAgent(account.id, e.target.value)}
                    >
                      <option value="">-- Sin asignar --</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.role})
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-500">Última sincr: {relativeTime(account.lastSync)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openAutomationConfig(account)}
                      className="text-slate-500 hover:text-blue-400 p-1.5 rounded-md hover:bg-blue-500/10 transition-colors"
                      title="Configurar Mensajes Automáticos"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAccountToUnlink(account)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-500/10 transition-colors"
                      title="Desvincular cuenta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filteredAccounts.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500">
            <Smartphone className="w-12 h-12 mb-4 opacity-50" />
            <p>No se encontraron cuentas vinculadas.</p>
          </div>
        )}
      </div>

      {/* Link Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-md relative flex flex-col glass-panel shadow-2xl">
            <button onClick={resetModal} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 mt-2">
              <Stepper
                steps={LINK_STEPS}
                current={modalStepIndex(modalStep)}
                errorIndex={modalStep === 'error' ? 1 : undefined}
              />
            </div>

            {modalStep === 'info' && (
              <>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500 mb-6 flex items-center gap-2">
                  <SmartphoneNfc className="w-6 h-6 text-emerald-400" />
                  Vincular WhatsApp
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Nombre Identificador</label>
                    <input
                      type="text"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      placeholder="Ej: Linea Reclutamiento Monterrey"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block flex items-center gap-1">
                      <Zap className="w-4 h-4 text-blue-400" />
                      Vincular con Agente AI
                    </label>
                    <div className="relative">
                      <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none"
                      >
                        <option value="">Sin asignar</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} - {agent.role}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 font-light">El agente responderá automáticamente los mensajes de esta cuenta.</p>
                  </div>

                  {linkError && (
                    <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{linkError}</span>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-700/50">
                  <button onClick={resetModal} className="px-5 py-2 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors">
                    Cancelar
                  </button>
                  <button
                    onClick={startLinking}
                    disabled={!newAccountName || submitting}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-6 py-2 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Generar Código QR
                  </button>
                </div>
              </>
            )}

            {modalStep === 'qr' && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Escanea el código QR</h3>
                <p className="text-sm text-slate-400 mb-8 max-w-[280px]">Abre WhatsApp en tu teléfono → Dispositivos vinculados → Vincular un dispositivo, y escanea este código.</p>

                <div className="bg-white p-4 rounded-2xl mb-8 relative w-[220px] h-[220px] flex items-center justify-center">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR" className="w-48 h-48" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <Loader2 className="w-10 h-10 animate-spin" />
                      <span className="text-xs">Generando código…</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-emerald-400 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  Esperando conexión...
                </div>
              </div>
            )}

            {modalStep === 'success' && (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">¡Cuenta Vinculada!</h3>
                <p className="text-slate-400">La cuenta fue conectada exitosamente.</p>
              </div>
            )}

            {modalStep === 'error' && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle className="w-10 h-10 text-rose-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Error al vincular</h3>
                <p className="text-slate-400 text-sm mb-6 max-w-sm">{linkError || 'Algo falló durante la vinculación.'}</p>
                <button onClick={resetModal} className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm">
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unlink Confirmation Modal */}
      {accountToUnlink && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-2xl w-full max-w-sm relative glass-panel shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">¿Desvincular cuenta?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Estás a punto de desvincular la cuenta <strong className="text-white">{accountToUnlink.name}</strong>. El Agente AI ya no podrá responder mensajes en esta línea.
              <br />
              <br />
              ¿Estás seguro de continuar?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setAccountToUnlink(null)} className="px-4 py-2 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button onClick={removeAccount} className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                Sí, Desvincular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automations Config Modal */}
      {accountToAutomate && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-lg relative glass-panel shadow-2xl flex flex-col">
            <button onClick={() => setAccountToAutomate(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              Mensajería Automática
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Configura automatizaciones para <span className="font-semibold text-emerald-400">{accountToAutomate.name}</span>.
            </p>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-white font-medium mb-1 flex items-center gap-1.5">Mensaje de Bienvenida</label>
                <p className="text-xs text-slate-500 mb-2">Se envía a nuevos contactos.</p>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none h-24 font-mono"
                  placeholder="Escribe el mensaje de bienvenida..."
                />
              </div>

              <div>
                <label className="text-sm text-white font-medium mb-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Seguimiento Automático
                </label>
                <p className="text-xs text-slate-500 mb-2">Para candidatos que no responden en 48h.</p>
                <textarea
                  value={followUpMessage}
                  onChange={(e) => setFollowUpMessage(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none h-24 font-mono"
                  placeholder="Escribe el mensaje de seguimiento..."
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-700/50">
              <button onClick={() => setAccountToAutomate(null)} className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button onClick={saveAutomationConfig} className="bg-blue-500 hover:bg-blue-600 text-slate-900 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(96,165,250,0.2)]">
                Guardar Plantillas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
