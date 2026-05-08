import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Play, 
  Save, 
  ChevronRight,
  Database,
  Send,
  Zap,
  Activity,
  Cpu,
  Layers,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Button, Card, CyberIcon } from './UI';
import { cn, OperationType, handleFirestoreError } from '../lib/utils';
import { format } from 'date-fns';

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: string[];
  status: 'draft' | 'active' | 'archived';
  createdAt: any;
}

interface WorkflowViewProps {
  userId: string;
}

export const WorkflowView: React.FC<WorkflowViewProps> = ({ userId }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState<Partial<Workflow>>({
    name: '',
    description: '',
    steps: [''],
    status: 'draft'
  });

  useEffect(() => {
    const q = query(collection(db, 'users', userId, 'workflows'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setWorkflows(snap.docs.map(d => ({ id: d.id, ...d.data() } as Workflow)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/workflows`));
  }, [userId]);

  const handleAddWorkflow = async () => {
    if (!newWorkflow.name || !newWorkflow.steps?.length) return;
    try {
      await addDoc(collection(db, 'users', userId, 'workflows'), {
        ...newWorkflow,
        createdAt: serverTimestamp(),
      });
      setIsAdding(false);
      setNewWorkflow({ name: '', description: '', steps: [''], status: 'draft' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE);
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!window.confirm('¿Confirmar purga de lógica neural?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'workflows', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE);
    }
  };

  const sendToCentral = async (workflow: Workflow) => {
    try {
      await updateDoc(doc(db, 'users', userId, 'workflows', workflow.id), {
          status: 'active'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-tema-negro/40 backdrop-blur-xl overflow-hidden relative">
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      
      {/* Header */}
      <div className="p-8 border-b border-tema-electrico/10 bg-tema-negro/60 flex items-center justify-between relative z-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <CyberIcon color="var(--tema-neon)" size="lg"><GitBranch size={28} /></CyberIcon>
            <h2 className="text-3xl font-bold text-tema-texto tracking-tight uppercase whitespace-nowrap leading-none">
              FLUJOS DE TRABAJO
            </h2>
          </div>
          <p className="text-xs text-tema-neon font-semibold tracking-wide uppercase opacity-80 ml-12">Automatización de Procesos // Red Neuronal Central</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="flex items-center gap-3 py-3 px-6 text-xs font-bold uppercase tracking-wide shadow-sm">
          <Plus size={16} /> NUEVA LÓGICA
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-10 ocultar-barra-desplazamiento relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <AnimatePresence mode="popLayout">
            {workflows.map(wf => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={wf.id}
              >
                <div className="p-10 panel-de-vidrio h-full flex flex-col transition-all hover:scale-[1.02] border-t-2 border-t-tema-electrico/20 hover:border-t-tema-neon group relative overflow-hidden">
                  <div className="absolute inset-0 grid-bg opacity-10" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-xl font-bold text-tema-texto group-hover:text-tema-neon transition-colors tracking-tight uppercase leading-none mb-2">{wf.name}</h3>
                        <p className="text-sm text-tema-texto/60 font-medium leading-relaxed">{wf.description}</p>
                      </div>
                      <div className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all",
                        wf.status === 'active' 
                          ? "bg-tema-matriz/10 text-tema-matriz border-tema-matriz/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                          : "bg-tema-texto/5 text-tema-texto/40 border-tema-texto/10"
                      )}>
                        {wf.status === 'active' ? 'OPERATIVO' : 'BORRADOR'}
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      {wf.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-4 group/step">
                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-8 h-8 rounded-lg border border-tema-neon/20 flex items-center justify-center text-xs text-tema-neon font-bold shadow-inner group-hover/step:border-tema-neon transition-all bg-tema-neon/5">
                              {idx + 1}
                            </div>
                            {idx < wf.steps.length - 1 && <div className="w-[2px] h-4 bg-gradient-to-b from-tema-neon/20 to-transparent my-1" />}
                          </div>
                          <div className="flex-1 bg-tema-negro/40 p-4 rounded-xl border border-tema-electrico/10 text-sm text-tema-texto/80 font-medium shadow-sm group-hover/step:border-tema-electrico/30 transition-all">
                            {step}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4 mt-auto pt-6 border-t border-tema-electrico/10">
                      <Button variant="primary" onClick={() => sendToCentral(wf)} className="flex-1 flex items-center justify-center gap-3 py-3 text-xs font-bold uppercase tracking-wide">
                          <Zap size={16} /> SINCRONIZAR
                      </Button>
                      <button 
                        onClick={() => deleteWorkflow(wf.id)} 
                        className="p-3 bg-red-500/5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 rounded-xl transition-all active:scale-90"
                      >
                          <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isAdding && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-full md:col-span-1"
            >
              <div className="p-12 panel-de-vidrio border-2 border-tema-neon/30 bg-tema-neon/5 shadow-[0_0_50px_rgba(3,154,220,0.1)] relative overflow-hidden group">
                <div className="absolute inset-0 grid-bg opacity-10" />
                <div className="flex items-center gap-4 mb-8 relative z-10">
                   <CyberIcon color="var(--tema-neon)" size="lg"><Layers size={24} /></CyberIcon>
                   <h3 className="text-2xl font-bold text-tema-texto tracking-tight uppercase leading-none">DEFINIR LÓGICA NEURAL</h3>
                </div>
                
                <div className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-tema-neon uppercase tracking-wider ml-1">Nombre del Protocolo</label>
                    <input 
                      type="text"
                      value={newWorkflow.name}
                      onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                      placeholder="Ej: Seguimiento Post-Venta HD"
                      className="w-full bg-tema-negro/80 border border-tema-electrico/20 p-3.5 rounded-xl text-sm focus:border-tema-neon focus:outline-none transition-all text-tema-texto font-medium shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-tema-neon uppercase tracking-wider ml-1">Descripción Conceptual</label>
                    <textarea 
                      value={newWorkflow.description}
                      onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                      placeholder="Propósito y alcance del flujo..."
                      className="w-full bg-tema-negro/60 border border-tema-electrico/20 p-5 rounded-2xl text-sm h-24 focus:border-tema-neon focus:outline-none text-tema-texto font-medium resize-none shadow-inner"
                    />
                  </div>
                  <div className="space-y-6">
                    <label className="text-xs font-bold text-tema-neon uppercase tracking-widest ml-2 block">Pasos Secuenciales de Red</label>
                    {newWorkflow.steps?.map((step, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={idx} 
                        className="flex gap-4 items-center"
                      >
                        <div className="w-10 h-10 rounded-xl border border-tema-electrico/20 flex items-center justify-center shrink-0 text-xs font-bold text-tema-texto/40">
                          {idx + 1}
                        </div>
                        <input 
                          type="text"
                          value={step}
                          onChange={(e) => {
                            const newSteps = [...(newWorkflow.steps || [])];
                            newSteps[idx] = e.target.value;
                            setNewWorkflow({ ...newWorkflow, steps: newSteps });
                          }}
                          className="flex-1 bg-tema-negro/60 border border-tema-electrico/20 p-5 rounded-2xl text-sm focus:border-tema-neon focus:outline-none text-tema-texto font-medium shadow-inner"
                          placeholder={`Definir paso ${idx + 1}...`}
                        />
                        <button 
                          onClick={() => {
                            const newSteps = newWorkflow.steps?.filter((_, i) => i !== idx);
                            setNewWorkflow({ ...newWorkflow, steps: newSteps });
                          }}
                          className="p-3 text-tema-texto/20 hover:text-red-500 transition-all hover:scale-110"
                        >
                          <Trash2 size={20} />
                        </button>
                      </motion.div>
                    ))}
                    <button 
                      onClick={() => setNewWorkflow({ ...newWorkflow, steps: [...(newWorkflow.steps || []), ''] })}
                      className="w-full py-4 border border-dashed border-tema-neon/30 text-[10px] font-bold uppercase tracking-widest text-tema-neon/60 hover:text-tema-neon hover:border-tema-neon hover:bg-tema-neon/5 transition-all rounded-2xl shadow-sm"
                    >
                      + AGREGAR NODO LOGICO
                    </button>
                  </div>
                  <div className="flex gap-6 pt-10">
                    <Button variant="secondary" onClick={() => setIsAdding(false)} className="flex-1 py-5 text-xs font-bold tracking-widest uppercase">DESCARTAR</Button>
                    <Button onClick={handleAddWorkflow} className="flex-1 py-5 text-xs font-bold tracking-widest uppercase shadow-[0_0_40px_rgba(3,154,220,0.3)]">COMPILAR LÓGICA</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Decorative Blurs */}
      <div className="absolute top-1/4 -right-40 w-96 h-96 bg-tema-neon/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 -left-40 w-96 h-96 bg-tema-electrico/5 blur-[150px] rounded-full pointer-events-none" />
    </div>
  );
};
