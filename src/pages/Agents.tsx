import { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Plus, BrainCircuit, Activity, Zap, MessageSquare, Briefcase, FileText, CheckCircle2, XCircle, Settings2, Code, Users, Download, Filter, Send, Trash2, Loader2, AlertCircle, Sparkles, X } from 'lucide-react';
import { MOCK_PREBUILT_TEMPLATES, AGENT_LOGS } from '@/data/mockData';
import { api, Agent, Provider } from '@/lib/api';

type ChatMessage = { role: 'user' | 'agent' | 'system'; text: string };

const ROLE_OPTIONS = [
  'Sourcing (Búsqueda Activa)',
  'Screening (Filtro de CVs)',
  'Scheduling (Gestión de Entrevistas)',
  'Onboarding (Asistente de Ingreso)',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'Product Manager',
  'UX/UI Designer',
  'DevOps Engineer',
];

const ALL_CHANNELS = ['Email', 'LinkedIn', 'WhatsApp', 'Plataforma ATS'];

const AVATAR_PALETTE = ['bg-cyan-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500', 'bg-indigo-500', 'bg-blue-500', 'bg-fuchsia-500'];

type DraftAgent = {
  id?: string;
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  channels: string[];
  providerId: string;
  avatarColor: string;
  status: string;
};

const EMPTY_DRAFT: DraftAgent = {
  name: '',
  role: 'Sourcing (Búsqueda Activa)',
  description: '',
  systemPrompt: '',
  channels: ['Email'],
  providerId: '',
  avatarColor: 'bg-cyan-500',
  status: 'Active',
};

export function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'agents' | 'templates' | 'memory'>('agents');
  const [editing, setEditing] = useState<DraftAgent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [activeChatAgent, setActiveChatAgent] = useState<Agent | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatPending, setChatPending] = useState(false);
  const [chatProvider, setChatProvider] = useState<{ label: string; model: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memory tab state
  const [selectedAgentForMemory, setSelectedAgentForMemory] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [conversationStats, setConversationStats] = useState<{ total_conversations: number; total_messages: number; unique_contacts: number } | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function refresh() {
    try {
      const [agentsList, providersData] = await Promise.all([api.listAgents(), api.listProviders()]);
      setAgents(agentsList);
      setProviders(providersData.providers);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Backend no disponible.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const defaultProvider = useMemo(() => providers.find((p) => p.isDefault) || providers[0], [providers]);

  function startCreate() {
    setEditError(null);
    setEditing({
      ...EMPTY_DRAFT,
      providerId: '',
      avatarColor: AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)],
    });
  }

  function startEdit(agent: Agent) {
    setEditError(null);
    setEditing({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      description: agent.description || '',
      systemPrompt: agent.systemPrompt || '',
      channels: agent.channels || [],
      providerId: agent.providerId || '',
      avatarColor: agent.avatarColor,
      status: agent.status,
    });
  }

  function toggleChannel(ch: string) {
    if (!editing) return;
    setEditing({
      ...editing,
      channels: editing.channels.includes(ch) ? editing.channels.filter((c) => c !== ch) : [...editing.channels, ch],
    });
  }

  async function submitDraft() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.role.trim()) {
      setEditError('Nombre y función son obligatorios.');
      return;
    }
    setSubmitting(true);
    setEditError(null);
    try {
      if (editing.id) {
        await api.updateAgent(editing.id, {
          name: editing.name,
          role: editing.role,
          description: editing.description,
          systemPrompt: editing.systemPrompt,
          channels: editing.channels,
          providerId: editing.providerId || null,
          status: editing.status,
        });
      } else {
        await api.createAgent({
          name: editing.name,
          role: editing.role,
          description: editing.description || undefined,
          systemPrompt: editing.systemPrompt || undefined,
          channels: editing.channels,
          providerId: editing.providerId || null,
          avatarColor: editing.avatarColor,
          status: editing.status,
        });
      }
      setEditing(null);
      await refresh();
    } catch (err: any) {
      setEditError(err?.message || 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(agent: Agent, e: React.MouseEvent) {
    e.stopPropagation();
    const newStatus = agent.status === 'Active' ? 'Draft' : 'Active';
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, status: newStatus } : a)));
    try {
      await api.updateAgent(agent.id, { status: newStatus });
    } catch (err: any) {
      alert(err?.message || 'No se pudo cambiar estado');
      refresh();
    }
  }

  async function confirmDelete() {
    if (!agentToDelete) return;
    try {
      await api.deleteAgent(agentToDelete.id);
      setAgentToDelete(null);
      await refresh();
    } catch (err: any) {
      alert(err?.message || 'No se pudo eliminar.');
    }
  }

  function openChat(agent: Agent) {
    setActiveChatAgent(agent);
    setChatProvider(null);
    setChatMessages([
      {
        role: 'system',
        text: `${agent.name} (${agent.role}). Modelo: ${
          providers.find((p) => p.id === agent.providerId)?.label || defaultProvider?.label || 'sin proveedor configurado'
        }`,
      },
    ]);
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChatAgent || !currentMessage.trim() || chatPending) return;
    const userText = currentMessage.trim();
    const newUserMsg: ChatMessage = { role: 'user', text: userText };
    const history = chatMessages.filter((m) => m.role !== 'system').slice(-6);
    setChatMessages((prev) => [...prev, newUserMsg]);
    setCurrentMessage('');
    setChatPending(true);
    try {
      const result = await api.chatWithAgent(activeChatAgent.id, userText, history.map((m) => ({ role: m.role, text: m.text })));
      setChatProvider({ label: result.providerLabel, model: result.model });
      setChatMessages((prev) => [...prev, { role: 'agent', text: result.reply || '(respuesta vacía)' }]);
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { role: 'agent', text: `⚠️ ${err?.message || 'Error en LLM'}` }]);
    } finally {
      setChatPending(false);
    }
  }

  const getIcon = (name: string) => {
    switch (name) {
      case 'Code':
        return <Code className="w-6 h-6 text-cyan-400" />;
      case 'Briefcase':
        return <Briefcase className="w-6 h-6 text-cyan-400" />;
      case 'Users':
        return <Users className="w-6 h-6 text-cyan-400" />;
      default:
        return <Bot className="w-6 h-6 text-cyan-400" />;
    }
  };

  async function loadConversations(agent: Agent) {
    setSelectedAgentForMemory(agent);
    setMemoryLoading(true);
    try {
      const [convRes, statsRes] = await Promise.all([
        api.getConversations(agent.id),
        api.getConversationStats(agent.id),
      ]);
      setConversations(convRes.conversations || []);
      setConversationStats(statsRes.stats);
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      setConversations([]);
      setConversationStats(null);
    } finally {
      setMemoryLoading(false);
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!conv.lastMessageAt) return true;
    const lastMessageDate = new Date(conv.lastMessageAt).toISOString().split('T')[0];
    if (startDate && lastMessageDate < startDate) return false;
    if (endDate && lastMessageDate > endDate) return false;
    return true;
  });

  function exportCSV() {
    const headers = ['Contact Phone', 'Contact Name', 'Messages Count', 'Last Message Date', 'Memory Summary'];
    const csv = [
      headers.join(','),
      ...filteredConversations.map((conv) => {
        const lastDate = conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString().split('T')[0] : '';
        return `"${conv.contactPhone}","${conv.contactName || ''}","${conv.totalMessages}","${lastDate}","${(conv.memorySummary || '').replace(/"/g, '""')}"`;
      }),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversations_${selectedAgentForMemory?.name || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-cyan-400" />
            Flota de Agentes AI
          </h1>
          <p className="text-slate-400 mt-1">Crea, edita y prueba agentes de reclutamiento autónomo con LLM real.</p>
        </div>

        <button
          onClick={startCreate}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
        >
          <Plus className="w-4 h-4" />
          Crear Nuevo Agente
        </button>
      </div>

      {loadError && (
        <div className="glass-panel p-3 rounded-xl flex items-center gap-2 text-amber-300 border border-amber-500/30 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Backend no disponible: {loadError}.</span>
        </div>
      )}

      {!loadError && providers.length === 0 && !loading && (
        <div className="glass-panel p-3 rounded-xl flex items-center gap-2 text-amber-300 border border-amber-500/30 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>
            No tienes proveedores de IA configurados. Los agentes existirán pero el chat fallará. Ve a <strong>Configuración → Proveedores IA</strong> para agregar uno.
          </span>
        </div>
      )}

      <div className="flex bg-slate-900/50 p-1 rounded-xl glass-panel w-fit border border-slate-700/50">
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'agents' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Mis Agentes
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'templates' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Plantillas
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'memory' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Activity className="w-4 h-4" />
          Actividad Reciente
        </button>
      </div>

      <div className="flex-1 pb-6">
        {activeTab === 'agents' && (
          <>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando agentes…
              </div>
            ) : agents.length === 0 ? (
              <div className="glass-panel p-8 rounded-xl text-center">
                <BrainCircuit className="w-10 h-10 text-cyan-400/50 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-1">No tienes agentes</h3>
                <p className="text-sm text-slate-400 mb-4">Crea tu primer agente para empezar.</p>
                <button onClick={startCreate} className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm">
                  Crear primer agente
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => {
                  const provider = providers.find((p) => p.id === agent.providerId);
                  return (
                    <div
                      key={agent.id}
                      onClick={() => openChat(agent)}
                      className="glass-panel p-6 rounded-2xl flex flex-col border border-slate-700/50 hover:border-cyan-500/30 hover:shadow-[0_8px_30px_rgba(34,211,238,0.05)] transition-all hover:-translate-y-1 group cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${agent.avatarColor} shadow-lg`}>
                            <Bot className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white tracking-tight">{agent.name}</h3>
                            <span className="text-xs text-slate-400">{agent.role}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className={`text-xs font-semibold ${agent.status === 'Active' ? 'text-emerald-400' : 'text-slate-500'}`}>{agent.status === 'Active' ? 'Activo' : 'Borrador'}</span>
                          <button
                            type="button"
                            onClick={(e) => toggleStatus(agent, e)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                              agent.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-700'
                            }`}
                            role="switch"
                            aria-checked={agent.status === 'Active'}
                          >
                            <span className="sr-only">Toggle agent status</span>
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${agent.status === 'Active' ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-slate-300 mb-4 leading-relaxed flex-1">{agent.description || <span className="italic text-slate-500">Sin descripción.</span>}</p>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-slate-400">
                            {provider ? (
                              <>
                                <span className="text-amber-300 font-medium">{provider.label}</span> · <span className="font-mono text-slate-500">{provider.model}</span>
                              </>
                            ) : defaultProvider ? (
                              <>
                                Default: <span className="text-amber-300/80">{defaultProvider.label}</span>
                              </>
                            ) : (
                              <span className="text-rose-400">Sin proveedor</span>
                            )}
                          </span>
                        </div>

                        {agent.channels.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1.5 uppercase font-medium tracking-wider">Canales</p>
                            <div className="flex flex-wrap gap-2">
                              {agent.channels.map((ch) => (
                                <span key={ch} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-white/5">
                                  {ch}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 border-t border-slate-700/50 pt-3">
                          <div>
                            <p className="text-xs text-slate-500">Memoria</p>
                            <p className="text-sm font-semibold text-slate-200">{agent.memory}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Chats</p>
                            <p className="text-sm font-semibold text-slate-200">{agent.conversations}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Éxito</p>
                            <p className="text-sm font-semibold text-cyan-400">{agent.successRate}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2 border-t border-slate-700/50 pt-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openChat(agent)}
                          className="flex-1 py-1.5 text-sm font-medium text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" /> Chatear
                        </button>
                        <button
                          onClick={() => startEdit(agent)}
                          className="py-1.5 px-3 text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 border border-slate-700 hover:bg-white/5 rounded-lg"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAgentToDelete(agent)}
                          className="py-1.5 px-3 text-sm font-medium text-slate-400 hover:text-rose-400 transition-colors flex items-center justify-center gap-2 border border-slate-700 hover:bg-rose-500/10 hover:border-rose-500/30 rounded-lg"
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

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_PREBUILT_TEMPLATES.map((tpl) => (
              <div key={tpl.id} className="relative glass-panel p-6 rounded-2xl border border-slate-700/50 flex flex-col group overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">{getIcon(tpl.icon)}</div>
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center mb-4">{getIcon(tpl.icon)}</div>
                <h3 className="font-semibold text-white mb-2">{tpl.name}</h3>
                <p className="text-sm text-slate-400 mb-6 flex-1">{tpl.description}</p>
                <button
                  onClick={() => {
                    startCreate();
                    setEditing((d) =>
                      d
                        ? {
                            ...d,
                            name: tpl.name,
                            description: tpl.description,
                            systemPrompt: `Actúa como ${tpl.name}. ${tpl.description}`,
                          }
                        : d
                    );
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-cyan-500 text-slate-200 hover:text-slate-900 rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2 border border-slate-700 hover:border-transparent"
                >
                  <Plus className="w-4 h-4" /> Usar Plantilla
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="glass-panel border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900/80 p-4 border-b border-slate-700/50 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                  <Activity className="w-4 h-4 text-cyan-400" /> Historial de Conversaciones
                </h3>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs text-slate-400">Sistema Conectado</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 block mb-2">Seleccionar Agente</label>
                  <select
                    value={selectedAgentForMemory?.id || ''}
                    onChange={(e) => {
                      const agent = agents.find((a) => a.id === e.target.value);
                      if (agent) loadConversations(agent);
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Elige un agente --</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-xs">
                  <Filter className="w-3 h-3 text-cyan-400" />
                  <span className="text-slate-400">Desde:</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-slate-300 outline-none w-24 [color-scheme:dark]" />
                  <span className="text-slate-500">-</span>
                  <span className="text-slate-400">Hasta:</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-slate-300 outline-none w-24 [color-scheme:dark]" />
                  {(startDate || endDate) && (
                    <button onClick={() => { setStartDate(''); setEndDate(''); }} className="ml-1 text-slate-400 hover:text-rose-400 transition-colors" title="Limpiar filtro">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {selectedAgentForMemory && (
                  <button onClick={exportCSV} disabled={filteredConversations.length === 0} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-2 whitespace-nowrap">
                    <Download className="w-4 h-4" /> Exportar CSV
                  </button>
                )}
              </div>
            </div>

            {selectedAgentForMemory && (
              <div className="flex-1 overflow-y-auto">
                {memoryLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Cargando conversaciones...</p>
                  </div>
                ) : conversationStats ? (
                  <>
                    {/* Statistics */}
                    <div className="bg-black/30 p-4 border-b border-slate-700/50 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Conversaciones</p>
                        <p className="text-xl font-semibold text-cyan-400">{conversationStats.total_conversations}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Mensajes Total</p>
                        <p className="text-xl font-semibold text-cyan-400">{conversationStats.total_messages}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Contactos Únicos</p>
                        <p className="text-xl font-semibold text-cyan-400">{conversationStats.unique_contacts}</p>
                      </div>
                    </div>

                    {/* Conversations List */}
                    <div className="p-4 space-y-3">
                      {filteredConversations.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">No hay conversaciones para este agente</p>
                        </div>
                      ) : (
                        filteredConversations.map((conv) => (
                          <div key={conv.id} className="border border-slate-700/50 rounded-lg overflow-hidden bg-slate-900/50 hover:bg-slate-900/80 transition-colors">
                            <button
                              onClick={() => setExpandedConversation(expandedConversation === conv.id ? null : conv.id)}
                              className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-slate-800/30"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                                  <p className="font-semibold text-slate-200 truncate">{conv.contactName || conv.contactPhone}</p>
                                </div>
                                <p className="text-xs text-slate-500">{conv.contactPhone} • {conv.totalMessages} mensajes</p>
                              </div>
                              <div className="flex flex-col items-end shrink-0">
                                <span className="text-xs text-slate-500">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : '—'}</span>
                              </div>
                            </button>

                            {expandedConversation === conv.id && conv.memorySummary && (
                              <div className="bg-slate-800/50 border-t border-slate-700/50 p-4">
                                <p className="text-xs text-slate-400 uppercase font-semibold mb-2 flex items-center gap-2">
                                  <BrainCircuit className="w-3 h-3 text-amber-400" />
                                  Resumen de Memoria
                                </p>
                                <p className="text-sm text-slate-300 leading-relaxed">{conv.memorySummary}</p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <AlertCircle className="w-8 h-8 text-amber-500/50 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No hay datos de conversaciones</p>
                  </div>
                )}
              </div>
            )}

            {!selectedAgentForMemory && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <BrainCircuit className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Selecciona un agente para ver su historial de conversaciones</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Agente */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-xl relative flex flex-col glass-panel shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEditing(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-6">{editing.id ? 'Editar Agente' : 'Crear Agente Personalizado'}</h2>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-slate-300 mb-2 block">
                  Nombre <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all font-medium"
                  placeholder="Ej: Reclutador de React"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-2 block">
                  Función Principal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="agent-roles"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all"
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  placeholder="Escribe o selecciona un rol..."
                />
                <datalist id="agent-roles">
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-2 block">Descripción breve</label>
                <input
                  type="text"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 transition-all text-sm"
                  placeholder="Una línea explicando qué hace este agente"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-slate-300 block mb-1">System Prompt (instrucciones al modelo)</label>
                <p className="text-xs text-slate-500 mb-2">Es el rol y tono que el LLM adoptará. Sé específico.</p>
                <textarea
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-y font-mono text-sm leading-relaxed h-32"
                  placeholder="Eres un reclutador tech amigable pero directo. Tu objetivo es encontrar desarrolladores frontend con React. Pregunta por experiencia, stack y disponibilidad."
                  value={editing.systemPrompt}
                  onChange={(e) => setEditing({ ...editing, systemPrompt: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-2 block flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Proveedor de IA
                </label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all appearance-none"
                  value={editing.providerId}
                  onChange={(e) => setEditing({ ...editing, providerId: e.target.value })}
                >
                  <option value="">Usar default ({defaultProvider?.label || 'sin configurar'})</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.model}){p.isDefault ? ' · default' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Si no se elige, el agente usa el proveedor por defecto.</p>
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-2 block">Canales de Acción</label>
                <div className="flex gap-2 flex-wrap">
                  {ALL_CHANNELS.map((ch) => {
                    const checked = editing.channels.includes(ch);
                    return (
                      <label key={ch} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border ${checked ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'}`}>
                        <input type="checkbox" className="rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500" checked={checked} onChange={() => toggleChannel(ch)} />
                        <span className="text-sm">{ch}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {!editing.id && (
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Color del avatar</label>
                  <div className="flex gap-2 flex-wrap">
                    {AVATAR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditing({ ...editing, avatarColor: c })}
                        className={`w-8 h-8 rounded-lg ${c} border-2 transition-all ${editing.avatarColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {editError && (
                <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-700/50">
              <button onClick={() => setEditing(null)} className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button
                onClick={submitDraft}
                disabled={!editing.name.trim() || !editing.role.trim() || submitting}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" fill="currentColor" />}
                {editing.id ? 'Guardar Cambios' : 'Desplegar Agente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {agentToDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-2xl w-full max-w-sm relative glass-panel shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">¿Eliminar agente?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Estás a punto de eliminar <strong className="text-white">{agentToDelete.name}</strong>. Las cuentas de WhatsApp asignadas perderán este agente.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setAgentToDelete(null)} className="px-4 py-2 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDelete} className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chat Real */}
      {activeChatAgent && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl h-[600px] max-h-[90vh] relative flex flex-col glass-panel shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${activeChatAgent.avatarColor} shadow-lg`}>
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white tracking-tight">{activeChatAgent.name}</h3>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    {activeChatAgent.role}
                    {chatProvider && (
                      <>
                        <span className="text-slate-600">·</span>
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span className="text-amber-300">{chatProvider.label}</span>
                        <span className="font-mono text-slate-500">{chatProvider.model}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
              <button onClick={() => setActiveChatAgent(null)} className="text-slate-400 hover:text-white p-2 transition-colors" title="Cerrar chat">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 styled-scrollbar">
              {chatMessages.map((msg, idx) => {
                if (msg.role === 'system') {
                  return (
                    <div key={idx} className="flex justify-center">
                      <div className="text-[11px] text-slate-500 bg-slate-800/40 border border-slate-700/30 rounded-full px-3 py-1">{msg.text}</div>
                    </div>
                  );
                }
                return (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>{msg.text}</div>
                  </div>
                );
              })}
              {chatPending && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Pensando…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
              <form onSubmit={sendChat} className="flex gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Escribe un mensaje al agente..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  disabled={chatPending}
                />
                <button
                  type="submit"
                  disabled={!currentMessage.trim() || chatPending}
                  className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 p-2.5 rounded-xl transition-colors flex items-center justify-center"
                >
                  {chatPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
