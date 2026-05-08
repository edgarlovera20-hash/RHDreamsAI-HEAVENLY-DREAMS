import React, { useState } from 'react';
import { 
  Smartphone, 
  Plus, 
  Trash2, 
  RefreshCw,
  X,
  MessageCircle,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Button, CyberIcon } from './UI';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { WhatsAppConnector } from './WhatsAppConnector';

interface Integration {
  id: string;
  service: string;
  status: string;
  config?: any;
}

interface WhatsAppAccountsModalProps {
  userId: string;
  accounts: Integration[];
  onClose: () => void;
}

export const WhatsAppAccountsModal: React.FC<WhatsAppAccountsModalProps> = ({ userId, accounts, onClose }) => {
  const [showConnector, setShowConnector] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDisconnect = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, 'users', userId, 'integrations', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-tema-negro/95 backdrop-blur-3xl z-[150] flex items-center justify-center p-8"
    >
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      
      <div className="max-w-4xl w-full relative z-10">
        <button 
          onClick={onClose}
          className="absolute -top-16 right-0 p-3 text-tema-texto/20 hover:text-tema-neon transition-all hover:scale-110 active:scale-95"
        >
          <X size={32} />
        </button>

        <div className="panel-de-vidrio overflow-hidden shadow-[0_0_100px_rgba(3,154,220,0.2)] p-10 relative">
          <div className="flex items-center justify-between mb-10 pb-8 border-b border-tema-electrico/10">
            <div className="flex items-center gap-6">
              <CyberIcon color="#10b981" size="lg">
                <MessageCircle size={32} />
              </CyberIcon>
              <div>
                <h2 className="text-3xl font-bold text-tema-texto tracking-tight uppercase">Cuentas Vinculadas</h2>
                <p className="text-xs text-tema-neon font-semibold tracking-wider mt-2 uppercase opacity-80">
                  Gestión Multicuenta de WhatsApp
                </p>
              </div>
            </div>
            <Button onClick={() => setShowConnector(true)} className="flex items-center gap-3">
               AÑADIR CUENTA <Plus size={18} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto ocultar-barra-desplazamiento pr-2">
            <AnimatePresence>
              {accounts.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="col-span-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-tema-electrico/20 rounded-2xl bg-tema-texto/5"
                >
                  <AlertCircle size={48} className="text-tema-texto/30 mb-4" />
                  <p className="text-tema-texto/50 font-medium tracking-wide uppercase">No hay cuentas conectadas</p>
                  <p className="text-sm tracking-wide text-tema-texto/30 mt-2">Vincule un dispositivo para comenzar a enrutar mensajes hacia la central</p>
                </motion.div>
              ) : (
                accounts.map((acc, index) => (
                  <motion.div
                    key={acc.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 rounded-2xl bg-tema-negro/60 border border-tema-electrico/20 relative group hover:border-[#25D366]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center">
                          <Smartphone size={24} className="text-[#25D366]" />
                        </div>
                        <div>
                          <h4 className="font-bold text-tema-texto">{acc.config?.deviceName || 'Terminal Desconocida'}</h4>
                          <p className="text-xs font-mono text-tema-texto/50 mt-1">{acc.config?.phoneNumber || 'No phone number'}</p>
                        </div>
                      </div>
                      
                      {acc.status === 'connected' ? (
                        <div className="flex items-center gap-2 text-[10px] text-tema-matriz font-bold uppercase bg-tema-matriz/10 border border-tema-matriz/20 px-2 py-1 rounded tracking-wider">
                          <CheckCircle2 size={10} className="animate-pulse" /> Activa
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] text-tema-texto/30 font-bold uppercase bg-tema-texto/5 border border-tema-texto/10 px-2 py-1 rounded tracking-wider">
                          <Activity size={10} /> Inactiva
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-tema-electrico/10 pt-4 mt-4">
                      <div className="text-[10px] text-tema-texto/40 font-mono">
                        ID: {acc.id.substring(0, 16)}...
                      </div>
                      
                      <button 
                        onClick={() => handleDisconnect(acc.id)}
                        disabled={isDeleting === acc.id}
                        className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                      >
                        {isDeleting === acc.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        DESVINCULAR
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConnector && (
          <WhatsAppConnector 
            userId={userId}
            onClose={() => setShowConnector(false)}
            onConnected={() => setShowConnector(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
