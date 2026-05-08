import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Send,
  User,
  ShieldCheck,
  Tag,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Activity,
  Cpu,
  Zap,
  Ticket as TicketIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Avatar, Button, Card, CyberIcon } from './UI';
import { cn, OperationType, handleFirestoreError } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  createdAt: any;
  updatedAt: any;
}

interface TicketMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: any;
  isAi: boolean;
}

interface SupportTicketsViewProps {
  userId: string;
}

export const SupportTicketsView: React.FC<SupportTicketsViewProps> = ({ userId }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Ticket Form
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium' as Ticket['priority'],
    category: 'Soporte Técnico'
  });

  useEffect(() => {
    const ticketsQuery = query(
      collection(db, 'users', userId, 'tickets'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(ticketsQuery, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket)));
      setIsLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/tickets`));

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!activeTicket) {
      setMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, 'users', userId, 'tickets', activeTicket.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as TicketMessage)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/tickets/${activeTicket.id}/messages`));

    return () => unsubscribe();
  }, [userId, activeTicket]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.description) return;

    try {
      const ticketRef = await addDoc(collection(db, 'users', userId, 'tickets'), {
        ...newTicket,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Initial system message
      await addDoc(collection(db, 'users', userId, 'tickets', ticketRef.id, 'messages'), {
        text: `Protocolo de soporte iniciado. Su ticket #${ticketRef.id.slice(0, 8)} ha sido recibido por el núcleo central.`,
        senderId: 'system',
        senderName: 'SISTEMA NEURAL',
        timestamp: serverTimestamp(),
        isAi: true
      });

      setIsCreating(false);
      setNewTicket({
        subject: '',
        description: '',
        priority: 'medium',
        category: 'Soporte Técnico'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'users', userId, 'tickets', activeTicket.id, 'messages'), {
        text,
        senderId: userId,
        senderName: 'Usuario Ejecutivo',
        timestamp: serverTimestamp(),
        isAi: false
      });

      await updateDoc(doc(db, 'users', userId, 'tickets', activeTicket.id), {
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE);
    }
  };

  const updateTicketStatus = async (status: Ticket['status']) => {
    if (!activeTicket) return;
    try {
      await updateDoc(doc(db, 'users', userId, 'tickets', activeTicket.id), {
        status,
        updatedAt: serverTimestamp()
      });
      setActiveTicket(prev => prev ? { ...prev, status } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE);
    }
  };

  const getStatusIcon = (status: Ticket['status']) => {
    switch (status) {
      case 'open': return <AlertCircle className="text-tema-neon" size={14} />;
      case 'pending': return <Clock className="text-yellow-400" size={14} />;
      case 'resolved': return <CheckCircle2 className="text-tema-matriz" size={14} />;
      case 'closed': return <ShieldCheck className="text-tema-texto/30" size={14} />;
    }
  };

  const getPriorityColor = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'low': return 'bg-tema-neon/10 text-tema-neon border-tema-neon/30';
      case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'high': return 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-[0_0_15px_rgba(251,146,60,0.1)]';
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse';
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex gap-6 p-8 overflow-hidden relative bg-tema-negro/40 backdrop-blur-xl">
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      
      {/* Left Column: Ticket List */}
      <div className="w-[450px] flex flex-col gap-8 h-full relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <CyberIcon color="var(--tema-neon)" size="lg"><TicketIcon size={28} /></CyberIcon>
            <h2 className="text-2xl font-bold text-tema-texto tracking-tight uppercase whitespace-nowrap leading-none">CENTRAL TICKETS</h2>
          </div>
          <button 
            onClick={() => setIsCreating(true)} 
            className="w-12 h-12 bg-tema-neon text-tema-negro rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(3,154,220,0.4)] hover:scale-110 active:scale-95 transition-all"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="relative group">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-tema-neon/40 group-focus-within:text-tema-neon transition-colors" />
          <input 
            type="text" 
            placeholder="LOCALIZAR TOKEN DE SOPORTE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-tema-negro/60 border border-tema-electrico/20 rounded-xl py-3.5 pl-12 pr-6 text-xs font-bold tracking-wider text-tema-texto focus:outline-none focus:border-tema-neon transition-all shadow-inner"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 ocultar-barra-desplazamiento pr-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <Loader2 className="text-tema-neon animate-spin" size={48} />
              <p className="text-xs font-bold text-tema-neon/40 uppercase tracking-widest text-center">Escaneando Infraestructura...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-20 panel-de-vidrio p-10 grayscale opacity-40">
              <MessageSquare size={64} className="mx-auto mb-6 text-tema-texto/20" />
              <p className="text-xs text-tema-texto/30 font-bold uppercase tracking-widest">Sector sin incidencias activas</p>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <motion.div 
                layout
                key={ticket.id}
                onClick={() => { setActiveTicket(ticket); setIsCreating(false); }}
                className={cn(
                  "p-6 rounded-xl panel-de-vidrio transition-all cursor-pointer group relative overflow-hidden flex flex-col gap-4 border-l-4",
                  activeTicket?.id === ticket.id 
                    ? "border-l-tema-neon bg-tema-neon/5 shadow-[0_0_30px_rgba(3,154,220,0.1)]" 
                    : "border-l-transparent grayscale hover:grayscale-0 hover:bg-tema-negro/40"
                )}
              >
                <div className="flex justify-between items-center relative z-10">
                  <div className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-md border uppercase tracking-wider", getPriorityColor(ticket.priority))}>
                    {ticket.priority === 'critical' ? 'CRÍTICO' : ticket.priority.toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2 bg-tema-negro/60 border border-tema-electrico/10 px-2.5 py-0.5 rounded-md">
                    {getStatusIcon(ticket.status)}
                    <span className="text-xs font-bold text-tema-texto/60 uppercase tracking-wider leading-none">{ticket.status}</span>
                  </div>
                </div>

                <h3 className={cn("text-base font-bold tracking-tight flex-1 mb-2 leading-tight transition-colors transition-shadow", activeTicket?.id === ticket.id ? "text-tema-neon" : "text-tema-texto group-hover:text-tema-neon/80")}>
                  {ticket.subject}
                </h3>
                
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-tema-texto/40 border-t border-tema-electrico/5 pt-4">
                  <div className="flex items-center gap-3">
                    <Tag size={12} className="text-tema-neon/40" />
                    <span>{ticket.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span>{ticket.updatedAt?.toDate ? format(ticket.updatedAt.toDate(), 'HH:mm') : '--:--'}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Ticket Content or Creation Form */}
      <div className="flex-1 panel-de-vidrio flex flex-col shadow-2xl relative overflow-hidden z-10">
        <div className="absolute inset-0 grid-bg opacity-5 pointer-events-none" />
        
        <AnimatePresence mode="wait">
          {isCreating ? (
            <motion.div 
              key="create"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              className="relative z-10 flex flex-col h-full p-10 overflow-y-auto ocultar-barra-desplazamiento"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-6">
                   <CyberIcon color="var(--tema-neon)" size="lg"><Plus size={28} /></CyberIcon>
                   <div>
                    <h3 className="text-2xl font-bold text-tema-texto tracking-tight uppercase whitespace-nowrap">NUEVA INCIDENCIA</h3>
                    <p className="text-xs text-tema-neon font-semibold uppercase tracking-wider opacity-80 mt-1">SOPORTE_PROTOCOL_v4.4</p>
                   </div>
                </div>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-8 max-w-3xl">
                <div className="space-y-3">
                  <label className="text-xs text-tema-neon font-semibold uppercase tracking-wider ml-1 flex items-center gap-2">
                    <MessageSquare size={14} /> Asunto de la Incidencia
                  </label>
                  <input 
                    type="text"
                    required
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-tema-negro/40 border border-tema-electrico/20 rounded-xl p-4 text-sm focus:border-tema-neon focus:outline-none transition-all text-tema-texto font-medium shadow-inner"
                    placeholder="Resumen ejecutivo del problema detectado..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs text-tema-neon font-semibold uppercase tracking-wider ml-1 flex items-center gap-2">
                      <Activity size={14} /> Prioridad del Caso
                    </label>
                    <div className="relative">
                      <select 
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="w-full bg-tema-negro/40 border border-tema-electrico/20 rounded-xl p-4 text-sm focus:border-tema-neon focus:outline-none appearance-none cursor-pointer uppercase font-bold tracking-wider shadow-inner"
                      >
                        <option value="low">BAJA // OPERATIVA</option>
                        <option value="medium">MEDIA // ESTÁNDAR</option>
                        <option value="high">ALTA // PRIORITARIA</option>
                        <option value="critical">CRÍTICA // BLOQUEO TOTAL</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-tema-neon opacity-40">
                        <Zap size={18} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs text-tema-neon font-semibold uppercase tracking-wider ml-1 flex items-center gap-2">
                      <Tag size={14} /> Categoría Neural
                    </label>
                    <div className="relative">
                      <select 
                        value={newTicket.category}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-tema-negro/40 border border-tema-electrico/20 rounded-xl p-4 text-sm focus:border-tema-neon focus:outline-none appearance-none cursor-pointer uppercase font-bold tracking-wider shadow-inner"
                      >
                        <option value="Soporte Técnico">Soporte Técnico</option>
                        <option value="Facturación">Facturación Neural</option>
                        <option value="Ventas">Ventas y Cuentas</option>
                        <option value="Seguridad">Ciberseguridad</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-tema-neon opacity-40">
                         <ShieldCheck size={18} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs text-tema-neon font-semibold uppercase tracking-wider ml-1 flex items-center gap-2">
                    <Activity size={14} /> Bitácora Detallada
                  </label>
                  <textarea 
                    required
                    rows={8}
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-tema-negro/80 border border-tema-electrico/20 rounded-2xl p-6 text-sm focus:border-tema-neon focus:outline-none transition-all resize-none text-tema-texto font-medium leading-relaxed shadow-inner"
                    placeholder="Describa el fallo o requerimiento con precisión técnica..."
                  />
                </div>

                <div className="pt-8 flex gap-6">
                  <Button variant="secondary" onClick={() => setIsCreating(false)} className="flex-1 py-4 text-xs font-bold tracking-widest uppercase">CANCELAR</Button>
                  <Button type="submit" className="flex-1 py-4 text-xs font-bold tracking-widest uppercase shadow-[0_0_50px_rgba(3,154,220,0.3)]">
                    ACTIVAR PROTOCOLO
                  </Button>
                </div>
              </form>
            </motion.div>
          ) : activeTicket ? (
            <motion.div 
              key="details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10 flex flex-col h-full"
            >
              <div className="p-8 border-b border-tema-electrico/10 bg-tema-negro/60 backdrop-blur-3xl relative overflow-hidden group">
                <div className="absolute inset-0 grid-bg opacity-5 group-hover:opacity-10 transition-opacity" />
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-[10px] font-semibold text-tema-neon uppercase tracking-wider font-mono bg-tema-neon/5 border border-tema-neon/20 px-2 py-1 rounded-md">TICKET #{activeTicket.id.slice(0, 12)}</span>
                      <div className={cn("text-[10px] font-semibold px-2 py-1 rounded-md border uppercase tracking-wider shadow-inner", getPriorityColor(activeTicket.priority))}>
                        {activeTicket.priority.toUpperCase()}
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-tema-texto tracking-tight leading-tight uppercase">{activeTicket.subject}</h3>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative group/status">
                      <select 
                        value={activeTicket.status}
                        onChange={(e) => updateTicketStatus(e.target.value as any)}
                        className="bg-tema-negro/80 border border-tema-electrico/20 text-[10px] font-semibold tracking-wider px-4 py-2 rounded-lg text-tema-texto/60 focus:outline-none focus:border-tema-neon cursor-pointer appearance-none uppercase shadow-inner"
                      >
                        <option value="open">ABIERTO</option>
                        <option value="pending">PENDIENTE</option>
                        <option value="resolved">RESUELTO</option>
                        <option value="closed">CERRADO</option>
                      </select>
                      <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tema-neon rotate-90" />
                    </div>
                    <button className="w-10 h-10 rounded-lg bg-tema-negro/80 border border-tema-electrico/20 flex items-center justify-center text-tema-texto/30 hover:text-tema-neon hover:border-tema-neon/30 transition-all active:scale-90 shadow-inner">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-8 text-xs font-semibold text-tema-texto/60 tracking-wider uppercase relative z-10">
                  <div className="flex items-center gap-2 decoration-tema-neon/20 underline underline-offset-4">
                    <User size={16} className="text-tema-neon/50" />
                    <span>Iniciado: {activeTicket.createdAt?.toDate ? format(activeTicket.createdAt.toDate(), 'PPP', { locale: es }) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-tema-neon/50" />
                    <span>Última Transmisión: {activeTicket.updatedAt?.toDate ? format(activeTicket.updatedAt.toDate(), 'HH:mm') : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 ocultar-barra-desplazamiento bg-tema-negro/20 relative">
                <div className="absolute inset-0 grid-bg opacity-5 pointer-events-none" />
                <div className="bg-tema-negro/60 border border-tema-electrico/10 rounded-2xl p-8 mb-12 shadow-inner border-l-4 border-l-tema-neon/40 relative group">
                  <p className="text-tema-texto/80 text-sm leading-relaxed italic font-medium">
                    <span className="text-[10px] text-tema-neon/70 font-semibold uppercase mb-4 tracking-wider flex items-center gap-2">
                      <Activity size={12} /> BITÁCORA DE INICIO:
                    </span>
                    {activeTicket.description}
                  </p>
                  <div className="absolute top-4 right-4 text-tema-texto/5">
                     <Cpu size={40} />
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  {messages.map((msg, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={msg.id} 
                      className={cn(
                        "flex flex-col gap-3 max-w-[85%]",
                        msg.isAi ? "items-start" : "items-end ml-auto"
                      )}
                    >
                      <div className={cn(
                        "panel-de-vidrio p-6 text-sm relative group overflow-hidden border transition-all duration-300 shadow-lg",
                        msg.isAi 
                          ? "bg-tema-negro/60 border-tema-electrico/10 rounded-2xl rounded-tl-none font-medium text-tema-texto/90 leading-relaxed group-hover:border-tema-electrico/30 shadow-[0_10px_30px_rgba(0,0,0,0.2)]" 
                          : "bg-tema-neon/10 border-tema-neon/30 text-tema-texto rounded-2xl rounded-tr-none font-medium leading-relaxed shadow-[0_10px_40px_rgba(3,154,220,0.1)] border-r-4 border-r-tema-neon hover:shadow-[0_10px_50px_rgba(3,154,220,0.2)]"
                      )}>
                        <p className="relative z-10">{msg.text}</p>
                        {msg.isAi && (
                           <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform">
                              <Cpu size={48} />
                           </div>
                        )}
                        
                        <div className={cn(
                          "absolute -bottom-6 flex items-center gap-2 text-[10px] font-semibold text-tema-texto/30 uppercase tracking-wider whitespace-nowrap",
                          msg.isAi ? "left-2" : "right-1"
                        )}>
                          <span className="text-tema-neon opacity-60">{msg.senderName}</span>
                          <span className="opacity-20">•</span>
                          <span>{msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm') : '--:--'}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-tema-negro/80 border-t border-tema-electrico/10 backdrop-blur-3xl relative z-20">
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-4">
                  <div className="relative flex-1 group">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="TRANSMITIR COMUNICADO NEURAL..."
                      className="w-full bg-tema-negro/60 border border-tema-electrico/20 rounded-xl py-4 pl-6 pr-16 text-sm font-medium text-tema-texto focus:outline-none focus:border-tema-neon transition-all shadow-inner placeholder:text-tema-texto/20"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                       <button type="button" className="text-tema-texto/20 hover:text-tema-neon transition-all hover:scale-110 p-2">
                          <Plus size={18} />
                       </button>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-14 h-14 rounded-xl bg-tema-neon text-tema-negro flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(3,154,220,0.5)] group/send"
                  >
                    <Send size={24} strokeWidth={3} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-12"
            >
              <div className="relative">
                 <div className="absolute inset-0 bg-tema-neon/20 rounded-full blur-[80px] animate-pulse" />
                 <div className="relative w-40 h-40 panel-de-vidrio flex items-center justify-center rounded-full border-tema-neon/20 shadow-2xl">
                    <TicketIcon size={64} className="text-tema-neon/30" />
                 </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold tracking-tight text-tema-texto/40 uppercase tracking-wider mb-4">MÓDULO DE SOPORTE</h3>
                <p className="text-sm text-tema-neon/60 font-semibold tracking-wider uppercase max-w-sm mx-auto leading-relaxed">
                  Seleccione una incidencia en el panel neural o inicie un nuevo proceso de asistencia técnica.
                </p>
              </div>
              
              <div className="mt-16 grid grid-cols-3 gap-12 max-w-3xl w-full pt-8 border-t border-tema-electrico/5">
                 {[
                   { label: 'SLA OBJETIVO', val: '2.4H', icon: Clock },
                   { label: 'TOKEN_RATE', val: '142ms/p', icon: Zap },
                   { label: 'ENCRIPTACIÓN', val: 'RSA-4K', icon: ShieldCheck }
                 ].map((stat, i) => (
                   <div key={i} className="text-center group/stat">
                     <div className="mb-3 flex justify-center">
                        <stat.icon className="text-tema-neon/20 group-hover:text-tema-neon/50 transition-colors" size={24} />
                     </div>
                     <p className="text-xl font-bold text-tema-texto/60 group-hover:text-tema-texto transition-colors">{stat.val}</p>
                     <p className="text-[10px] font-semibold text-tema-neon/30 uppercase tracking-widest mt-1">{stat.label}</p>
                   </div>
                 ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative Blurs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-tema-neon/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-tema-electrico/5 blur-[150px] rounded-full pointer-events-none" />
    </div>
  );
};
