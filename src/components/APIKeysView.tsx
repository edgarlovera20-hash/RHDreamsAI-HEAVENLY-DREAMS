import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  AlertTriangle,
  Globe,
  RefreshCw,
  ExternalLink,
  Lock,
  X,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Button, Card, CyberIcon } from './UI';
import { cn, OperationType, handleFirestoreError } from '../lib/utils';
import { format } from 'date-fns';

interface APIKey {
  id: string;
  name: string;
  key: string;
  status: 'active' | 'revoked';
  createdAt: any;
  lastUsed?: any;
}

interface APIKeysViewProps {
  userId: string;
}

export const APIKeysView: React.FC<APIKeysViewProps> = ({ userId }) => {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users', userId, 'api_keys'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setKeys(snap.docs.map(d => ({ id: d.id, ...d.data() } as APIKey)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/api_keys`));
  }, [userId]);

  const generateKey = async () => {
    if (!newName) return;
    
    // Simple key generation simulation
    const randomKey = `neural_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    
    try {
      await addDoc(collection(db, 'users', userId, 'api_keys'), {
        name: newName,
        key: randomKey,
        status: 'active',
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE);
    }
  };

  const revokeKey = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', userId, 'api_keys', id), {
        status: currentStatus === 'active' ? 'revoked' : 'active'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta clave? Las aplicaciones vinculadas perderán el acceso.")) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'api_keys', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-tema-negro/40 backdrop-blur-xl overflow-hidden relative">
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      
      {/* Header */}
      <div className="p-8 border-b border-tema-electrico/10 bg-tema-negro/60 flex items-center justify-between relative z-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <CyberIcon color="var(--tema-neon)" size="lg"><Key size={28} /></CyberIcon>
            <h2 className="text-3xl font-bold text-tema-texto tracking-tight uppercase whitespace-nowrap leading-none">
              GESTIÓN DE CLAVES API
            </h2>
          </div>
          <p className="text-xs text-tema-neon font-semibold tracking-wide uppercase opacity-80 ml-12">Sincronización Segura // Enlace con Aplicaciones Externas</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="flex items-center gap-3 py-3 px-6 text-xs font-bold uppercase tracking-wide shadow-sm">
          <Plus size={16} /> GENERAR CLAVE
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-10 ocultar-barra-desplazamiento relative z-10">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Integration Banner */}
          <div className="bg-tema-neon/5 border border-tema-neon/20 p-10 rounded-3xl flex items-center gap-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-1000">
              <Globe size={180} className="text-tema-neon" />
            </div>
            <div className="relative z-10 space-y-4">
              <h3 className="text-xl font-bold text-tema-texto uppercase tracking-tight">ENDPOINT NEURAL CENTRAL</h3>
              <p className="text-sm text-tema-texto/80 leading-relaxed max-w-2xl font-medium">
                Usa estas claves para conectar tu CRM y Flujos con plataformas de terceros como Zapier, Slack o tu propio Backend. 
                Toda la telemetría enviada a <code className="bg-tema-negro/80 px-2.5 py-0.5 rounded-md text-tema-neon border border-tema-electrico/20 font-semibold">/v1/sync</code> será procesada por este agente inteligente.
              </p>
              <div className="flex gap-4 items-center">
                <Button variant="secondary" className="text-xs py-2 px-5 h-auto tracking-wide font-bold uppercase">LEER DOCUMENTACIÓN</Button>
                <div className="flex items-center gap-2 text-xs text-tema-neon/60 font-semibold uppercase tracking-wide">
                  <ShieldCheck size={16} /> ENCRIPTACIÓN CUÁNTICA ACTIVA
                </div>
              </div>
            </div>
          </div>

          {/* Keys List */}
          <div className="grid gap-6">
            <AnimatePresence mode="popLayout">
              {keys.map(k => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={k.id}
                >
                  <div className="p-8 panel-de-vidrio flex items-center gap-8 group relative overflow-hidden hover:border-tema-neon/30 transition-all">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500",
                      k.status === 'active' 
                        ? "bg-tema-neon/10 border-tema-neon/30 text-tema-neon shadow-[0_0_20px_rgba(3,154,220,0.1)] group-hover:shadow-[0_0_30px_rgba(3,154,220,0.2)]" 
                        : "bg-tema-texto/5 border-tema-texto/10 text-tema-texto/20"
                    )}>
                      <Key size={28} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-tema-texto tracking-tight uppercase">{k.name}</h4>
                        <span className={cn(
                          "text-[10px] px-2.5 py-0.5 rounded-md font-semibold uppercase tracking-wider border",
                          k.status === 'active' 
                            ? "bg-tema-matriz/10 text-tema-matriz border-tema-matriz/30 shadow-[0_0_10px_rgba(34,197,94,0.05)]" 
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        )}>
                          {k.status === 'active' ? 'ACTIVA' : 'REVOCADA'}
                        </span>
                      </div>
                      <div className="flex items-center gap-5">
                         <div className="flex items-center gap-3 bg-tema-negro/40 px-4 py-2 rounded-lg border border-tema-electrico/10 font-medium text-sm text-tema-texto/60 shadow-inner group/copy">
                            {copiedId === k.id ? <span className="text-tema-neon animate-pulse">CLAVE COPIADA AL PORTAPAPELES</span> : '••••••••••••••••••••••••••••••••'}
                            <button 
                              onClick={() => copyToClipboard(k.key, k.id)}
                              className="ml-2 text-tema-texto/30 hover:text-tema-neon transition-all hover:scale-110 active:scale-95"
                            >
                               {copiedId === k.id ? <CheckCircle2 size={16} className="text-tema-neon" /> : <Copy size={16} />}
                            </button>
                         </div>
                         <p className="text-xs text-tema-texto/40 font-semibold uppercase tracking-wide whitespace-nowrap">CREACIÓN: {k.createdAt ? format(k.createdAt.toDate(), 'dd/MM/yyyy') : '...'}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                       <Button 
                        variant="secondary" 
                        onClick={() => revokeKey(k.id, k.status)}
                        className="px-4 py-2 text-xs font-bold tracking-wide uppercase"
                       >
                         {k.status === 'active' ? 'REVOCAR' : 'ACTIVAR'}
                       </Button>
                       <button 
                         onClick={() => deleteKey(k.id)}
                         className="p-2 bg-red-500/5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 rounded-xl transition-all active:scale-90"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {keys.length === 0 && !isAdding && (
              <div className="p-16 text-center border-2 border-dashed border-tema-electrico/10 rounded-2xl bg-tema-negro/20 backdrop-blur-sm">
                 <Lock size={40} className="mx-auto mb-4 text-tema-texto/20" />
                 <p className="text-sm text-tema-texto/40 font-medium uppercase tracking-wide">No se han detectado claves de integración activas en este sector.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Key Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-tema-negro/80 backdrop-blur-2xl"
              onClick={() => setIsAdding(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 40, opacity: 0 }}
              className="max-w-xl w-full relative z-[110]"
            >
              <div className="panel-de-vidrio p-12 relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-0 grid-bg opacity-10" />
                <button 
                  onClick={() => setIsAdding(false)}
                  className="absolute top-8 right-8 text-tema-texto/20 hover:text-tema-neon transition-all hover:scale-110 active:scale-90 p-2"
                >
                  <X size={28} />
                </button>

                <div className="flex items-center gap-4 mb-8">
                   <CyberIcon color="var(--tema-neon)" size="lg"><Plus size={24} /></CyberIcon>
                   <h3 className="text-2xl font-bold text-tema-texto tracking-tight uppercase whitespace-nowrap">NUEVA CREDENCIAL</h3>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-tema-neon uppercase tracking-wider ml-1">Identificador de Aplicación</label>
                    <input 
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ej: Integración Página Web Principal"
                      className="w-full bg-tema-negro/60 border border-tema-electrico/20 p-5 rounded-2xl text-sm focus:border-tema-neon focus:outline-none transition-all text-tema-texto font-medium shadow-inner"
                    />
                    <p className="text-[10px] text-tema-texto/30 font-medium italic mt-2 ml-2">Asigne un nombre descriptivo para auditar el uso de esta clave.</p>
                  </div>
                  
                  <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex gap-5 text-red-400 group/alert">
                    <AlertTriangle size={24} className="shrink-0 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-2 shadow-inner">Aviso Crítico de Seguridad</p>
                      <p className="text-xs leading-relaxed opacity-80 font-medium">Nunca comparta esta clave en repositorios públicos o entornos inseguros. El acceso otorga privilegios de escritura neural sobre su cuenta central.</p>
                    </div>
                  </div>

                  <div className="flex gap-6 pt-6">
                    <Button variant="secondary" onClick={() => setIsAdding(false)} className="flex-1 py-5 text-xs font-bold tracking-widest uppercase">CANCELAR</Button>
                    <Button onClick={generateKey} className="flex-1 py-5 text-xs font-bold tracking-widest uppercase shadow-[0_0_40px_rgba(3,154,220,0.3)]">GENERAR ACCESO</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Decorative Blurs */}
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-tema-neon/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -left-40 w-96 h-96 bg-tema-electrico/5 blur-[150px] rounded-full pointer-events-none" />
    </div>
  );
};
