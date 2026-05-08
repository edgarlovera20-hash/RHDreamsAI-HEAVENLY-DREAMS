import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Settings2, 
  Database, 
  Brain, 
  MessageSquare, 
  Wand2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Activity,
  Cpu,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Button, Card, Avatar, CyberIcon } from './UI';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { MatrixText } from './ui/matrix-text';

interface AgentProtocol {
  id: string;
  name: string;
  personality: string;
  instructions: string;
  dbSource: 'all' | 'delinquent' | 'new_clients' | 'recruitment';
  welcomeMessage: string;
  tools: string[];
  isActive: boolean;
  updatedAt: any;
}

interface ProtocolConfigViewProps {
  userId: string;
}

const AVAILABLE_TOOLS = [
  { id: 'createCRMClient', label: 'Crear Cliente CRM' },
  { id: 'createWorkflow', label: 'Crear Flujo de Trabajo' },
  { id: 'sendToCentral', label: 'Enviar a Central' },
  { id: 'scheduleMeeting', label: 'Agendar Reunión' },
  { id: 'sendSlackNotification', label: 'Notificar Slack' },
  { id: 'deleteCRMClient', label: 'Borrar Cliente' },
];

export function ProtocolConfigView({ userId }: ProtocolConfigViewProps) {
  const [protocols, setProtocols] = useState<AgentProtocol[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<AgentProtocol | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users', userId, 'protocols'));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AgentProtocol));
      
      // Auto-update active protocol if it has the old message
      const activeProtocols = data.filter(p => p.isActive && p.welcomeMessage === 'Unidad Neural activa. ¿Qué directrices desea ejecutar?');
      activeProtocols.forEach(p => {
        updateDoc(doc(db, 'users', userId, 'protocols', p.id), {
          welcomeMessage: '¡Hola! Soy tu asistente de IA. Estoy aquí para optimizar tus procesos, reducir tiempos de respuesta al instante y asegurar que no pierdas ninguna oportunidad. ¿En qué te puedo ayudar hoy?'
        }).catch(console.error);
      });

      setProtocols(data);
      setIsLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/protocols`));
  }, [userId]);

  const handleCreateNew = async () => {
    try {
      const newProtocol = {
        name: 'Protocolo Neural v' + (protocols.length + 1),
        personality: 'Eres un asistente ejecutivo de alto nivel...',
        instructions: 'Prioriza la eficiencia y la seguridad...',
        dbSource: 'all',
        welcomeMessage: '¡Hola! Soy tu asistente de IA. Estoy aquí para optimizar tus procesos, reducir tiempos de respuesta al instante y asegurar que no pierdas ninguna oportunidad. ¿En qué te puedo ayudar hoy?',
        tools: ['createCRMClient', 'sendToCentral'],
        isActive: false,
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'users', userId, 'protocols'), newProtocol);
      setSelectedProtocol({ id: docRef.id, ...newProtocol } as any);
      setIsEditing(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE);
    }
  };

  const handleSave = async () => {
    if (!selectedProtocol) return;
    try {
      const { id, ...data } = selectedProtocol;
      await updateDoc(doc(db, 'users', userId, 'protocols', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que desea eliminar este protocolo racional?")) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'protocols', id));
      if (selectedProtocol?.id === id) setSelectedProtocol(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE);
    }
  };

  const handleToggleActive = async (protocol: AgentProtocol) => {
    try {
      // Deactivate all others logic
      for (const p of protocols) {
        if (p.isActive && p.id !== protocol.id) {
          await updateDoc(doc(db, 'users', userId, 'protocols', p.id), { isActive: false });
        }
      }
      await updateDoc(doc(db, 'users', userId, 'protocols', protocol.id), { isActive: !protocol.isActive });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE);
    }
  };

  if (isLoading) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-tema-negro/40 backdrop-blur-xl">
      <Cpu size={64} className="text-tema-neon animate-pulse" />
      <div className="text-sm text-tema-neon font-bold tracking-widest uppercase">Iniciando Núcleos Neurales...</div>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-8 md:p-10 gap-8 overflow-hidden relative bg-tema-negro/40 backdrop-blur-xl">
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <CyberIcon color="var(--tema-neon)" size="lg"><Settings2 size={24} /></CyberIcon>
            <h2 className="text-2xl md:text-3xl font-bold text-tema-texto tracking-tight uppercase whitespace-nowrap leading-none">
              GESTIÓN DE PROTOCOLOS IA
            </h2>
          </div>
          <p className="text-xs text-tema-neon font-bold tracking-widest mt-2 uppercase opacity-60 ml-16">Configuración de Identidad y Accesos Neurales</p>
        </div>
        <Button onClick={handleCreateNew} className="gap-3 py-3 px-6 text-xs font-bold uppercase tracking-widest shadow-[0_0_30px_rgba(3,154,220,0.2)]">
          <Plus size={18} /> NUEVO PROTOCOLO
        </Button>
      </div>

      <div className="flex-1 flex gap-8 min-h-0 relative z-10">
        {/* Protocol List */}
        <div className="w-[350px] flex flex-col gap-5 overflow-y-auto ocultar-barra-desplazamiento pr-2">
          {protocols.map(p => (
            <div 
              key={p.id}
              onClick={() => { setSelectedProtocol(p); setIsEditing(false); }}
              className={cn(
                "p-8 panel-de-vidrio cursor-pointer transition-all hover:bg-tema-negro/60 relative overflow-hidden group border-l-4",
                selectedProtocol?.id === p.id 
                  ? "border-l-tema-neon bg-tema-neon/5 shadow-[0_0_40px_rgba(3,154,220,0.1)]" 
                  : "border-l-transparent border-tema-electrico/10 grayscale hover:grayscale-0"
              )}
            >
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full", 
                    p.isActive 
                      ? "bg-tema-matriz shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-pulse" 
                      : "bg-tema-texto/20 shadow-none"
                  )} />
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    p.isActive ? "text-tema-matriz" : "text-tema-texto/20"
                  )}>
                    {p.isActive ? 'NÚCLEO ACTIVO' : 'EN ESPERA'}
                  </span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                  className="text-tema-texto/10 hover:text-red-500 hover:scale-110 active:scale-90 transition-all p-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <h3 className="text-xl font-bold text-tema-texto mb-2 group-hover:text-tema-neon transition-colors tracking-tight uppercase">{p.name}</h3>
              <div className="flex items-center gap-3">
                <div className="p-1 px-2 bg-tema-negro/60 border border-tema-electrico/10 rounded-lg">
                  <Database size={10} className="text-tema-neon opacity-60" />
                </div>
                <p className="text-[10px] text-tema-texto/40 font-bold uppercase tracking-widest">{p.dbSource === 'all' ? 'Acceso Global' : `Sector: ${p.dbSource}`}</p>
              </div>
              
              {/* Decorative line for active state */}
              {selectedProtocol?.id === p.id && (
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-tema-neon/30 to-transparent" />
              )}
            </div>
          ))}

          {protocols.length === 0 && (
            <div className="h-48 panel-de-vidrio flex flex-col items-center justify-center text-center p-8 space-y-4">
              <ShieldCheck size={40} className="text-tema-texto/20" />
              <p className="text-xs text-tema-texto/30 font-bold uppercase tracking-widest leading-relaxed">
                No se han detectado protocolos de enlace. Inicie una nueva unidad neural.
              </p>
            </div>
          )}
        </div>

        {/* Protocol Details / Editor */}
        <div className="flex-1 overflow-y-auto ocultar-barra-desplazamiento">
          <AnimatePresence mode="wait">
            {selectedProtocol ? (
              <motion.div 
                key={selectedProtocol.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6 pb-12"
              >
                {/* Compact Header */}
                <div className="flex items-center justify-between bg-tema-negro/40 p-3 lg:p-4 rounded-xl border border-tema-electrico/10 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-tema-negro rounded-lg border border-tema-electrico/20 flex items-center justify-center relative shadow-inner">
                      <Avatar name={selectedProtocol.name} className="w-6 h-6 ring-2 ring-tema-neon/20 ring-offset-2 ring-offset-tema-negro" />
                      {selectedProtocol.isActive && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-tema-matriz rounded-full border-2 border-tema-negro animate-ping" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base lg:text-lg font-bold text-tema-texto tracking-tighter uppercase">{selectedProtocol.name}</h3>
                        <span className="text-[9px] text-tema-neon font-bold px-1.5 py-0.5 border border-tema-neon/20 rounded bg-tema-neon/5 font-mono">ID_{selectedProtocol.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-end gap-0.5 opacity-80 h-2.5">
                          <motion.div animate={{ height: [2, 6, 2] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }} className={cn("w-1 rounded-sm", selectedProtocol.isActive ? "bg-tema-matriz" : "bg-gray-600")} />
                          <motion.div animate={{ height: [2, 8, 2] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.1, ease: "easeInOut" }} className={cn("w-1 rounded-sm", selectedProtocol.isActive ? "bg-tema-matriz" : "bg-gray-600")} />
                          <motion.div animate={{ height: [2, 5, 2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2, ease: "easeInOut" }} className={cn("w-1 rounded-sm", selectedProtocol.isActive ? "bg-tema-matriz" : "bg-gray-600")} />
                        </div>
                        <span className="text-[9px] text-tema-texto/40 font-bold uppercase tracking-widest leading-none">
                          Status: {selectedProtocol.isActive ? 'ACTIVO' : 'EN ESPERA'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleToggleActive(selectedProtocol)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all active:scale-95",
                        selectedProtocol.isActive 
                          ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20" 
                          : "bg-tema-neon/10 border-tema-neon/30 text-tema-neon hover:bg-tema-neon/20"
                      )}
                    >
                      {selectedProtocol.isActive ? "ABORTAR" : "ACTIVAR"}
                    </button>
                    {isEditing ? (
                      <Button onClick={handleSave} className="gap-2 py-1.5 px-3 shadow-[0_0_15px_rgba(3,154,220,0.2)] text-[9px]">
                        <Save size={12} /> GUARDAR
                      </Button>
                    ) : (
                      <button 
                        onClick={() => setIsEditing(true)} 
                        className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-tema-texto/5 border border-tema-texto/10 text-tema-texto/60 hover:bg-tema-texto/10 hover:text-tema-texto transition-all"
                      >
                        EDITAR
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Top row: Identity and Frequency side by side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <section className="group/field">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[9px] text-tema-neon font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <Users size={12} /> Identidad Neural
                        </label>
                        <div className="h-[1px] flex-1 bg-tema-electrico/10 ml-3 group-focus-within/field:bg-tema-neon/20" />
                      </div>
                      <div className="relative">
                        <textarea 
                          disabled={!isEditing}
                          value={selectedProtocol.personality}
                          onChange={(e) => setSelectedProtocol({ ...selectedProtocol, personality: e.target.value })}
                          className="w-full bg-tema-negro/40 border border-tema-electrico/10 rounded-lg p-3 text-[11px] h-[72px] focus:border-tema-neon focus:outline-none disabled:opacity-40 transition-all font-medium leading-relaxed shadow-inner resize-none"
                          placeholder="Define el tono y el carácter..."
                        />
                        {!isEditing && <div className="absolute inset-0 bg-transparent cursor-not-allowed" />}
                      </div>
                    </section>

                    <section className="group/field">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[9px] text-tema-neon font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <Brain size={12} /> Frecuencia de Voz / Lógica
                        </label>
                        <div className="h-[1px] flex-1 bg-tema-electrico/10 ml-3 group-focus-within/field:bg-tema-neon/20" />
                      </div>
                      <div className="relative">
                        <textarea 
                          disabled={!isEditing}
                          value={selectedProtocol.instructions}
                          onChange={(e) => setSelectedProtocol({ ...selectedProtocol, instructions: e.target.value })}
                          className="w-full bg-tema-negro/80 border border-tema-electrico/10 rounded-lg p-3 text-[11px] h-[72px] focus:border-tema-neon focus:outline-none disabled:opacity-40 transition-all font-bold font-mono text-teal-400/80 leading-relaxed shadow-inner resize-none"
                          placeholder="Parámetros operativos y algoritmos..."
                        />
                         {!isEditing && <div className="absolute inset-0 bg-transparent cursor-not-allowed" />}
                      </div>
                    </section>
                  </div>

                  {/* Settings Grid (Data Source, Welcome Message) row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <section className="group/field">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[9px] text-tema-neon font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <Database size={12} /> Origen de Datos
                        </label>
                        <div className="h-[1px] flex-1 bg-tema-electrico/10 ml-3 group-focus-within/field:bg-tema-neon/20" />
                      </div>
                      <div className="relative">
                        <select 
                          disabled={!isEditing}
                          value={selectedProtocol.dbSource}
                          onChange={(e) => setSelectedProtocol({ ...selectedProtocol, dbSource: e.target.value as any })}
                          className="w-full bg-tema-negro/40 border border-tema-electrico/10 rounded-lg px-3 h-[40px] text-[10px] focus:border-tema-neon focus:outline-none appearance-none cursor-pointer font-bold uppercase tracking-widest shadow-inner disabled:cursor-not-allowed"
                        >
                          <option value="all">Todas las Tablas (Global)</option>
                          <option value="delinquent">Deudores</option>
                          <option value="new_clients">Prospectos</option>
                          <option value="recruitment">RRHH</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-tema-neon opacity-40">
                          <Activity size={12} />
                        </div>
                      </div>
                    </section>
                    
                    <section className="group/field lg:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[9px] text-tema-neon font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <MessageSquare size={12} /> Secuencia de Apertura
                        </label>
                        <div className="h-[1px] flex-1 bg-tema-electrico/10 ml-3 group-focus-within/field:bg-tema-neon/20" />
                      </div>
                      <input 
                        disabled={!isEditing}
                        value={selectedProtocol.welcomeMessage}
                        onChange={(e) => setSelectedProtocol({ ...selectedProtocol, welcomeMessage: e.target.value })}
                        className="w-full bg-tema-negro/40 border border-tema-electrico/10 rounded-lg px-3 h-[40px] text-[11px] focus:border-tema-neon focus:outline-none disabled:opacity-40 transition-all font-medium shadow-inner"
                        placeholder="Mensaje de bienvenida automatizado..."
                      />
                    </section>
                  </div>

                  {/* Capabilities / Tools */}
                  <section className="group/field">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[9px] text-tema-neon font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Wand2 size={12} /> Macros de Respuesta
                      </label>
                      <div className="h-[1px] flex-1 bg-tema-electrico/10 ml-3 group-focus-within/field:bg-tema-neon/20" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      {AVAILABLE_TOOLS.map(tool => (
                        <button
                          key={tool.id}
                          disabled={!isEditing}
                          onClick={() => {
                            const tools = selectedProtocol.tools.includes(tool.id)
                              ? selectedProtocol.tools.filter(t => t !== tool.id)
                              : [...selectedProtocol.tools, tool.id];
                            setSelectedProtocol({ ...selectedProtocol, tools });
                          }}
                          className={cn(
                            "px-3 h-[36px] rounded-lg border text-[8px] font-bold tracking-wider text-left transition-all relative overflow-hidden flex items-center justify-between group/tool",
                            selectedProtocol.tools.includes(tool.id) 
                              ? "bg-tema-neon/10 border-tema-neon/30 text-tema-neon shadow-[0_0_10px_rgba(3,154,220,0.05)]" 
                              : "bg-tema-texto/5 border-tema-texto/5 text-tema-texto/40 hover:text-tema-texto/70"
                          )}
                        >
                          <span className="uppercase truncate pr-1">{tool.label}</span>
                          <div className={cn(
                            "w-1 h-1 rounded-full flex-shrink-0 transition-colors",
                            selectedProtocol.tools.includes(tool.id) ? "bg-tema-neon shadow-[0_0_5px_rgba(3,154,220,1)]" : "bg-tema-texto/20"
                          )} />
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 p-2.5 bg-tema-neon/5 border border-tema-neon/10 rounded-lg flex items-center gap-3">
                       <ShieldCheck size={14} className="text-tema-neon opacity-60 flex-shrink-0" />
                       <p className="text-[8px] text-tema-texto/40 uppercase font-bold tracking-wider">
                         P.C.Z. (Protocolo Confianza Zero) activo en todas las macros.
                       </p>
                    </div>
                  </section>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-tema-neon/20 blur-[40px] animate-pulse rounded-full" />
                  <div className="relative w-20 h-20 panel-de-vidrio flex items-center justify-center rounded-2xl border-tema-neon/20">
                    <Settings2 size={36} className="text-tema-neon/30" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-tema-texto/30 uppercase tracking-widest">PROTOCOLO AUSENTE</h4>
                  <p className="text-[10px] text-tema-neon/40 font-bold mt-2 uppercase tracking-widest">Seleccione o inyecte nueva lógica neural</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Decorative Blurs */}
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-tema-neon/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-tema-electrico/5 blur-[150px] rounded-full pointer-events-none" />
    </div>
  );
}
