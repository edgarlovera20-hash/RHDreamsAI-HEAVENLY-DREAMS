import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  ChevronLeft,
  Clock,
  User,
  Cpu,
  Trash2,
  CheckCircle2,
  X,
  History,
  AlertCircle,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  limit, 
  startAfter,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { Avatar, Button, Card, CyberIcon } from './UI';
import { cn, OperationType, handleFirestoreError } from '../lib/utils';
import { format } from 'date-fns';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  isAi: boolean;
  role: 'user' | 'assistant';
}

interface Chat {
  id: string;
  contactName: string;
  lastMessage: string;
  updatedAt: any;
  unreadCount: number;
  status?: 'open' | 'closed' | 'pending';
}

interface ChatThreadProps {
  userId: string;
  chat: Chat;
  onClose: () => void;
  onSendMessage: (text: string) => Promise<void>;
}

export const ChatThread: React.FC<ChatThreadProps> = ({ userId, chat, onClose, onSendMessage }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [limitCount, setLimitCount] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'users', userId, 'chats', chat.id, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs.reverse());
      setHasMore(snap.docs.length === limitCount);
      setIsLoading(false);
      setTimeout(() => scrollToBottom(), 100);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/chats/${chat.id}/messages`));

    return () => unsubscribe();
  }, [userId, chat.id, limitCount]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const text = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    
    try {
      await onSendMessage(text);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const loadMore = () => {
    setLimitCount(prev => prev + 50);
  };

  const updateStatus = async (status: Chat['status']) => {
    try {
      await updateDoc(doc(db, 'users', userId, 'chats', chat.id), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE);
    }
  };

  const deleteThread = async () => {
    if (!window.confirm('¿Confirmar purga de hilo neural?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'chats', chat.id));
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE);
    }
  };

  return (
    <div className="h-full flex flex-col panel-de-vidrio overflow-hidden relative shadow-2xl group">
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      
      {/* Header */}
      <div className="p-8 border-b border-tema-electrico/10 bg-tema-negro/40 backdrop-blur-xl flex items-center justify-between z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-xl bg-tema-negro border border-tema-electrico/20 flex items-center justify-center text-tema-texto/40 hover:text-tema-neon hover:border-tema-neon transition-all hover:scale-105 active:scale-95"
          >
            <ChevronLeft size={24} />
          </button>
          <Avatar name={chat.contactName} status="online" />
          <div>
            <h3 className="font-bold text-lg text-tema-texto tracking-tight leading-none mb-2 uppercase">{chat.contactName}</h3>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-tema-neon animate-pulse shadow-[0_0_8px_var(--tema-neon)]" />
              <p className="text-[10px] text-tema-neon font-bold uppercase tracking-wider opacity-70">Canal Neural Activo</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <select 
            value={chat.status || 'open'}
            onChange={(e) => updateStatus(e.target.value as any)}
            className="bg-tema-negro/60 border border-tema-electrico/20 text-[10px] font-bold px-4 py-2 rounded-xl text-tema-neon focus:outline-none focus:border-tema-neon uppercase tracking-widest transition-all"
          >
            <option value="open">Abierto</option>
            <option value="pending">Pendiente</option>
            <option value="closed">Cerrado</option>
          </select>
          <button 
            onClick={deleteThread}
            className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-red-500/40 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all active:scale-90"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-10 space-y-8 ocultar-barra-desplazamiento relative z-0"
      >
        {hasMore && (
          <div className="flex justify-center pb-6">
            <button 
              onClick={loadMore}
              className="px-6 py-3 bg-tema-electrico/5 border border-tema-electrico/10 rounded-full text-[10px] font-bold text-tema-texto/40 hover:text-tema-neon hover:border-tema-neon/40 transition-all uppercase tracking-widest flex items-center gap-3 shadow-sm"
            >
              <History size={14} /> Cargar Historial Anterior
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30 text-tema-neon">
            <div className="relative">
              <Cpu size={56} className="animate-spin mb-6" />
              <div className="absolute inset-0 blur-xl bg-tema-neon/20 rounded-full" />
            </div>
            <p className="font-bold text-xs uppercase tracking-widest">Sincronizando registros...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[200px] text-center opacity-20">
                <AlertCircle size={64} className="mb-6 text-tema-texto" />
                <p className="font-bold text-xs uppercase tracking-widest text-tema-texto max-w-[250px] leading-relaxed">No hay transmisiones registradas en este hilo neural.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <motion.div 
                initial={{ opacity: 0, x: msg.isAi ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                key={msg.id}
                className={cn(
                  "flex items-start gap-4",
                  msg.isAi ? "flex-row" : "flex-row-reverse"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                  msg.isAi 
                    ? "bg-tema-neon/10 border-tema-neon/30 text-tema-neon shadow-[0_0_15px_rgba(3,154,220,0.2)]" 
                    : "bg-tema-texto/5 border-tema-texto/10 text-tema-texto opacity-40 shadow-inner"
                )}>
                  {msg.isAi ? <Cpu size={18} /> : <User size={18} />}
                </div>
                <div className={cn(
                  "max-w-[70%] relative group/msg",
                  msg.isAi ? "items-start" : "items-end"
                )}>
                  <div className={cn(
                    "p-6 rounded-2xl relative transition-all duration-300",
                    msg.isAi 
                      ? "bg-tema-negro/60 border border-tema-electrico/20 text-tema-texto rounded-tl-none hover:border-tema-neon/40 shadow-xl" 
                      : "bg-tema-neon text-tema-negro font-bold rounded-tr-none shadow-[0_0_30px_rgba(3,154,220,0.3)] hover:scale-[1.01]"
                  )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                    <div className={cn(
                      "flex items-center gap-2 mt-4",
                      msg.isAi ? "justify-start text-tema-texto/30" : "justify-end text-tema-negro/50"
                    )}>
                      <Clock size={10} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {msg.timestamp ? format(msg.timestamp.toDate(), 'HH:mm') : 'Transmitiendo...'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-8 border-t border-tema-electrico/10 bg-tema-negro/60 backdrop-blur-2xl z-10">
        <form onSubmit={handleSend} className="relative group/input">
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Introduce comando neural..."
            className="w-full bg-tema-negro/80 border border-tema-electrico/20 rounded-2xl py-6 pl-8 pr-28 text-sm focus:outline-none focus:border-tema-neon transition-all text-tema-texto placeholder:text-tema-texto/20 shadow-inner"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
            <button type="button" className="p-3 text-tema-texto/20 hover:text-tema-neon transition-all active:scale-90">
              <Smile size={24} />
            </button>
            <button 
              type="submit" 
              disabled={!newMessage.trim() || isSending}
              className="w-14 h-14 rounded-xl bg-tema-neon text-tema-negro flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(3,154,220,0.4)]"
            >
              {isSending ? (
                <div className="animate-spin text-tema-negro"><Cpu size={24} /></div>
              ) : (
                <Send size={24} className="ml-1" />
              )}
            </button>
          </div>
        </form>
        <div className="flex items-center justify-center gap-4 mt-6">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-tema-electrico/10 to-transparent" />
          <p className="text-[10px] text-tema-texto/20 font-bold uppercase tracking-widest flex items-center gap-3 whitespace-nowrap">
            <Activity size={10} className="animate-pulse text-tema-matriz" />
            Vínculo Encriptado : AES-256-GCM
          </p>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-tema-electrico/10 to-transparent" />
        </div>
      </div>
    </div>
  );
};
