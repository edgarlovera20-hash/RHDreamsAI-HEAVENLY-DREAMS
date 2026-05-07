import { useState } from "react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Shield, Users, Mail, Bell, Key, Plus, Trash2, Zap, Settings as SettingsIcon, MessageSquare, Lock, Smartphone, History, Edit3, X, Check, Sparkles, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/contexts/NotificationContext";
import { ProvidersPanel } from "@/components/ProvidersPanel";
import { MetaProvidersPanel } from "@/components/MetaProvidersPanel";
import { ApiKeysPanel } from "@/components/ApiKeysPanel";
import { IntegrationsPanel } from "@/components/IntegrationsPanel";

const ROLES = [
  { id: 'admin', name: 'Administrador', description: 'Acceso total al sistema, reportes y facturación.' },
  { id: 'hr_manager', name: 'HR Manager', description: 'Crear ofertas, gestionar candidatos y ver embudos.' },
  { id: 'interviewer', name: 'Entrevistador', description: 'Acceso solo lectura a candidatos asignados y puntuaciones.' },
];

const MOCK_USERS = [
  { id: 1, name: 'Carlos Admin', email: 'admin@talentflow.com', role: 'admin' },
  { id: 2, name: 'Laura RRHH', email: 'hr@talentflow.com', role: 'hr_manager' },
  { id: 3, name: 'Pedro Tech', email: 'techlead@talentflow.com', role: 'interviewer' },
];

const AUTOMATIONS = [
  { id: 1, name: 'Email Confirmación Postulación', trigger: 'Recibir nueva postulación', action: 'Enviar plantilla "Gracias por aplicar"', active: true },
  { id: 2, name: 'Recordatorio Reclutador', trigger: 'Candidato avanza a Entrevista', action: 'Enviar notificación slack al Hiring Manager', active: true },
  { id: 3, name: 'Aviso Cambio Estado', trigger: 'Candidato es Rechazado', action: 'Enviar plantilla "Feedback constructivo"', active: false },
];

const EMAIL_TEMPLATES = [
  { id: 1, name: 'Agradecimiento Postulación', subject: 'Gracias por aplicar a {{job_name}}', type: 'Automático', body: '<p>Hola {{candidate_name}},</p><p>Gracias por postularte a la posición de <strong>{{job_name}}</strong>. Hemos recibido tu perfil y nuestro equipo lo revisará en breve.</p>' },
  { id: 2, name: 'Invitación a Entrevista', subject: 'Avanzamos contigo: Entrevista para {{job_name}}', type: 'Manual', body: '<p>Hola {{candidate_name}},</p><p>Nos encantó tu perfil y nos gustaría invitarte a una entrevista para la posición de <strong>{{job_name}}</strong>.</p>' },
  { id: 3, name: 'Rechazo (Fit Cultural)', subject: 'Actualización sobre tu candidatura', type: 'Automático', body: '<p>Hola {{candidate_name}},</p><p>Gracias por tu tiempo. En esta ocasión hemos decidido avanzar con otros candidatos que se ajustan mejor al perfil.</p>' },
  { id: 4, name: 'Oferta Laboral', subject: '¡Tenemos una oferta para ti!', type: 'Manual', body: '<p>Felicidades {{candidate_name}}, te extendemos una oferta formal para unirte a nuestro equipo.</p>' },
];

const SECURITY_LOGS = [
  { id: 1, event: 'Inicio de sesión exitoso', user: 'Carlos Admin', time: 'Hace 5 min', ip: '192.168.1.104', type: 'login' },
  { id: 2, event: 'Cambio de roles', user: 'Carlos Admin', time: 'Hace 2 horas', ip: '192.168.1.104', type: 'admin' },
  { id: 3, event: 'Exportación de datos', user: 'Laura RRHH', time: 'Ayer', ip: '201.20.10.4', type: 'data' },
];

const SECURITY_ALERTS_PREFS = [
  { id: 'suspicious_login', label: 'Intentos de inicio de sesión sospechosos', enabled: true },
  { id: 'role_changes', label: 'Cambios en roles de usuario', enabled: false },
];

const CUSTOM_FIELDS = [
  { id: '1', name: 'candidate_level', description: 'Nivel del candidato (Ej. Junior, Senior)' },
  { id: '2', name: 'interview_date', description: 'Fecha de la entrevista' }
];

export function Settings() {
  const [activeTab, setActiveTab] = useState('providers');
  const [automations, setAutomations] = useState(AUTOMATIONS);
  const { prefs: notificationPrefs, updatePref: toggleNotificationPref, triggerEvent } = useNotifications();
  const [securityAlerts, setSecurityAlerts] = useState(SECURITY_ALERTS_PREFS);
  const [templates, setTemplates] = useState(EMAIL_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [customFields, setCustomFields] = useState(CUSTOM_FIELDS);
  const [newCustomField, setNewCustomField] = useState({ name: '', description: '' });
  const [users, setUsers] = useState(MOCK_USERS);
  
  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  
  // Draft states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('hr_manager');
  
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowTrigger, setNewFlowTrigger] = useState('Recibir nueva postulación');
  const [newFlowAction, setNewFlowAction] = useState('Enviar correo a HR');

  const toggleAutomation = (id: number) => {
    setAutomations(autos => autos.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const toggleSecurityAlert = (id: string) => {
    setSecurityAlerts(alts => alts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  return (
    <div className="page-enter flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-2">Configuración</h1>
        <p className="text-slate-400">Maneja tu equipo, roles, permisos y opciones del sistema.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full md:w-64 flex flex-col gap-1 shrink-0 glass-panel p-3 rounded-2xl">
          {[
            { id: 'providers', label: 'Proveedores IA', icon: Sparkles },
            { id: 'metaWhatsApp', label: 'Meta WhatsApp', icon: MessageSquare },
            { id: 'apiKeys', label: 'API Keys', icon: Key },
            { id: 'integrations', label: 'Integraciones', icon: Webhook },
            { id: 'workflows', label: 'Flujos de Trabajo', icon: Zap },
            { id: 'users', label: 'Usuarios y Roles', icon: Users },
            { id: 'security', label: 'Seguridad', icon: Shield },
            { id: 'notifications', label: 'Notificaciones', icon: Bell },
            { id: 'templates', label: 'Plantillas Correo', icon: Mail },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                activeTab === tab.id 
                  ? "bg-blue-500/10 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "opacity-100" : "opacity-60")} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 w-full glass-panel rounded-2xl overflow-hidden relative group">
          <div className="absolute -inset-20 bg-blue-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-1000"></div>
          
          <div className="relative z-10 w-full h-full">
            {activeTab === 'providers' ? (
              <ProvidersPanel />
            ) : activeTab === 'metaWhatsApp' ? (
              <MetaProvidersPanel />
            ) : activeTab === 'apiKeys' ? (
              <ApiKeysPanel />
            ) : activeTab === 'integrations' ? (
              <IntegrationsPanel />
            ) : activeTab === 'workflows' ? (
              <div>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Flujos de Automatización</h2>
                    <p className="text-sm text-slate-400 font-light">Configura notificaciones y correos automáticos.</p>
                  </div>
                  <button 
                    onClick={() => setIsFlowModalOpen(true)}
                    className="bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/40 text-blue-50 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Plus className="w-4 h-4" /> Crear Flujo
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="grid gap-4">
                    {automations.map(auto => (
                      <div key={auto.id} className="glass-panel glass-panel-hover p-5 rounded-xl flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all", auto.active ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[inset_0_0_8px_rgba(59,130,246,0.2)]" : "bg-slate-800 text-slate-500 border border-slate-700")}>
                            <Zap className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className={cn("font-semibold transition-colors", auto.active ? "text-white" : "text-slate-400")}>{auto.name}</h4>
                            <div className={cn("flex flex-wrap items-center gap-2 mt-2 text-[11px] uppercase tracking-wider font-bold", auto.active ? "text-slate-400" : "text-slate-600")}>
                               <span className="glass-panel px-2 py-0.5 rounded text-slate-300">{auto.trigger}</span>
                               <span className="text-blue-500/50 font-normal lowercase tracking-normal">→ entonces →</span>
                               <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{auto.action}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 border-l border-white/5 pl-4 ml-4">
                          <button 
                            onClick={() => toggleAutomation(auto.id)}
                            className={cn("px-4 py-2 rounded-lg text-[10px] uppercase font-bold tracking-widest border transition-colors", 
                              auto.active 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 shadow-[inset_0_0_8px_rgba(16,185,129,0.2)]" 
                                : "bg-slate-800/50 text-slate-500 border-white/5 hover:bg-slate-800 hover:text-white"
                            )}
                          >
                            {auto.active ? 'Activo' : 'Inactivo'}
                          </button>
                          <button className="p-2 text-slate-500 hover:text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors">
                            <SettingsIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === 'users' ? (
              <div>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Gestión de Usuarios</h2>
                    <p className="text-sm text-slate-400 font-light">Controla quién puede acceder a qué.</p>
                  </div>
                  <button 
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/40 text-blue-50 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Plus className="w-4 h-4" /> Invitar
                  </button>
                </div>
                
                <div className="p-6 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                        <th className="pb-3 text-blue-400/80">Usuario</th>
                        <th className="pb-3 text-blue-400/80">Rol</th>
                        <th className="pb-3 text-right text-blue-400/80">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-blue-500/5 transition-colors group">
                          <td className="py-4">
                            <div className="font-medium text-white">{user.name}</div>
                            <div className="text-slate-500 text-xs">{user.email}</div>
                          </td>
                          <td className="py-4">
                            <select 
                              className="glass-panel text-slate-300 rounded p-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-slate-900"
                              value={user.role}
                              onChange={(e) => {
                                setUsers(users.map(u => u.id === user.id ? { ...u, role: e.target.value } : u));
                                triggerEvent('role_change', {
                                  title: 'Rol Cambiado',
                                  message: `Se cambió el rol de ${user.name} a ${ROLES.find(r => r.id === e.target.value)?.name}`,
                                  type: 'info'
                                });
                              }}
                            >
                              {ROLES.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-4 text-right">
                            <button 
                              onClick={() => {
                                setUsers(users.filter(u => u.id !== user.id));
                                triggerEvent('user_removed', {
                                  title: 'Usuario Eliminado',
                                  message: `${user.name} fue revocado.`,
                                  type: 'error'
                                });
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 border-t border-white/5 bg-slate-900/20">
                  <h3 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" /> Niveles de Permiso
                  </h3>
                  <div className="grid gap-4">
                    {ROLES.map(role => (
                      <div key={role.id} className="glass-panel p-4 rounded-xl flex items-start gap-4 hover:border-white/10 transition-colors">
                        <div className="mt-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 p-2 rounded-lg shadow-[inset_0_0_8px_rgba(59,130,246,0.2)]">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white text-sm">{role.name}</h4>
                          <p className="text-xs text-slate-400 mt-1 font-light">{role.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === 'notifications' ? (
              <div>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Preferencias de Notificación</h2>
                    <p className="text-sm text-slate-400 font-light">Elige qué eventos activan cada tipo de notificación.</p>
                  </div>
                  <button className="bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/40 text-blue-50 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    Guardar Cambios
                  </button>
                </div>

                <div className="p-6">
                  <div className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/5 bg-black/20 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                          <th className="p-4 font-semibold text-blue-400/80">Tipo de Evento</th>
                          <th className="p-4 text-center font-semibold text-blue-400/80 w-24">In-App</th>
                          <th className="p-4 text-center font-semibold text-blue-400/80 w-24">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {notificationPrefs.map(pref => (
                          <tr key={pref.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="p-4">
                              <div className="font-medium text-slate-200 group-hover:text-white transition-colors">{pref.label}</div>
                              <div className="text-slate-500 text-xs mt-0.5">{pref.description}</div>
                            </td>
                            <td className="p-4 text-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer"
                                  checked={pref.inApp}
                                  onChange={() => toggleNotificationPref(pref.id, 'inApp')}
                                />
                                <div className={cn(
                                  "w-9 h-5 rounded-full peer-focus:outline-none transition-all",
                                  pref.inApp ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-slate-700"
                                )}></div>
                                <div className={cn(
                                  "absolute left-[2px] top-[2px] bg-white border-gray-300 border rounded-full h-4 w-4 transition-all",
                                  pref.inApp ? "translate-x-full border-white" : ""
                                )}></div>
                              </label>
                            </td>
                            <td className="p-4 text-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer"
                                  checked={pref.email}
                                  onChange={() => toggleNotificationPref(pref.id, 'email')}
                                />
                                <div className={cn(
                                  "w-9 h-5 rounded-full peer-focus:outline-none transition-all",
                                  pref.email ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-slate-700"
                                )}></div>
                                <div className={cn(
                                  "absolute left-[2px] top-[2px] bg-white border-gray-300 border rounded-full h-4 w-4 transition-all",
                                  pref.email ? "translate-x-full border-white" : ""
                                )}></div>
                              </label>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === 'templates' ? (
              <div>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Plantillas de Correo</h2>
                    <p className="text-sm text-slate-400 font-light">Estandariza la comunicación de tu equipo de reclutamiento.</p>
                  </div>
                  {!editingTemplate && (
                    <button 
                      onClick={() => setEditingTemplate({ id: Date.now(), name: '', subject: '', type: 'Manual', body: '' })}
                      className="bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/40 text-blue-50 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                      <Plus className="w-4 h-4" /> Crear Plantilla
                    </button>
                  )}
                </div>
                
                <div className="p-6">
                  {editingTemplate ? (
                    <div className="glass-panel p-5 rounded-xl flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                         <h3 className="text-sm font-semibold text-white">{editingTemplate.name ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
                         <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid gap-4">
                         <div>
                           <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre de la Plantilla</label>
                           <input type="text" value={editingTemplate.name} onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="block text-xs font-medium text-slate-400 mb-1.5">Asunto</label>
                             <input type="text" value={editingTemplate.subject} onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
                           </div>
                           <div>
                             <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoría</label>
                             <select value={editingTemplate.type} onChange={e => setEditingTemplate({...editingTemplate, type: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none">
                               <option value="Manual">Manual</option>
                               <option value="Automático">Automático</option>
                             </select>
                           </div>
                         </div>
                         <div>
                           <label className="block text-xs font-medium text-slate-400 mb-1.5">Cuerpo del Correo</label>
                           <div className="bg-white rounded-lg overflow-hidden [&_.ql-toolbar]:border-none [&_.ql-toolbar]:bg-slate-50 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[150px] [&_.ql-editor]:text-slate-800">
                             <ReactQuill theme="snow" value={editingTemplate.body} onChange={(val: string) => setEditingTemplate({...editingTemplate, body: val})} />
                           </div>
                           <p className="text-[10px] text-slate-500 mt-2">Variables disponibles: {'{{candidate_name}}'}, {'{{job_name}}'}, {'{{company_name}}'}, {customFields.map(cf => `{{${cf.name}}}`).join(', ')}</p>
                         </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors">Cancelar</button>
                        <button onClick={() => {
                          if (templates.find(t => t.id === editingTemplate.id)) {
                             setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
                          } else {
                             setTemplates([...templates, editingTemplate]);
                          }
                          setEditingTemplate(null);
                        }} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-2">
                          <Check className="w-4 h-4" /> Guardar Plantilla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4">
                        {templates.map(template => (
                          <div key={template.id} className="glass-panel glass-panel-hover p-4 rounded-xl flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                <Mail className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-medium text-white text-sm">{template.name}</h4>
                                <p className="text-xs text-slate-400 mt-1 font-light">Asunto: <span className="text-slate-300 italic">{template.subject}</span></p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={cn("px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider", template.type === 'Automático' ? "bg-blue-500/10 text-blue-400" : "bg-slate-800 text-slate-400")}>
                                {template.type}
                              </span>
                              <div className="flex items-center gap-2 border-l border-white/5 pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingTemplate(template)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setTemplates(templates.filter(t => t.id !== template.id))} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 pt-8 border-t border-white/5">
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-white">Campos Personalizados</h3>
                          <p className="text-xs text-slate-400 font-light mt-0.5">Define variables adicionales para usarlas dentro de las plantillas de correo como {'{{nombre_variable}}'}.</p>
                        </div>
                        
                        <div className="grid gap-3 mb-5">
                          {customFields.map(field => (
                            <div key={field.id} className="glass-panel p-3 rounded-lg flex items-center justify-between">
                              <div>
                                <h4 className="text-sm text-blue-300 font-mono text-[11px]">{'{{'}{field.name}{'}}'}</h4>
                                <p className="text-xs text-slate-400 mt-0.5">{field.description}</p>
                              </div>
                              <button onClick={() => setCustomFields(customFields.filter(f => f.id !== field.id))} className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
                          <div className="flex-1">
                            <input 
                              type="text" 
                              placeholder="nombre_variable" 
                              value={newCustomField.name} 
                              onChange={e => setNewCustomField({...newCustomField, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                              className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 h-9 font-mono text-[11px]" 
                            />
                          </div>
                          <div className="flex-1">
                            <input 
                              type="text" 
                              placeholder="Breve descripción del campo" 
                              value={newCustomField.description} 
                              onChange={e => setNewCustomField({...newCustomField, description: e.target.value})}
                              className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 h-9" 
                            />
                          </div>
                          <button 
                            disabled={!newCustomField.name || !newCustomField.description}
                            onClick={() => {
                              setCustomFields([...customFields, { id: Date.now().toString(), name: newCustomField.name, description: newCustomField.description }]);
                              setNewCustomField({ name: '', description: '' });
                            }}
                            className="bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 h-9 whitespace-nowrap">
                            Añadir Campo
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : activeTab === 'security' ? (
              <div>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Seguridad y Auditoría</h2>
                    <p className="text-sm text-slate-400 font-light">Monitoriza accesos y protege los datos de tu empresa.</p>
                  </div>
                  <button className="bg-slate-800/80 border border-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm">
                    Exportar Reporte
                  </button>
                </div>
                
                <div className="p-6 grid gap-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="glass-panel p-5 rounded-xl border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Lock className="w-16 h-16 text-blue-400" /></div>
                        <h3 className="font-semibold text-white mb-2 relative z-10">Autenticación de Dos Factores (2FA)</h3>
                        <p className="text-xs text-slate-400 mb-4 max-w-[200px] relative z-10">Requiere un código adicional para iniciar sesión en cuentas de administradores.</p>
                        <div className="relative z-10">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-9 h-5 rounded-full peer-focus:outline-none transition-all bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                            <div className="absolute left-[2px] top-[2px] bg-white border-gray-300 border rounded-full h-4 w-4 transition-all translate-x-full border-white"></div>
                          </label>
                        </div>
                     </div>
                     <div className="glass-panel p-5 rounded-xl border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Smartphone className="w-16 h-16 text-blue-400" /></div>
                        <h3 className="font-semibold text-white mb-2 relative z-10">Restricción de Dispositivos</h3>
                        <p className="text-xs text-slate-400 mb-4 max-w-[200px] relative z-10">Limitar el acceso al sistema solo desde IPs o dispositivos de la compañía.</p>
                        <div className="relative z-10">
                          <button className="text-xs border border-white/10 hover:border-blue-500/50 bg-slate-900/50 px-3 py-1.5 rounded-lg text-slate-300 transition-colors">
                            Configurar Reglas
                          </button>
                        </div>
                     </div>
                   </div>

                   <div className="glass-panel rounded-xl overflow-hidden border border-white/10 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Bell className="w-4 h-4 text-rose-400" />
                        <h3 className="font-medium text-sm text-slate-200">Alertas de Seguridad (Email)</h3>
                      </div>
                      <div className="grid gap-3">
                        {securityAlerts.map(alert => (
                          <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-white/5 hover:bg-slate-800/50 transition-colors">
                            <span className="text-sm text-slate-300 font-light">{alert.label}</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={alert.enabled}
                                onChange={() => toggleSecurityAlert(alert.id)}
                              />
                              <div className={cn(
                                "w-9 h-5 rounded-full peer-focus:outline-none transition-all",
                                alert.enabled ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-slate-700"
                              )}></div>
                              <div className={cn(
                                "absolute left-[2px] top-[2px] bg-white border-gray-300 border rounded-full h-4 w-4 transition-all",
                                alert.enabled ? "translate-x-full border-white" : ""
                              )}></div>
                            </label>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
                    <div className="px-5 py-4 border-b border-white/5 bg-black/20 flex items-center gap-2">
                       <History className="w-4 h-4 text-blue-400" />
                       <h3 className="font-medium text-sm text-slate-200">Log de Auditoría</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <tbody className="divide-y divide-white/5">
                          {SECURITY_LOGS.map(log => (
                            <tr key={log.id} className="hover:bg-blue-500/5 transition-colors">
                              <td className="px-5 py-3">
                                <div className="font-medium text-slate-200">{log.event}</div>
                              </td>
                              <td className="px-5 py-3 text-slate-400 text-xs flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 opacity-50" /> {log.user}
                              </td>
                              <td className="px-5 py-3 text-slate-500 text-xs">
                                IP: {log.ip}
                              </td>
                              <td className="px-5 py-3 text-right text-slate-400 text-xs">
                                {log.time}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                   </div>
                </div>
              </div>
            ) : (
               <div className="p-6 flex flex-col items-center justify-center text-center h-[400px] text-slate-500 relative">
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none"></div>
                 <Shield className="w-16 h-16 text-blue-900 mb-4 opacity-50 drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]" />
                 <h3 className="text-lg font-medium text-slate-300 mb-1 tracking-tight">Módulo en construcción</h3>
                 <p className="max-w-xs text-sm font-light">Pronto podrás configurar esta sección del sistema inteligente aquí.</p>
               </div>
            )}
            
            {/* Invite Modal */}
            {isInviteModalOpen && (
              <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-2xl w-full max-w-sm relative glass-panel shadow-2xl">
                  <button onClick={() => setIsInviteModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1">
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-bold text-white mb-4">Invitar Miembro</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Email</label>
                      <input 
                        type="email" 
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="correo@empresa.com"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Rol</label>
                      <select 
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none appearance-none"
                      >
                        {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <button 
                      onClick={() => {
                        if (newUserEmail) {
                          setUsers([...users, { id: Date.now(), name: newUserEmail.split('@')[0], email: newUserEmail, role: newUserRole }]);
                          setIsInviteModalOpen(false);
                          setNewUserEmail('');
                          triggerEvent('user_invited', { title: 'Invitación Enviada', message: `Se ha invitado a ${newUserEmail}.`, type: 'success' });
                        }
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900 font-semibold py-2 rounded-lg text-sm mt-2 transition-colors"
                    >
                      Enviar Invitación
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Workflow Modal */}
            {isFlowModalOpen && (
              <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-2xl w-full max-w-sm relative glass-panel shadow-2xl">
                  <button onClick={() => setIsFlowModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1">
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-bold text-white mb-4">Nuevo Flujo Automático</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Nombre Corto</label>
                      <input 
                        type="text" 
                        value={newFlowName}
                        onChange={(e) => setNewFlowName(e.target.value)}
                        placeholder="Ej: Auto-rechazo por salario"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Cuando ocurra (Trigger)</label>
                      <input 
                        type="text" 
                        value={newFlowTrigger}
                        onChange={(e) => setNewFlowTrigger(e.target.value)}
                        placeholder="Ej: Candidato avanza a entrevista"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Hacer esto (Action)</label>
                      <input 
                        type="text" 
                        value={newFlowAction}
                        onChange={(e) => setNewFlowAction(e.target.value)}
                        placeholder="Ej: Enviar mensaje slack"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        if (newFlowName) {
                          setAutomations([...automations, { id: Date.now(), name: newFlowName, trigger: newFlowTrigger, action: newFlowAction, active: true }]);
                          setIsFlowModalOpen(false);
                          setNewFlowName('');
                        }
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900 font-semibold py-2 rounded-lg text-sm mt-2 transition-colors"
                    >
                      Guardar Flujo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
