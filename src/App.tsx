import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Bell, 
  Send,
  MoreVertical,
  Paperclip,
  Smile,
  X,
  Database,
  Briefcase,
  Users,
  ShieldCheck,
  CreditCard,
  ChevronLeft,
  Cpu,
  Zap,
  Activity,
  Globe,
  GitBranch,
  LayoutDashboard,
  Key,
  Crown,
  User,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Wallet,
  Headset,
  DollarSign,
  Sun,
  Clock,
  QrCode,
  Blocks,
  Terminal,
  LineChart,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { auth, signInWithGoogle, db } from './lib/firebase';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Avatar, Button, Card, CyberIcon } from './components/UI';
import { cn, OperationType, handleFirestoreError } from './lib/utils';
import { getAgentResponse, AgentContext } from './lib/gemini';
import { format } from 'date-fns';
import { HolographicBackground } from './components/HolographicBackground';
import { CRMView } from './components/CRMView';
import { WorkflowView } from './components/WorkflowView';
import { APIKeysView } from './components/APIKeysView';
import { IntegrationsView } from './components/IntegrationsView';
import { MetaAdsDashboard } from './components/MetaAdsDashboard';
import { ProtocolConfigView } from './components/ProtocolConfigView';
import { SupportTicketsView } from './components/SupportTicketsView';
import { TagsView } from './components/TagsView';
import { BlacklistView } from './components/BlacklistView';
import { ConversationsView } from './components/ConversationsView';
import { TemplatesView } from './components/TemplatesView';
import { MatrixText } from './components/ui/matrix-text';
import { deleteDoc, where, limit, getDocs } from 'firebase/firestore';
import { ChatThread } from './components/ChatThread';

interface AgentProtocol {
  id: string;
  name: string;
  personality: string;
  instructions: string;
  dbSource: string;
  welcomeMessage: string;
  tools: string[];
  isActive: boolean;
}

type AgentRole = 'recruiter' | 'follow-up' | 'customer-service' | 'hr' | 'collections';

interface Chat {
  id: string;
  contactName: string;
  lastMessage: string;
  updatedAt: any;
  unreadCount: number;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  isAi: boolean;
  role: 'user' | 'assistant';
}

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  agentRole: AgentRole;
  agentName?: string;
  agentTone?: string;
  templates?: { id: string; title: string; content: string }[];
  knowledgeBase: string;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeView, setActiveView] = useState<string>('chat');
  const [activeProtocol, setActiveProtocol] = useState<AgentProtocol | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const newProfile = {
              uid: u.uid,
              displayName: u.displayName || 'Usuario',
              photoURL: u.photoURL || '',
              agentRole: 'customer-service' as AgentRole,
              agentName: 'Asistente Neural',
              agentTone: 'professional',
              templates: [
                { id: '1', title: 'Saludo Inicial', content: 'Hola {{name}}, ¿en qué puedo ayudarte hoy?' },
                { id: '2', title: 'Cierre', content: 'Quedo a tu disposición para cualquier otra consulta.' }
              ],
              knowledgeBase: 'Nuestra empresa se dedica a vender sueños. Horario de atención lun-vi 9am-6pm.',
              createdAt: new Date().toISOString(),
            };
            setDoc(userRef, newProfile).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`));
          }
        }, (err) => handleFirestoreError(err, OperationType.GET, `users/${u.uid}`));

        const chatsQuery = query(collection(db, 'users', u.uid, 'chats'), orderBy('updatedAt', 'desc'));
        onSnapshot(chatsQuery, (snap) => {
          setChats(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${u.uid}/chats`));

        // Protocols Listener for Active one
        const activeProtocolQuery = query(
          collection(db, 'users', u.uid, 'protocols'),
          where('isActive', '==', true),
          limit(1)
        );
        onSnapshot(activeProtocolQuery, (snap) => {
          if (!snap.empty) {
            setActiveProtocol({ id: snap.docs[0].id, ...snap.docs[0].data() } as AgentProtocol);
          } else {
            setActiveProtocol(null);
          }
        }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${u.uid}/protocols`));
      }
      setIsLoading(false);
    });
  }, []);

  // Messages Listener
  useEffect(() => {
    if (user && activeChat) {
      const messagesQuery = query(
        collection(db, 'users', user.uid, 'chats', activeChat.id, 'messages'),
        orderBy('timestamp', 'asc')
      );
      return onSnapshot(messagesQuery, (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/chats/${activeChat.id}/messages`));
    } else {
      setMessages([]);
    }
  }, [user, activeChat]);

  const handleSendMessage = async (textArg?: string) => {
    if (!user || !activeChat || isSending) return;
    
    const text = textArg || newMessage.trim();
    if (!text) return;

    if (!textArg) setNewMessage('');
    setIsSending(true);

    try {
      const chatRef = doc(db, 'users', user.uid, 'chats', activeChat.id);
      const messagesCol = collection(chatRef, 'messages');

      await addDoc(messagesCol, {
        text: text,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        isAi: false,
        role: 'user'
      });

      await updateDoc(chatRef, {
        lastMessage: text,
        updatedAt: serverTimestamp(),
        unreadCount: 0
      });

      if (profile) {
        const history = messages.slice(-10).map(m => ({ role: m.role, text: m.text }));
        const aiResponse = await getAgentResponse(text, {
          protocol: activeProtocol ? {
            name: activeProtocol.name,
            personality: activeProtocol.personality,
            instructions: activeProtocol.instructions,
            dbSource: activeProtocol.dbSource,
            welcomeMessage: activeProtocol.welcomeMessage,
            tools: activeProtocol.tools
          } : undefined,
          role: profile.agentRole,
          knowledgeBase: profile.knowledgeBase,
          contactName: activeChat.contactName,
          agentName: profile.agentName,
          tone: profile.agentTone,
          templates: profile.templates
        }, history);

        // Handle tool calls
        if (aiResponse.toolCalls) {
          for (const call of aiResponse.toolCalls) {
            console.log("Executing AI Tool Call:", call.name, call.args);
            if (call.name === 'createCRMClient') {
              const args = call.args as any;
              await addDoc(collection(db, 'users', user.uid, 'crm_clients'), {
                ...args,
                updatedAt: serverTimestamp(),
                syncedWithCentral: false
              });
            } else if (call.name === 'updateCRMClient') {
              const args = call.args as any;
              const { id, ...updates } = args;
              if (id) {
                await updateDoc(doc(db, 'users', user.uid, 'crm_clients', id), {
                  ...updates,
                  updatedAt: serverTimestamp()
                });
              }
            } else if (call.name === 'listCRM') {
              const args = call.args as any;
              const dbSource = activeProtocol?.dbSource || 'all';
              const col = collection(db, 'users', user.uid, 'crm_clients');
              const crmQuery = dbSource === 'delinquent'
                ? query(col, where('status', '==', 'delinquent'), limit(args.limit || 50))
                : dbSource === 'new_clients'
                  ? query(col, where('status', '==', 'lead'), limit(args.limit || 50))
                  : dbSource === 'recruitment'
                    ? query(col, where('status', '==', 'active'), limit(args.limit || 50))
                    : query(col, limit(args.limit || 50));

              const snap = await getDocs(crmQuery);
              const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              console.log("AI listing CRM data for source:", dbSource, data);
            } else if (call.name === 'createWorkflow') {
              const args = call.args as any;
              await addDoc(collection(db, 'users', user.uid, 'workflows'), {
                ...args,
                status: 'draft',
                createdAt: serverTimestamp()
              });
            } else if (call.name === 'deleteCRMClient') {
              const args = call.args as any;
              if (args.id) {
                await deleteDoc(doc(db, 'users', user.uid, 'crm_clients', args.id));
              }
            } else if (call.name === 'updateWorkflowStatus') {
              const args = call.args as any;
              if (args.id && args.status) {
                await updateDoc(doc(db, 'users', user.uid, 'workflows', args.id), {
                  status: args.status
                });
              }
            } else if (call.name === 'scheduleMeeting') {
               const args = call.args as any;
               await addDoc(collection(db, 'users', user.uid, 'notifications'), {
                 title: 'Reunión Agendada',
                 body: `Se ha agendado: ${args.title} para el ${args.startTime}.`,
                 type: 'calendar',
                 createdAt: serverTimestamp(),
                 read: false
               });
            } else if (call.name === 'getAdsPerformance') {
               // Mocking a report generation
               await addDoc(collection(db, 'users', user.uid, 'notifications'), {
                 title: 'Reporte de Meta Ads',
                 body: `Reporte generado para el periodo solicitado. ROAS promedio: 4.2.`,
                 type: 'ads',
                 createdAt: serverTimestamp(),
                 read: false
               });
            } else if (call.name === 'sendSlackNotification') {
               const args = call.args as any;
               console.log("Slack Notification Mock:", args.message);
            } else if (call.name === 'sendToCentral') {
               // Logic handled by components mostly, or automated here
            }
          }
        }

        await addDoc(messagesCol, {
          text: aiResponse.text,
          senderId: 'ai-agent',
          timestamp: serverTimestamp(),
          isAi: true,
          role: 'assistant'
        });

        await updateDoc(chatRef, {
          lastMessage: aiResponse.text,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE);
    } finally {
      setIsSending(false);
    }
  };

  const createNewChat = async () => {
    if (!user) return;
    const name = prompt("Protocolo ID del contacto:");
    if (!name) return;

    try {
      const chatRef = await addDoc(collection(db, 'users', user.uid, 'chats'), {
        contactName: name,
        lastMessage: 'Vínculo neural establecido',
        updatedAt: serverTimestamp(),
        unreadCount: 0
      });
      setActiveChat({ id: chatRef.id, contactName: name, lastMessage: 'Vínculo neural establecido', updatedAt: new Date(), unreadCount: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE);
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), updates);
      setIsSettingsOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-tema-negro overflow-hidden relative">
        <HolographicBackground />
        <div className="absolute inset-0 grid-bg opacity-10" />
        <div className="relative z-10 text-center">
          <motion.div 
            animate={{ rotate: 360, borderTopColor: ['var(--tema-neon)', '#ffffff', 'var(--tema-neon)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 border-4 border-tema-electrico/20 rounded-full mx-auto mb-8 shadow-[0_0_40px_rgba(3,154,220,0.3)]"
          />
          <p className="text-tema-neon font-bold tracking-widest text-sm uppercase animate-pulse">CARGANDO NÚCLEO NEURAL...</p>
          <p className="text-tema-texto/40 font-medium text-xs mt-4 uppercase tracking-wider">HDreams OS v2.4.0_Neural Enterprise</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-tema-negro overflow-hidden relative">
        <HolographicBackground />
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center z-10 max-w-2xl px-12 relative"
        >
          {/* Logo Effect */}
          <div className="w-48 h-48 mx-auto mb-16 relative group">
             <div className="absolute inset-0 bg-tema-neon/30 rounded-full blur-[100px] animate-pulse group-hover:bg-tema-neon/50 transition-all duration-700" />
             <div className="relative w-full h-full border-[3px] border-tema-texto/60 rounded-full flex items-center justify-center bg-tema-negro shadow-[0_0_60px_rgba(3,154,220,0.4)] backdrop-blur-3xl">
                <div className="text-center">
                   <h1 className="text-3xl font-bold text-tema-texto leading-none italic">HD</h1>
                   <p className="text-xs text-tema-texto/50 font-semibold uppercase tracking-wider mt-2 leading-tight">HEAVENLY DREAMS<br/>ENTERPRISE SYSTEMS</p>
                </div>
             </div>
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold text-tema-texto mb-4 tracking-tight uppercase leading-tight">
             PROTOCOLO <span className="text-tema-neon">MAESTRO</span>
          </h2>
          <p className="text-tema-neon font-medium text-sm tracking-widest mb-12 uppercase opacity-80">
             Neural Command & Control Infrastructure
          </p>

          <div className="panel-de-vidrio p-10 md:p-12 bg-tema-negro/40 border-l-4 border-tema-neon shadow-2xl">
            <button 
              onClick={signInWithGoogle} 
              className="w-full py-5 bg-tema-neon text-tema-negro font-bold text-sm tracking-wider uppercase rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(3,154,220,0.4)] group overflow-hidden relative"
            >
              <span className="relative z-10">ESTABLECER VÍNCULO NEURAL</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
            <div className="mt-8 pt-8 border-t border-tema-electrico/10 flex flex-wrap items-center justify-center gap-6">
               <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-tema-neon/60" />
                  <span className="text-xs font-semibold text-tema-texto/50 uppercase tracking-wider">ENCRIPCIÓN RSA-4K</span>
               </div>
               <div className="w-1.5 h-1.5 bg-tema-matriz rounded-full animate-pulse shadow-[0_0_8px_var(--tema-matriz)]" />
               <span className="text-xs font-semibold text-tema-texto/50 uppercase tracking-wider">SISTEMA ACTIVO</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleSetRole = (role: AgentRole) => {
    handleUpdateProfile({ agentRole: role });
  };

  if (!profile?.agentRole) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-tema-negro">
        <HolographicBackground />
        <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
        
        <div className="relative text-center z-10 max-w-7xl px-12 w-full flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-48 h-48 mb-16 relative"
          >
             <div className="absolute inset-0 bg-tema-neon/20 rounded-full blur-[100px] animate-pulse" />
             <div className="relative w-full h-full border-[3px] border-tema-texto/80 rounded-full flex items-center justify-center bg-tema-negro shadow-[0_0_60px_rgba(3,154,220,0.4)]">
                <div className="text-center">
                   <h1 className="text-3xl font-bold text-tema-texto leading-none italic">HD</h1>
                   <p className="text-xs text-tema-texto/50 font-semibold tracking-wider uppercase mt-2">HEAVENLY DREAMS<br/>ENTERPRISE SYSTEMS</p>
                </div>
             </div>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight uppercase text-tema-texto leading-tight"
          >
            SELECCIONAR PROTOCOLO
          </motion.h2>
          <p className="text-tema-neon font-medium text-sm tracking-widest mb-16 uppercase opacity-80">
             DEFINICIÓN DE NÚCLEO OPERATIVO // v2.4 ENTERPRISE
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
            {[
              { role: 'hr', title: 'GERENCIA / ADMIN', desc: 'DIRECTIVA CENTRAL Y ACCESO TOTAL', icon: Crown, color: 'text-tema-neon' },
              { role: 'recruiter', title: 'SUPERVISOR NEURAL', desc: 'GESTIÓN DE FLUJO Y AUDITORÍA IA', icon: ShieldCheck, color: 'text-tema-neon' },
              { role: 'collections', title: 'ESPECIALISTA FRONT', desc: 'INTERFAZ DE VENTA Y CONVERSIÓN', icon: User, color: 'text-tema-neon' }
            ].map((r, i) => (
              <motion.button
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                key={r.role}
                onClick={() => handleSetRole(r.role as AgentRole)}
                className="group relative p-8 panel-de-vidrio hover:bg-tema-neon/5 transition-all duration-500 flex flex-col items-center gap-6 overflow-hidden border-l-4 border-l-transparent hover:border-l-tema-neon"
              >
                <div className="p-6 rounded-2xl bg-tema-negro/60 border border-tema-electrico/10 group-hover:border-tema-neon/30 transition-all group-hover:scale-110 shadow-inner">
                   <r.icon size={40} className={cn(r.color, "transition-all group-hover:drop-shadow-[0_0_15px_var(--tema-neon)]")} />
                </div>
                <div className="relative z-10 mt-2">
                   <h3 className="text-xl font-bold text-tema-texto mb-2 tracking-tight group-hover:text-tema-neon transition-colors uppercase leading-tight">{r.title}</h3>
                   <p className="text-xs text-tema-neon font-medium tracking-wide uppercase opacity-60 group-hover:opacity-100 transition-opacity leading-relaxed">{r.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-bg text-gray-100 font-sans overflow-hidden relative">
      <HolographicBackground />
      {/* Sidebar */}
      <div className="w-[280px] h-full flex flex-col z-20 border-r border-border-color bg-brand-bg/80 backdrop-blur-md">
         <div className="p-6 relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-transparent flex items-center justify-center overflow-hidden">
                 <img src="/logo.png" alt="HD Logo" className="w-full h-full object-contain drop-shadow-md" onError={(e) => {
                   (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMyNUQzNjYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTEuNWF2MjJhLjUgMS41IDAgMCAxLTEuNSAxLjVINy41QTEuNSAxLjUgMCAwIDEgNiAyM1Y4LjVBMS41IDEuNSAwIDAgMSA3LjUgN2g1LjVMMjEgMTEuNXoiLz48cGF0aCBkPSJNMjEgMTEuNWgtNS41VjciLz48L3N2Zz4=';
                 }}/>
              </div>
              <div>
                 <h1 className="text-lg font-bold text-text-main leading-tight">WhatsApp</h1>
                 <p className="text-xs text-[#25D366] uppercase tracking-wide font-medium">Business Platform</p>
              </div>
            </div>
            <button className="text-gray-500 hover:text-text-main transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 4H19V20H15M9 4H5V20H9M15 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
         </div>

         <div className="flex-1 overflow-y-auto py-4 px-4 hide-scrollbar">
            <div className="space-y-1">
               {[
                 { id: 'chat', label: 'Inicio', icon: LayoutDashboard },
                 { id: 'crm', label: 'Contactos', icon: Users },
                 { id: 'tags', label: 'Gestión de Etiquetas', icon: Zap, isSubmenu: true },
                 { id: 'blacklist', label: 'Lista negra', icon: ShieldCheck, isSubmenu: true },
                 { id: 'conversations', label: 'Gestión de Conversaciones', icon: MessageSquare },
                 { id: 'analytics', label: 'Analytics', icon: Activity },
                 { id: 'integrations', label: 'Centro de Integración', icon: Blocks },
                 { id: 'templates', label: 'Plantillas', icon: FileJson },
                 { id: 'api_keys', label: 'Claves API', icon: Key },
                 { id: 'protocols', label: 'Protocolos IA', icon: Terminal },
                 { id: 'settings', label: 'Configuración', icon: Settings, action: () => setIsSettingsOpen(true) },
               ].map((item: any) => {
                 const isActive = activeView === item.id;
                 return (
                   <button 
                     key={item.id}
                     onClick={() => {
                        if (item.action) item.action();
                        else setActiveView(item.id as any);
                     }}
                     className={cn(
                       "w-full flex items-center justify-between py-3 rounded-xl transition-all font-medium text-sm group",
                       item.isSubmenu ? "pl-12 pr-4" : "px-4",
                       isActive
                         ? "bg-[#25D366]/20 text-[#25D366]" 
                         : "text-gray-400 hover:text-text-main hover:bg-brand-surface/50"
                     )}
                   >
                     <div className="flex items-center gap-3">
                       <item.icon size={18} className={isActive ? "text-[#25D366]" : "text-gray-500 group-hover:text-gray-300"} />
                       <span>{item.label}</span>
                     </div>
                     {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#25D366] shadow-[0_0_8px_#25D366]" />}
                   </button>
                 );
               })}
            </div>
         </div>

         <div className="p-6 mt-auto">
            <div className="flex items-center justify-between border-t border-border-color pt-6">
              <div className="flex items-center gap-3">
                <Avatar src={user.photoURL} name={user.displayName} size="sm" />
                <div>
                   <p className="text-sm font-semibold text-text-main">{user.displayName}</p>
                   <p className="text-xs text-[#00b4d8] uppercase font-medium mt-0.5">Superuser</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a2235] transition-colors text-gray-400">
                  <Sun size={16} />
                </button>
              </div>
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-0 overflow-y-auto hide-scrollbar bg-transparent">
        
        {/* Subtle network background effect */}
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(0, 180, 216, 0.03) 0%, transparent 70%)'}}></div>
        {/* Universal Header */}
        <div className="h-[100px] flex items-center justify-between px-10 border-b border-border-color bg-brand-bg/80 backdrop-blur-3xl relative z-30 shadow-xl">
           <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveView('chat')}
                className="flex items-center gap-2 text-xs font-semibold text-[#00b4d8] hover:text-text-main bg-[#00b4d8]/5 hover:bg-[#00b4d8] px-5 py-2.5 border border-[#00b4d8]/30 rounded-xl transition-all tracking-wide uppercase panel-de-vidrio active:scale-95 shadow-sm group"
              >
                 <ChevronLeft size={16} className="group-hover:-translate-x-1 group-hover:text-[#090e17] transition-transform" /> 
                 <span className="group-hover:text-[#090e17] transition-colors">PORTAL</span>
              </button>
              <div className="relative w-full max-w-[400px] group">
                 <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00b4d8]/60 group-focus-within:text-[#00b4d8] group-focus-within:scale-110 transition-transform" />
                 <input 
                  type="text" 
                  placeholder="Buscar candidatos, agentes..."
                  className="w-full bg-brand-bg border border-border-color rounded-xl py-2.5 pl-12 pr-4 text-sm text-text-main placeholder:text-text-main/40 focus:outline-none focus:border-[#00b4d8] transition-all shadow-inner"
                 />
              </div>
           </div>
           
           <div className="flex items-center gap-10">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-14 h-14 panel-de-vidrio flex items-center justify-center rounded-2xl border-border-color text-text-main/40 hover:text-[#00b4d8] transition-all group"
              >
                 <Sun size={24} className={cn("transition-all duration-500", !isDarkMode && "rotate-180 text-[#00b4d8]")} />
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-14 h-14 panel-de-vidrio flex items-center justify-center rounded-2xl border-border-color text-text-main/40 hover:text-[#00b4d8] transition-all group"
              >
                 <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
              </button>
              <div className="flex items-center gap-4 p-2 pr-5 bg-brand-bg border border-border-color rounded-full shadow-inner">
                <Avatar src={user.photoURL} name={user.displayName} size="md" status="online" className="w-9 h-9 border border-[#00d588]/30 shadow-[0_0_10px_rgba(0,213,136,0.1)]" />
                <div>
                   <p className="text-sm font-semibold text-text-main tracking-tight">{user.displayName}</p>
                   <p className="text-xs text-[#00d588] font-medium tracking-wide mt-0.5">ONLINE</p>
                </div>
              </div>
           </div>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeView === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="h-full flex flex-col p-10 overflow-y-auto ocultar-barra-desplazamiento"
              >
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-text-main flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#00b4d8]/10 border border-[#00b4d8]/30 flex items-center justify-center">
                        <LayoutDashboard size={20} className="text-[#00b4d8]" />
                      </div>
                      <span>Inicio</span>
                    </h2>
                  </div>
                  <button className="flex items-center gap-2 bg-[#064e3b]/30 border border-[#059669] text-[#10b981] px-4 py-2 rounded-lg text-sm font-medium">
                    <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                    Open WhatsApp Web
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left Column */}
                  <div className="xl:col-span-2 space-y-6">
                    {/* Acciones Rápidas */}
                    <div className="bg-brand-surface/60 border border-border-color rounded-xl p-6">
                      <h3 className="text-lg font-bold text-text-main mb-6">Acciones rápidas</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {[
                           { id: 'crm', title: 'Contactos', icon: Users, desc: 'Gestiona a todos tus clientes en un solo lugar.', color: '#3b82f6' },
                           { id: 'conversations', title: 'Conversaciones', icon: MessageSquare, desc: 'Gestiona todas tus conversaciones en un solo lugar.', color: '#8b5cf6' },
                           { id: 'integrations', title: 'Integración', icon: Blocks, desc: 'Conéctese a las herramientas que ya utiliza.', color: '#f59e0b' },
                           { id: 'templates', title: 'Centro de plantillas', icon: FileJson, desc: 'Crear, gestionar y compartir plantillas de mensajes.', color: '#3b82f6' },
                           { id: 'analytics', title: 'Análisis', icon: Activity, desc: 'Obtén perspectivas detalladas sobre tu desempeño.', color: '#10b981' },
                           { id: 'settings', title: 'Configuración', icon: Settings, desc: 'Gestiona tu equipo y configura tus ajustes.', color: '#f97316' },
                         ].map(action => (
                           <button 
                             key={action.id}
                             onClick={() => setActiveView(action.id as any)}
                             className="p-5 rounded-xl border border-border-color hover:border-[#00b4d8]/50 bg-brand-bg/40 hover:bg-brand-surface transition-all text-left group flex flex-col gap-3"
                           >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-opacity-10 flex items-center justify-center" style={{ backgroundColor: `${action.color}20`, color: action.color }}>
                                  <action.icon size={20} />
                                </div>
                                <h4 className="text-sm font-semibold text-text-main group-hover:text-[#00b4d8] transition-colors">{action.title}</h4>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed max-w-[90%]">{action.desc}</p>
                           </button>
                         ))}
                      </div>
                    </div>

                    {/* Actividades clave */}
                    <div className="bg-brand-surface/60 border border-border-color rounded-xl p-6 min-h-[300px] flex flex-col">
                      <h3 className="text-lg font-bold text-text-main mb-6">Actividades clave</h3>
                      <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                        <Database size={48} className="mb-4 text-gray-500" />
                        <p className="text-sm font-medium text-gray-400">No hay datos</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                     {/* Workspace & Team */}
                     <div className="bg-brand-surface/60 border border-border-color rounded-xl p-6">
                       <div className="flex items-center gap-4 mb-6">
                         <div className="w-12 h-12 rounded-lg bg-[#34d399]/20 text-[#34d399] font-bold text-xl flex items-center justify-center">
                           M
                         </div>
                         <div>
                            <h3 className="text-text-main font-bold flex items-center gap-2">My Workspace <User size={14} className="text-gray-400" /></h3>
                            <p className="text-xs text-gray-400 mt-1">{user.email || 'usuario@dominio.com'}</p>
                         </div>
                       </div>
                       
                       <div className="space-y-4 mb-8">
                         <div className="flex justify-between items-center text-sm">
                           <span className="text-gray-400">Plan actual :</span>
                           <span className="bg-[#10b981]/20 text-[#10b981] px-2.5 py-0.5 rounded text-xs font-semibold">Free</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                           <span className="text-gray-400">Fecha de vencimiento :</span>
                           <span className="text-text-main font-medium">Vida</span>
                         </div>
                         <div className="flex items-center text-xs text-[#00b4d8] hover:underline cursor-pointer">
                           Facturación y pago ↗
                         </div>
                       </div>

                       <div className="border-t border-border-color pt-6">
                         <div className="flex items-center justify-between mb-4">
                           <h4 className="text-sm font-bold text-text-main">Miembros del equipo <span className="text-gray-500 font-normal ml-1">(1/3)</span></h4>
                           <button className="text-xs text-[#10b981] hover:text-[#34d399] font-medium">+ Invitar</button>
                         </div>
                         <div className="flex gap-2">
                            <div className="w-10 h-10 rounded-lg bg-[#34d399]/20 text-[#34d399] font-bold text-sm flex items-center justify-center">
                              {user.displayName?.[0] || 'U'}
                            </div>
                         </div>
                       </div>
                     </div>

                     {/* Tutorial */}
                     <div className="bg-brand-surface/60 border border-border-color rounded-xl p-6">
                       <h3 className="text-lg font-bold text-text-main mb-6">Tutorial</h3>
                       <div className="space-y-4">
                         {[
                           '¿Cómo invitar a mi equipo?',
                           '¿Cómo respaldar mis conversaciones?',
                           '¿Puedo ver todos mis contactos en un formato de Kanban?',
                           '¿Cómo asignar contactos a mi equipo?',
                           '¿Cómo crear una etiqueta para mis contactos?'
                         ].map((q, i) => (
                           <div key={i} className="text-sm text-[#10b981] hover:text-[#34d399] cursor-pointer border-b border-border-color pb-4 last:border-0 last:pb-0">
                             {q}
                           </div>
                         ))}
                       </div>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Other Views Updated to fit the layout */}
            {activeView === 'crm' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                 <CRMView userId={user.uid} />
              </motion.div>
            )}

            {activeView === 'tags' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                 <TagsView />
              </motion.div>
            )}

            {activeView === 'blacklist' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                 <BlacklistView />
              </motion.div>
            )}

            {activeView === 'conversations' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                 <ConversationsView />
              </motion.div>
            )}

            {activeView === 'templates' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                 <TemplatesView />
              </motion.div>
            )}

            {activeView === 'workflows' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                 <WorkflowView userId={user.uid} />
              </motion.div>
            )}

            {activeView === 'api_keys' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                 <APIKeysView userId={user.uid} />
              </motion.div>
            )}

            {activeView === 'integrations' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                 <IntegrationsView 
                   userId={user.uid} 
                   onViewStats={(service) => {
                     if (service === 'meta_ads') setActiveView('meta_ads_stats');
                   }}
                 />
              </motion.div>
            )}

            {activeView === 'meta_ads_stats' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                 <MetaAdsDashboard onClose={() => setActiveView('integrations')} />
              </motion.div>
            )}

            {activeView === 'delinquent' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                 <CRMView userId={user.uid} initialFilter="delinquent" />
              </motion.div>
            )}

            {activeView === 'protocols' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                 <ProtocolConfigView userId={user.uid} />
              </motion.div>
            )}

            {activeView === 'support' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                 <SupportTicketsView userId={user.uid} />
              </motion.div>
            )}

            {(activeView === 'consult' || activeView === 'contracts' || activeView === 'payroll') && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex items-center justify-center">
                 <div className="text-center">
                    <Cpu size={64} className="mx-auto mb-6 text-neon opacity-20 animate-pulse" />
                    <h3 className="text-2xl font-bold text-text-main/40 uppercase tracking-widest">Módulo en Desarrollo</h3>
                    <p className="text-[10px] text-neon/30 font-mono mt-4 tracking-widest uppercase">Protocolo pendiente de activación por Comando Central</p>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Global Settings Modal Overlay */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-0 bg-tema-negro/95 backdrop-blur-3xl z-50 flex flex-col"
          >
            <div className="h-[200px] flex items-center px-20 border-b border-tema-electrico/10 bg-tema-negro/60 relative overflow-hidden">
              <div className="absolute inset-0 grid-bg opacity-10" />
              <div className="flex items-center justify-between w-full max-w-7xl mx-auto relative z-10">
                 <div className="flex items-center gap-10">
                    <button 
                      onClick={() => setIsSettingsOpen(false)} 
                      className="p-5 panel-de-vidrio text-tema-texto/40 hover:text-tema-neon hover:border-tema-neon/30 transition-all active:scale-90"
                    >
                      <ChevronLeft size={36} />
                    </button>
                    <div>
                      <div className="flex items-center gap-6 mb-4">
                        <CyberIcon color="var(--tema-neon)" size="lg"><Settings size={40} /></CyberIcon>
                        <h2 className="text-5xl font-bold text-tema-texto tracking-tighter uppercase whitespace-nowrap leading-none">AJUSTES_MODULARES</h2>
                      </div>
                      <p className="text-xs text-tema-neon font-bold tracking-widest uppercase opacity-40">Anulación de parámetros del núcleo activada // v2.4 Ent.</p>
                    </div>
                 </div>
                 <div className="text-right hidden sm:block p-8 bg-tema-negro border border-tema-electrico/10 rounded-3xl">
                    <p className="text-[10px] text-tema-texto/30 font-bold tracking-widest uppercase mb-2">STATUS: AGENT_CONFIG_MODE</p>
                    <p className="text-xs text-tema-neon font-bold font-mono truncate tracking-tight">UID_{user.uid.slice(0, 16)}</p>
                 </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-20 ocultar-barra-desplazamiento">
              <div className="max-w-7xl mx-auto space-y-20">
                  {/* Agent Identity & Tone */}
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="flex items-center gap-6">
                        <div className="w-1.5 h-8 bg-tema-neon shadow-[0_0_15px_var(--tema-neon)] rounded-full" />
                        <h3 className="text-tema-texto text-sm font-bold uppercase tracking-widest">Identidad Neural</h3>
                      </div>
                      <div className="panel-de-vidrio p-10 group hover:border-tema-neon/20 transition-all">
                         <label className="text-[10px] text-tema-texto/30 font-bold tracking-wider block mb-4 uppercase">Alias de Protocolo</label>
                         <input 
                           type="text"
                           value={profile?.agentName || ''}
                           onChange={(e) => setProfile(prev => prev ? { ...prev, agentName: e.target.value } : null)}
                           className="w-full bg-tema-negro/60 border border-tema-electrico/10 p-5 rounded-2xl text-sm font-bold text-tema-texto focus:border-tema-neon focus:outline-none transition-all uppercase tracking-wider"
                           placeholder="INTRODUCIR ALIAS..."
                         />
                      </div>
                    </div>
                    <div className="space-y-8">
                      <div className="flex items-center gap-6">
                        <div className="w-1.5 h-8 bg-tema-neon shadow-[0_0_15px_var(--tema-neon)] rounded-full" />
                        <h3 className="text-tema-texto text-sm font-bold uppercase tracking-widest">Frecuencia de Voz</h3>
                      </div>
                      <div className="panel-de-vidrio p-10 group hover:border-tema-neon/20 transition-all">
                         <label className="text-[10px] text-tema-texto/30 font-bold tracking-wider block mb-4 uppercase">Módulo de Síntesis</label>
                         <div className="relative">
                           <select 
                             value={profile?.agentTone || 'professional'}
                             onChange={(e) => setProfile(prev => prev ? { ...prev, agentTone: e.target.value } : null)}
                             className="w-full bg-tema-negro/60 border border-tema-electrico/10 p-5 pr-12 rounded-2xl text-sm font-bold text-tema-texto focus:border-tema-neon focus:outline-none appearance-none cursor-pointer uppercase tracking-tight"
                           >
                             <option value="professional">NEO-PROFESIONAL / EFICIENTE</option>
                             <option value="friendly">ORGÁNICO / CUALITATIVO</option>
                             <option value="formal">ESTRUCTURAL / PROTOCOLAR</option>
                             <option value="persuasive">DINÁMICO / PERSUASIVO</option>
                             <option value="empathetic">NEURAL / EMPÁTICO</option>
                           </select>
                           <ChevronLeft className="-rotate-90 absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-tema-neon/40" size={20} />
                         </div>
                      </div>
                    </div>
                  </section>
                  {/* Message Templates */}
                  <section>
                    <div className="flex justify-between items-center mb-10">
                      <div className="flex items-center gap-6">
                        <div className="w-1.5 h-8 bg-tema-neon shadow-[0_0_15px_var(--tema-neon)] rounded-full" />
                        <h3 className="text-tema-texto text-sm font-bold uppercase tracking-widest">Macros de Respuesta</h3>
                      </div>
                      <Button onClick={() => {
                        const newTemplate = { id: Date.now().toString(), title: 'NUEVO_PROTOCOLO', content: '' };
                        setProfile(prev => prev ? { ...prev, templates: [...(prev.templates || []), newTemplate] } : null);
                      }}>+ AGREGAR MACRO</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {profile?.templates?.map((t, idx) => (
                        <div key={t.id} className="panel-de-vidrio p-10 relative group hover:border-tema-neon/20 transition-all">
                          <input 
                            type="text"
                            value={t.title}
                            onChange={(e) => {
                              const newTemplates = [...(profile.templates || [])];
                              newTemplates[idx].title = e.target.value;
                              setProfile(prev => prev ? { ...prev, templates: newTemplates } : null);
                            }}
                            className="bg-transparent text-sm font-bold w-full mb-6 focus:outline-none text-tema-neon uppercase tracking-tighter"
                            placeholder="TÍTULO DE MACRO..."
                          />
                          <textarea 
                            value={t.content}
                            onChange={(e) => {
                              const newTemplates = [...(profile.templates || [])];
                              newTemplates[idx].content = e.target.value;
                              setProfile(prev => prev ? { ...prev, templates: newTemplates } : null);
                            }}
                            className="w-full p-5 bg-tema-negro/40 border border-tema-electrico/10 rounded-2xl text-xs font-medium tracking-wide focus:border-tema-neon focus:outline-none min-h-[120px] text-tema-texto/70"
                            placeholder="INTRODUCIR CONTENIDO DE TRANSMISIÓN..."
                          />
                          <button 
                            onClick={() => {
                              const newTemplates = profile.templates?.filter(temp => temp.id !== t.id);
                              setProfile(prev => prev ? { ...prev, templates: newTemplates } : null);
                            }}
                            className="absolute top-6 right-6 text-tema-texto/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-500/10 rounded-lg"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Select Role */}
                  <section>
                    <div className="flex items-center gap-6 mb-10">
                      <div className="w-1.5 h-8 bg-tema-neon shadow-[0_0_15px_var(--tema-neon)] rounded-full" />
                      <h3 className="text-tema-texto text-sm font-bold uppercase tracking-widest">Especialización de Núcleo Lógico</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {(['recruiter', 'follow-up', 'customer-service', 'hr', 'collections'] as AgentRole[]).map(r => (
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          key={r}
                          onClick={() => handleUpdateProfile({ agentRole: r })}
                          className={cn(
                            "relative p-8 rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer group panel-de-vidrio overflow-hidden",
                            profile?.agentRole === r 
                              ? "bg-tema-neon/15 border-tema-neon shadow-[0_0_30px_rgba(3,154,220,0.2)]" 
                              : "bg-tema-negro/40 border-tema-electrico/10 hover:border-tema-electrico/30"
                          )}
                        >
                          <div className={cn(
                            "mb-6 p-5 rounded-[1.5rem] inline-block transition-all",
                            profile?.agentRole === r ? "bg-tema-neon text-tema-negro shadow-lg" : "bg-tema-electrico/10 text-tema-texto/30 group-hover:text-tema-neon"
                          )}>
                            {r === 'recruiter' && <Users size={32} />}
                            {r === 'follow-up' && <Bell size={32} />}
                            {r === 'customer-service' && <MessageSquare size={32} />}
                            {r === 'hr' && <ShieldCheck size={32} />}
                            {r === 'collections' && <CreditCard size={32} />}
                          </div>
                          <h4 className={cn(
                            "font-bold tracking-tighter uppercase text-base transition-colors mb-3 leading-none",
                            profile?.agentRole === r ? "text-tema-neon" : "text-tema-texto group-hover:text-tema-neon"
                          )}>{r === 'recruiter' ? 'NÚCLEO RECLUTADOR' : r === 'follow-up' ? 'NÚCLEO SEGUIMIENTO' : r === 'customer-service' ? 'NÚCLEO ASISTENCIA' : r === 'hr' ? 'NÚCLEO CORPORATIVO' : 'GESTOR DE MOROSIDAD'}</h4>
                          <p className="text-[10px] text-tema-texto/30 font-bold tracking-tight leading-relaxed uppercase">
                             Despliegue operativo {r} / protocolo neural activo.
                          </p>
                          {profile?.agentRole === r && (
                            <div className="absolute top-6 right-6 text-tema-neon">
                               <Activity size={20} className="animate-pulse" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </section>

                  {/* Knowledge Base */}
                  <section>
                    <div className="flex items-center gap-6 mb-10">
                      <div className="w-1.5 h-8 bg-tema-neon shadow-[0_0_15px_var(--tema-neon)] rounded-full" />
                      <h3 className="text-tema-texto text-sm font-bold uppercase tracking-widest">Base de Conocimiento Corporativo</h3>
                    </div>
                    <div className="panel-de-vidrio p-12 relative overflow-hidden bg-tema-negro/40">
                      <div className="absolute top-0 right-0 p-6 font-bold text-[9px] text-tema-neon/20 uppercase tracking-widest font-mono">NEURAL_EDITOR v9.4_KNOWLEDGE</div>
                      <p className="text-xs text-tema-texto/30 mb-10 font-bold leading-relaxed uppercase tracking-widest max-w-2xl">
                        Configure los parámetros de inteligencia estratégica. El agente procesará esta información mediante el núcleo Gemini 1.5 para la toma de decisiones autónoma.
                      </p>
                      <textarea 
                        className="w-full h-72 p-10 bg-tema-negro/80 border border-tema-electrico/20 rounded-3xl text-sm font-medium text-tema-texto placeholder:text-tema-texto/10 focus:border-tema-neon focus:ring-4 focus:ring-tema-neon/5 focus:outline-none transition-all font-mono scrollbar-hide uppercase tracking-tight"
                        value={profile?.knowledgeBase || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, knowledgeBase: e.target.value } : null)}
                        placeholder="// INICIAR CARGA DE DATOS ESTRATÉGICOS..."
                      />
                      <div className="flex justify-end mt-12 gap-8">
                        <button 
                          onClick={() => setIsSettingsOpen(false)}
                          className="px-8 py-4 text-[10px] font-bold tracking-widest text-tema-texto/40 hover:text-tema-texto transition-all"
                        >
                          CANCELAR_OPERACIÓN
                        </button>
                        <Button onClick={() => handleUpdateProfile({ 
                          knowledgeBase: profile?.knowledgeBase,
                          agentName: profile?.agentName,
                          agentTone: profile?.agentTone,
                          templates: profile?.templates,
                          agentRole: profile?.agentRole
                        })}>
                           GUARDAR CONFIGURACIÓN ESTRUCTURAL
                        </Button>
                      </div>
                    </div>
                  </section>

                  <section className="panel-de-vidrio p-12 overflow-hidden relative group border-l-4 border-l-tema-neon">
                     <div className="absolute inset-0 grid-bg opacity-5 group-hover:opacity-10 transition-opacity" />
                     <div className="flex items-start gap-10 relative z-10">
                        <div className="bg-tema-neon/10 p-6 rounded-2xl text-tema-neon shadow-[0_0_30px_rgba(3,154,220,0.2)]">
                           <Globe size={48} className="animate-spin-slow" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-bold text-tema-texto mb-3 tracking-tighter uppercase leading-none">SINCRONIZACIÓN DE COMANDO GLOBAL</h3>
                           <p className="text-xs text-tema-texto/30 mb-8 font-bold uppercase tracking-widest max-w-xl leading-relaxed">
                               Nodo conectado al clúster de gestión Heaven Dreams SAS de CV. Telemetría estructural transmitida mediante túnel encriptado:
                           </p>
                           <div className="bg-tema-negro p-5 rounded-xl inline-flex items-center gap-4 border border-tema-electrico/10 group-hover:border-tema-neon/30 transition-all shadow-inner">
                              <div className="w-2 h-2 bg-tema-matriz rounded-full animate-pulse shadow-[0_0_8px_var(--tema-matriz)]" />
                              <span className="text-tema-neon font-bold font-mono text-xs tracking-wider uppercase">LINK_ESTABLE: hdreams.enterprise/admin_neural</span>
                           </div>
                        </div>
                     </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
}
