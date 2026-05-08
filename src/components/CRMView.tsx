import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Send, 
  Phone,
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ShieldAlert,
  ChevronDown,
  RefreshCw,
  Trash2,
  FileJson,
  X,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Button, Card, Avatar, CyberIcon } from './UI';
import { cn, OperationType, handleFirestoreError, isValidEmail, isValidPhone } from '../lib/utils';
import { format } from 'date-fns';

interface CRMClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'lead' | 'active' | 'delinquent' | 'closed';
  notes: string;
  updatedAt: any;
  syncedWithCentral: boolean;
}

interface CRMViewProps {
  userId: string;
  initialFilter?: CRMClient['status'];
}

export const CRMView: React.FC<CRMViewProps> = ({ userId, initialFilter }) => {
  const [clients, setClients] = useState<CRMClient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<CRMClient['status'] | 'all'>(initialFilter || 'all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<CRMClient | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newClient, setNewClient] = useState<Partial<CRMClient>>({
    status: 'lead',
    syncedWithCentral: false,
    phone: '',
    email: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query(collection(db, 'users', userId, 'crm_clients'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as CRMClient)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/crm_clients`));
  }, [userId]);

  const validateForm = (data: Partial<CRMClient>) => {
    const errors: Record<string, string> = {};
    if (!data.name?.trim()) errors.name = "El nombre es obligatorio.";
    if (data.email && !isValidEmail(data.email)) errors.email = "Email inválido.";
    if (data.phone && !isValidPhone(data.phone)) errors.phone = "Teléfono inválido (mínimo 7 dígitos).";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(newClient)) return;

    try {
      if (editingClient) {
        await updateDoc(doc(db, 'users', userId, 'crm_clients', editingClient.id), {
          ...newClient,
          updatedAt: serverTimestamp(),
          syncedWithCentral: false
        });
        setEditingClient(null);
      } else {
        await addDoc(collection(db, 'users', userId, 'crm_clients'), {
          ...newClient,
          updatedAt: serverTimestamp(),
        });
        setIsAdding(false);
      }
      setNewClient({ status: 'lead', syncedWithCentral: false, email: '', phone: '' });
      setValidationErrors({});
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE);
    }
  };

  const openEditModal = (client: CRMClient) => {
    setEditingClient(client);
    setNewClient({
      name: client.name,
      email: client.email,
      phone: client.phone,
      status: client.status,
      notes: client.notes,
      syncedWithCentral: client.syncedWithCentral
    });
    setValidationErrors({});
  };

  const handleUpdateStatus = async (clientId: string, status: CRMClient['status']) => {
    try {
      await updateDoc(doc(db, 'users', userId, 'crm_clients', clientId), {
        status,
        updatedAt: serverTimestamp(),
        syncedWithCentral: false
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE);
    }
  };

  const syncWithCentral = async (client?: CRMClient) => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      if (client) {
        await updateDoc(doc(db, 'users', userId, 'crm_clients', client.id), {
          syncedWithCentral: true,
          updatedAt: serverTimestamp()
        });
      } else {
        const batch = clients.filter(c => !c.syncedWithCentral);
        for (const c of batch) {
          await updateDoc(doc(db, 'users', userId, 'crm_clients', c.id), {
            syncedWithCentral: true,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE);
    } finally {
      setIsSyncing(false);
    }
  };

  const receiveFromCentral = async () => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockDelinquents = [
      { name: "Nebula Corp", status: "delinquent", notes: "Saldo vencido: $5000", email: "info@nebula.ai", phone: "+1 234 567" },
      { name: "CyberDyne Systems", status: "delinquent", notes: "Retraso en pago de servidores", email: "support@cyberdyne.jp", phone: "+81 99 887" }
    ];

    try {
      for (const c of mockDelinquents) {
        const exists = clients.find(existing => existing.name === c.name);
        if (!exists) {
            await addDoc(collection(db, 'users', userId, 'crm_clients'), {
                ...c,
                syncedWithCentral: true,
                updatedAt: serverTimestamp()
            });
        }
      }
    } catch (err) {
        handleFirestoreError(err, OperationType.CREATE);
    } finally {
        setIsSyncing(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-tema-negro/40 backdrop-blur-xl overflow-hidden relative">
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      
      {/* Header */}
      <div className="p-8 border-b border-tema-electrico/10 bg-tema-negro/60 flex items-center justify-between relative z-10">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <CyberIcon color="var(--tema-neon)" size="lg"><Users size={28} /></CyberIcon>
            <h2 className="text-3xl font-bold text-tema-texto tracking-tight uppercase whitespace-nowrap">
              CRM INTERACTIVO
            </h2>
          </div>
          <p className="text-xs text-tema-neon font-medium tracking-widest uppercase opacity-80 ml-12">Base de Datos Neural // Enlace Central de Clientes</p>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={receiveFromCentral} disabled={isSyncing} className="flex items-center gap-2 py-3 px-6 text-xs font-bold uppercase tracking-wide">
            <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} /> RECIBIR DE CENTRAL
          </Button>
          <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2 py-3 px-6 text-xs font-bold uppercase tracking-wide shadow-sm">
            <UserPlus size={14} /> AGREGAR CLIENTE
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col p-8 relative z-10">
        {/* Toolbar */}
        <div className="flex gap-6 mb-8">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search size={18} className="text-tema-texto/30 group-focus-within:text-tema-neon transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="BUSCAR CLIENTE EN LA RED..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-tema-negro/80 border border-tema-electrico/20 rounded-xl text-sm focus:outline-none focus:border-tema-neon transition-all text-tema-texto font-medium shadow-inner uppercase tracking-wider"
            />
          </div>
          <div className="flex items-center gap-3 bg-tema-negro/80 border border-tema-electrico/20 rounded-xl px-5 relative group">
            <Filter size={16} className="text-tema-texto/30" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-transparent py-3.5 focus:outline-none appearance-none cursor-pointer text-tema-texto/70 font-semibold text-xs uppercase tracking-wider outline-none pr-6"
            >
              <option value="all">TODOS</option>
              <option value="lead">LEADS</option>
              <option value="active">ACTIVOS</option>
              <option value="delinquent">MOROSIDAD</option>
            </select>
            <ChevronDown size={14} className="text-tema-texto/30 absolute right-4 pointer-events-none" />
          </div>
          <Button variant="primary" onClick={() => syncWithCentral()} disabled={isSyncing} className="flex items-center gap-3 py-3 px-6 text-xs font-bold uppercase tracking-wide">
            <Send size={16} /> SINCRONIZAR TODO
          </Button>
        </div>

        {/* Clients Grid */}
        <div className="flex-1 overflow-y-auto pr-2 ocultar-barra-desplazamiento">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredClients.map(client => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={client.id}
                >
                  <div className={cn(
                    "p-8 panel-de-vidrio h-full flex flex-col transition-all hover:scale-[1.02] cursor-pointer group relative overflow-hidden",
                    client.status === 'delinquent' ? "border-t-red-500 shadow-[0_0_25px_rgba(239,68,68,0.15)]" : 
                    client.status === 'active' ? "border-t-tema-neon shadow-[0_0_20px_rgba(3,154,220,0.1)]" : "border-t-tema-electrico/40"
                  )}>
                    <div className="absolute top-4 right-4 p-4 opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                        <MoreHorizontal size={24} className="text-tema-texto/40" />
                    </div>

                    <div className="flex items-center gap-5 mb-6">
                      <Avatar name={client.name} status={client.status === 'active' ? 'online' : 'offline'} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-bold text-tema-texto truncate leading-tight group-hover:text-tema-neon transition-colors uppercase tracking-tight">
                          {client.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {client.status === 'delinquent' ? (
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2.5 py-0.5 rounded-md border border-red-500/30 font-semibold uppercase tracking-wider">Moroso / Riesgo</span>
                          ) : (
                            <span className={cn(
                              "text-[10px] px-2.5 py-0.5 rounded-md border font-semibold uppercase tracking-wider",
                              client.status === 'active' ? "bg-tema-neon/20 text-tema-neon border-tema-neon/30" : "bg-tema-texto/10 text-tema-texto/40 border-tema-texto/20"
                            )}>
                              {client.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 text-sm font-medium" onClick={() => openEditModal(client)}>
                      <div className="flex items-center gap-3 text-tema-texto/70 hover:text-tema-texto transition-colors">
                         <CyberIcon color="var(--tema-neon)" className="opacity-50"><Mail size={14} /></CyberIcon>
                         <span className={cn("truncate", client.email && !isValidEmail(client.email) && "text-red-400")}>
                           {client.email || 'NO_DATA'}
                         </span>
                      </div>
                      <div className="flex items-center gap-3 text-tema-texto/70 hover:text-tema-texto transition-colors">
                         <CyberIcon color="var(--tema-neon)" className="opacity-50"><Phone size={14} /></CyberIcon>
                         <span className={cn(client.phone && !isValidPhone(client.phone) && "text-red-400")}>
                           {client.phone || 'NO_DATA'}
                         </span>
                      </div>
                      <div className="flex items-center gap-3 text-tema-texto/30">
                         <Clock size={16} />
                         <span className="font-bold text-[10px] uppercase tracking-widest">REG: {client.updatedAt ? format(client.updatedAt.toDate(), 'dd/MM/yy HH:mm') : 'PENDING'}</span>
                      </div>
                      <div className="mt-6 p-4 bg-tema-negro/40 rounded-xl border border-tema-electrico/10 italic text-xs text-tema-texto/50 leading-relaxed min-h-[60px]">
                        {client.notes || 'No se han registrado telemetrías adicionales para este perfil de usuario.'}
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-tema-electrico/10">
                      <div className="flex items-center gap-3">
                        {client.syncedWithCentral ? (
                          <div className="flex items-center gap-2 text-[10px] text-tema-matriz font-bold uppercase tracking-widest bg-tema-matriz/5 px-3 py-1 rounded-lg border border-tema-matriz/20">
                            <CheckCircle2 size={12} /> Sincronizado
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); syncWithCentral(client); }}
                            className="flex items-center gap-2 text-[10px] text-tema-texto/30 hover:text-tema-neon font-bold uppercase tracking-widest transition-all px-3 py-1"
                          >
                            <RefreshCw size={12} /> Desconectado
                          </button>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleUpdateStatus(client.id, client.status === 'delinquent' ? 'active' : 'delinquent')}
                          className={cn(
                            "p-3 rounded-xl border transition-all active:scale-90",
                            client.status === 'delinquent' ? "bg-tema-neon/10 border-tema-neon/30 text-tema-neon" : "bg-red-500/10 border-red-500/30 text-red-400"
                          )}
                        >
                          <ShieldAlert size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Add/Edit Client Modal */}
      <AnimatePresence>
        {(isAdding || editingClient) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-tema-negro/80 backdrop-blur-2xl"
              onClick={() => { setIsAdding(false); setEditingClient(null); }}
            />
            <motion.div 
              initial={{ scale: 0.9, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 40, opacity: 0 }}
              className="max-w-2xl w-full relative z-[110]"
            >
              <div className="panel-de-vidrio p-12 relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-0 grid-bg opacity-10" />
                <button 
                  onClick={() => { setIsAdding(false); setEditingClient(null); }}
                  className="absolute top-8 right-8 text-tema-texto/20 hover:text-tema-neon transition-all hover:scale-110 active:scale-90 p-2"
                >
                  <X size={28} />
                </button>

                <div className="flex items-center gap-6 mb-12">
                   <CyberIcon color="var(--tema-neon)" size="lg"><UserPlus size={28} /></CyberIcon>
                   <h3 className="text-3xl font-bold text-tema-texto tracking-tighter uppercase whitespace-nowrap">
                     {editingClient ? 'MODIFICAR REGISTRO' : 'PROTOCOLO NUEVO CLIENTE'}
                   </h3>
                </div>

                <form onSubmit={handleAddClient} className="space-y-8 relative z-10">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-tema-neon uppercase tracking-widest ml-2">Identidad Completa // UID</label>
                    <input 
                      type="text"
                      value={newClient.name || ''}
                      onChange={(e) => {
                        setNewClient({ ...newClient, name: e.target.value });
                        if (validationErrors.name) setValidationErrors(prev => ({ ...prev, name: '' }));
                      }}
                      placeholder="Ingrese nombre del contacto..."
                      className={cn(
                        "w-full bg-tema-negro/60 border p-5 rounded-2xl focus:border-tema-neon focus:outline-none transition-all text-tema-texto font-medium shadow-inner",
                        validationErrors.name ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-tema-electrico/20"
                      )}
                    />
                    {validationErrors.name && <p className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-widest ml-2">{validationErrors.name}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-tema-neon uppercase tracking-widest ml-2">Email de Contacto</label>
                      <input 
                        type="email"
                        value={newClient.email || ''}
                        onChange={(e) => {
                          setNewClient({ ...newClient, email: e.target.value });
                          if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: '' }));
                        }}
                        placeholder="email@dominio.ai"
                        className={cn(
                          "w-full bg-tema-negro/60 border p-5 rounded-2xl focus:border-tema-neon focus:outline-none transition-all text-tema-texto font-medium shadow-inner",
                          validationErrors.email ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-tema-electrico/20"
                        )}
                      />
                      {validationErrors.email && <p className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-widest ml-2">{validationErrors.email}</p>}
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-tema-neon uppercase tracking-widest ml-2">Terminal Telefónica</label>
                      <input 
                        type="text"
                        value={newClient.phone || ''}
                        onChange={(e) => {
                          setNewClient({ ...newClient, phone: e.target.value });
                          if (validationErrors.phone) setValidationErrors(prev => ({ ...prev, phone: '' }));
                        }}
                        placeholder="+54 9 11..."
                        className={cn(
                          "w-full bg-tema-negro/60 border p-5 rounded-2xl focus:border-tema-neon focus:outline-none transition-all text-tema-texto font-medium shadow-inner",
                          validationErrors.phone ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-tema-electrico/20"
                        )}
                      />
                      {validationErrors.phone && <p className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-widest ml-2">{validationErrors.phone}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-tema-neon uppercase tracking-widest ml-2">Estado de Sincronización</label>
                      <select 
                        value={newClient.status}
                        onChange={(e) => setNewClient({ ...newClient, status: e.target.value as any })}
                        className="w-full bg-tema-negro/60 border border-tema-electrico/20 p-5 rounded-2xl focus:border-tema-neon focus:outline-none transition-all appearance-none text-tema-texto font-bold text-xs uppercase tracking-widest shadow-inner cursor-pointer"
                      >
                        <option value="lead">Lead / Prospecto</option>
                        <option value="active">Activo / Operativo</option>
                        <option value="delinquent">Moroso / Riesgo</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                       <p className="text-[9px] text-tema-texto/20 font-bold uppercase tracking-wider leading-relaxed mb-1">
                         Aviso: Toda modificación es registrada permanentemente en el Ledger Central HDreams.
                       </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-tema-neon uppercase tracking-widest ml-2">Notas de Telemetría Aplicada</label>
                    <textarea 
                      value={newClient.notes || ''}
                      onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                      placeholder="Observaciones adicionales sobre el perfil..."
                      className="w-full bg-tema-negro/60 border border-tema-electrico/20 p-5 rounded-2xl focus:border-tema-neon focus:outline-none transition-all h-32 text-tema-texto font-medium shadow-inner resize-none"
                    />
                  </div>

                  <div className="flex gap-6 pt-6">
                    <Button variant="secondary" onClick={() => { setIsAdding(false); setEditingClient(null); }} className="flex-1 py-5 text-xs font-bold tracking-widest uppercase">CANCELAR</Button>
                    <Button type="submit" className="flex-1 py-5 text-xs font-bold tracking-widest uppercase shadow-[0_0_40px_rgba(3,154,220,0.3)]">
                      {editingClient ? 'APLICAR CAMBIOS' : 'ESTABLECER VÍNCULO'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
