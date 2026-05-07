import { useState } from "react";
import { X, Mail, Phone, MapPin, Linkedin, Github, Globe, FileText, Download, Clock, ArrowRight, Star, Calendar as CalendarIcon, CheckCircle2, MessageSquare, Activity, Briefcase, Plus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/contexts/NotificationContext";

interface CandidateProfileModalProps {
  candidate: any;
  onClose: () => void;
}

export function CandidateProfileModal({ candidate, onClose }: CandidateProfileModalProps) {
  const [rating, setRating] = useState(candidate.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [activeTab, setActiveTab] = useState<'profile' | 'scorecard' | 'history' | 'offer'>('profile');
  
  const { triggerEvent } = useNotifications();

  // Scorecard states
  const [scores, setScores] = useState({ technical: 0, cultural: 0, communication: 0 });

  // History states
  const [notes, setNotes] = useState<any[]>([]);
  const [currentNote, setCurrentNote] = useState("");

  // Offer form states
  const [offerForm, setOfferForm] = useState({
    template: 'Estándar',
    baseSalary: '65,000',
    bonus: '10',
    stockOptions: '',
    signOnBonus: '',
    startDate: '',
    equipment: 'MacBook Pro 16" + Monitor Dell 27"',
    notes: ''
  });
  const [offerErrors, setOfferErrors] = useState<Record<string, string>>({});
  const [offerSuccess, setOfferSuccess] = useState(false);

  // Upload CV State
  const [uploadedCV, setUploadedCV] = useState<File | null>(null);

  if (!candidate) return null;

  const handleAddNote = () => {
    if (!currentNote.trim()) return;
    setNotes([...notes, {
      text: currentNote,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      author: 'Tú'
    }]);
    setCurrentNote("");
  };

  const handleGenerateOffer = () => {
    let errors: Record<string, string> = {};
    if (!offerForm.baseSalary) errors.baseSalary = "Requerido";
    if (!offerForm.startDate) errors.startDate = "Requerido";
    
    if (Object.keys(errors).length > 0) {
      setOfferErrors(errors);
      setOfferSuccess(false);
      return;
    }
    
    setOfferErrors({});
    setOfferSuccess(true);
    setTimeout(() => setOfferSuccess(false), 3000);
  };

  const handleRating = (val: number) => {
    setRating(val);
    candidate.rating = val; // Assuming mutable for mock demo
  };

  const handleSchedule = (provider: 'google' | 'outlook') => {
    let startDateTime = "";
    let endDateTime = "";
    
    if (scheduleDate && scheduleTime) {
      const date = new Date(`${scheduleDate}T${scheduleTime}`);
      const formattedDate = date.toISOString().replace(/-|:|\.\d\d\d/g, "");
      const endDate = new Date(date.getTime() + 60 * 60 * 1000);
      const formattedEndDate = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
      startDateTime = formattedDate;
      endDateTime = formattedEndDate;
    }

    let url = "";
    const subject = encodeURIComponent(`Entrevista con ${candidate.name} - ${candidate.role}`);
    const details = encodeURIComponent(`Entrevista programada para la posición de ${candidate.role}.\n\nCandidato: ${candidate.name}\nEmail: ${candidate.email}\nTeléfono: ${candidate.phone || 'N/A'}`);

    if (provider === 'google') {
      url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${subject}&details=${details}`;
      if (startDateTime && endDateTime) {
        url += `&dates=${startDateTime}/${endDateTime}`;
      }
    } else if (provider === 'outlook') {
      url = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&subject=${subject}&body=${details}`;
       if (scheduleDate && scheduleTime) {
         let startHour = parseInt(scheduleTime.split(':')[0]);
         let endHour = startHour + 1;
         let endHourStr = endHour.toString().padStart(2, '0');
         url += `&startdt=${scheduleDate}T${scheduleTime}&enddt=${scheduleDate}T${endHourStr}:${scheduleTime.split(':')[1]}`;
       }
    }

    if (url) {
      window.open(url, '_blank');
    }

    triggerEvent('interview_scheduled', {
      title: 'Entrevista Agendada',
      message: `La entrevista con ${candidate.name} ha sido confirmada y agregada al calendario.`,
      type: 'info'
    });

    setScheduled(true);
    setTimeout(() => {
      setScheduled(false);
      setShowSchedule(false);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-[#1E293B] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10 bg-slate-900/30">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl font-bold border border-blue-500/20 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              {candidate.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">{candidate.name}</h2>
                <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-white/5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className="focus:outline-none transition-colors"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRating(star)}
                    >
                      <Star
                        className={cn(
                          "w-4 h-4 transition-colors",
                          (hoverRating || rating) >= star
                            ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                            : "text-slate-600 hover:text-slate-500"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-slate-400 mt-1 font-light">{candidate.role}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-[inset_0_0_8px_rgba(59,130,246,0.2)]">{candidate.stage}</span>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" /> Postulado hace 2 días
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
          <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-none pointer-events-none opacity-50"></div>
          
          {/* Left Column - Contact & Basics */}
          <div className="w-full md:w-1/3 bg-slate-900/40 p-6 border-r border-white/5 overflow-y-auto styled-scrollbar relative z-10">
            <h3 className="text-xs uppercase tracking-widest font-bold text-blue-500/80 mb-4">Información de Contacto</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-slate-400 shrink-0 border border-white/5">
                  <Mail className="w-4 h-4 text-blue-400/80" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Email</p>
                  <a href={`mailto:${candidate.email}`} className="text-sm text-blue-400 hover:underline truncate block">{candidate.email}</a>
                </div>
              </div>

              {candidate.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-slate-400 shrink-0 border border-white/5">
                    <Phone className="w-4 h-4 text-blue-400/80" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Teléfono</p>
                    <p className="text-sm text-slate-300 font-light">{candidate.phone}</p>
                  </div>
                </div>
              )}

              {candidate.location && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-slate-400 shrink-0 border border-white/5">
                    <MapPin className="w-4 h-4 text-blue-400/80" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Ubicación</p>
                    <p className="text-sm text-slate-300 font-light">{candidate.location}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-white/5 my-6"></div>

            <h3 className="text-xs uppercase tracking-widest font-bold text-blue-500/80 mb-4">Enlaces y Redes</h3>
            <div className="space-y-3">
              {candidate.linkedin && (
                <a href={`https://${candidate.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                  <Linkedin className="w-4 h-4 text-slate-400 group-hover:text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0)] group-hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors font-light">{candidate.linkedin}</span>
                </a>
              )}
              {candidate.github && (
                <a href={`https://${candidate.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                  <Github className="w-4 h-4 text-slate-400 group-hover:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0)] group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors font-light">{candidate.github}</span>
                </a>
              )}
              {candidate.portfolio && (
                <a href={`https://${candidate.portfolio}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                  <Globe className="w-4 h-4 text-slate-400 group-hover:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0)] group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors font-light">{candidate.portfolio}</span>
                </a>
              )}
              {(!candidate.linkedin && !candidate.github && !candidate.portfolio) && (
                <p className="text-sm text-slate-500 italic font-light">No hay enlaces adicionales.</p>
              )}
            </div>

          </div>

          {/* Right Column - Tabs & Content */}
          <div className="w-full md:w-2/3 flex flex-col relative z-10 bg-slate-900/20">
            {/* Tabs Header */}
            <div className="flex px-6 pt-4 border-b border-white/10 gap-6 overflow-x-auto styled-scrollbar">
              <button 
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors relative whitespace-nowrap", 
                  activeTab === 'profile' ? "text-blue-400" : "text-slate-400 hover:text-slate-300"
                )}
              >
                Perfil y CV
                {activeTab === 'profile' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-400 glowing-border shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>}
              </button>
              <button 
                onClick={() => setActiveTab('scorecard')}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors relative whitespace-nowrap", 
                  activeTab === 'scorecard' ? "text-purple-400" : "text-slate-400 hover:text-slate-300"
                )}
              >
                Scorecard
                {activeTab === 'scorecard' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-400 glowing-border shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>}
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors relative whitespace-nowrap", 
                  activeTab === 'history' ? "text-emerald-400" : "text-slate-400 hover:text-slate-300"
                )}
              >
                Historial & Notas
                {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-400 glowing-border shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>}
              </button>
              <button 
                onClick={() => setActiveTab('offer')}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors relative whitespace-nowrap", 
                  activeTab === 'offer' ? "text-amber-400" : "text-slate-400 hover:text-slate-300"
                )}
              >
                Oferta
                {activeTab === 'offer' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-400 glowing-border shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>}
              </button>
            </div>

            <div className="p-6 overflow-y-auto styled-scrollbar flex-1">
              {activeTab === 'profile' ? (
                <>
                  <h3 className="text-xs uppercase tracking-widest font-bold text-blue-500/80 mb-4">Currículum Vitae</h3>
                  
                  <div className="glass-panel glass-panel-hover rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between group cursor-pointer gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition-all shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm group-hover:text-blue-300 transition-colors truncate">CV_{candidate.name.replace(' ', '_')}.pdf</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-light">245 KB • Actualizado hace 2 días</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                       <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700 whitespace-nowrap">
                         Ver PDF
                       </button>
                       <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700 whitespace-nowrap flex items-center gap-1.5">
                         <Download className="w-3.5 h-3.5" /> Descargar CV
                       </button>
                       <button className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-xs font-semibold transition-colors border border-blue-500/30 whitespace-nowrap">
                         Ver Perfil Completo
                       </button>
                    </div>
                  </div>

                  {/* Upload CV */}
                  <label className="mt-4 p-4 border border-dashed border-slate-700 hover:border-blue-500/50 rounded-xl bg-slate-900/30 flex flex-col items-center justify-center cursor-pointer transition-colors group relative">
                    <Upload className="w-6 h-6 text-slate-500 group-hover:text-blue-400 mb-2 transition-colors" />
                    <span className="text-sm text-slate-300 font-medium">
                      {uploadedCV ? uploadedCV.name : "Arrastra o haz clic para subir un nuevo CV"}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">PDF, DOCX hasta 5MB</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.docx" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadedCV(e.target.files[0]);
                        }
                      }} 
                    />
                  </label>

                  {candidate.customAnswers && candidate.customAnswers.length > 0 && (
                    <>
                      <div className="h-px bg-white/5 my-8"></div>
                      <h3 className="text-xs uppercase tracking-widest font-bold text-blue-500/80 mb-4">Preguntas de Selección</h3>
                      <div className="space-y-6">
                        {candidate.customAnswers.map((item: any, i: number) => (
                          <div key={i}>
                            <p className="text-sm font-medium text-white mb-2">{item.question}</p>
                            <p className="text-sm text-slate-300 font-light glass-panel p-4 rounded-xl leading-relaxed">
                              {item.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Evaluación Estructurada</h3>
                    <p className="text-xs text-slate-400 font-light mb-6">Califica al candidato de acuerdo a los criterios del puesto para reducir sesgos.</p>
                  </div>

                  {/* Score 1 */}
                  <div className="glass-panel p-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Habilidades Técnicas</h4>
                        <p className="text-[10px] text-slate-500 tracking-wide mt-0.5">Dominio del stack requerido y pruebas técnicas.</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setScores({...scores, technical: star})}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star className={cn("w-5 h-5", scores.technical >= star ? "fill-purple-400 text-purple-400 shadow-purple" : "text-slate-600")} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Score 2 */}
                  <div className="glass-panel p-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Cultural Fit</h4>
                        <p className="text-[10px] text-slate-500 tracking-wide mt-0.5">Alineación con los valores de la empresa.</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setScores({...scores, cultural: star})}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star className={cn("w-5 h-5", scores.cultural >= star ? "fill-purple-400 text-purple-400 shadow-purple" : "text-slate-600")} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Score 3 */}
                  <div className="glass-panel p-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Comunicación</h4>
                        <p className="text-[10px] text-slate-500 tracking-wide mt-0.5">Claridad al expresar ideas y trabajo en equipo.</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setScores({...scores, communication: star})}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star className={cn("w-5 h-5", scores.communication >= star ? "fill-purple-400 text-purple-400 shadow-purple" : "text-slate-600")} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 mt-4">Notas de Entrevista</label>
                    <textarea 
                      className="w-full bg-slate-900/50 border border-slate-700 focus:border-purple-500/50 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none min-h-[100px] resize-none"
                      placeholder="Escribe tus observaciones estructuradas aquí..."
                    ></textarea>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Actividad Reciente</h3>
                    <p className="text-xs text-slate-400 font-light mb-6">Historial de correos, menciones y cambios de fase.</p>
                  </div>

                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                    {/* Event 1 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.2)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ms-0 md:mx-auto">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-slate-200 text-sm">Secuencia de Email</span>
                          <span className="text-[10px] text-slate-500">Hoy 10:00 AM</span>
                        </div>
                        <p className="text-xs text-slate-400 font-light leading-relaxed">
                          Se envió el correo automatizado de "Agradecimiento por Entrevista". El candidato lo abrió a las 10:05 AM.
                        </p>
                      </div>
                    </div>
                    {/* Event 2 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ms-0 md:mx-auto">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-slate-200 text-sm">Cambio de Fase</span>
                          <span className="text-[10px] text-slate-500">Ayer 15:30 PM</span>
                        </div>
                        <p className="text-xs text-slate-400 font-light leading-relaxed">
                          Movido de <b>Screening</b> a <b>Entrevista Técnica</b> por Luis Pérez.
                        </p>
                        <p className="text-xs text-blue-400 mt-2 font-medium bg-slate-900/50 p-2 rounded-lg inline-block">
                          @Diana R. por favor revisar el CV técnico adjunto.
                        </p>
                      </div>
                    </div>

                    {/* Dynamic Notes */}
                    {notes.map((note, idx) => (
                      <div key={`note-${idx}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ms-0 md:mx-auto">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-4 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-slate-200 text-sm">Nota de {note.author}</span>
                            <span className="text-[10px] text-slate-500">Hoy {note.time}</span>
                          </div>
                          <p className="text-xs text-slate-400 font-light leading-relaxed">
                            {note.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-white/5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Añadir Nota o Mencionar (@)</label>
                    <div className="relative">
                      <textarea 
                        className="w-full bg-slate-900/50 border border-slate-700 focus:border-emerald-500/50 rounded-xl py-3 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none min-h-[80px] resize-none pr-12"
                        placeholder="Escribe una nota o usa @ para mencionar al equipo..."
                        value={currentNote}
                        onChange={(e) => setCurrentNote(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNote();
                          }
                        }}
                      ></textarea>
                      <button 
                        onClick={handleAddNote}
                        className="absolute right-3 bottom-3 p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'offer' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Generación de Oferta</h3>
                    <p className="text-xs text-slate-400 font-light mb-6">Prepara y envía la carta de oferta para firma digital.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Plantilla de Oferta</label>
                        <button className="text-[10px] flex items-center gap-1 text-amber-500 hover:text-amber-400 font-bold transition-colors"><Plus className="w-3 h-3" /> Crear Nueva</button>
                      </div>
                      <select 
                        value={offerForm.template}
                        onChange={(e) => setOfferForm({...offerForm, template: e.target.value})}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-amber-500/50 focus:outline-none appearance-none"
                      >
                        <option>Estándar</option>
                        <option>Senior</option>
                        <option>Junior</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Salario Base (Anual) *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input 
                          type="text" 
                          value={offerForm.baseSalary}
                          onChange={(e) => setOfferForm({...offerForm, baseSalary: e.target.value})}
                          className={cn("w-full bg-slate-900/50 border rounded-xl pl-7 pr-3 py-2 text-sm text-slate-200 focus:border-amber-500/50 focus:outline-none", offerErrors.baseSalary ? "border-rose-500" : "border-slate-700")} 
                        />
                      </div>
                      {offerErrors.baseSalary && <p className="text-[10px] text-rose-500 mt-1">{offerErrors.baseSalary}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Bono (%)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={offerForm.bonus}
                          onChange={(e) => setOfferForm({...offerForm, bonus: e.target.value})}
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-amber-500/50 focus:outline-none" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Fecha Estimada de Inicio *</label>
                      <input 
                        type="date" 
                        value={offerForm.startDate}
                        onChange={(e) => setOfferForm({...offerForm, startDate: e.target.value})}
                        className={cn("w-full bg-slate-900/50 border rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-amber-500/50 focus:outline-none", offerErrors.startDate ? "border-rose-500" : "border-slate-700")} 
                      />
                      {offerErrors.startDate && <p className="text-[10px] text-rose-500 mt-1">{offerErrors.startDate}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Stock Options (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input 
                          type="text" 
                          value={offerForm.stockOptions}
                          onChange={(e) => setOfferForm({...offerForm, stockOptions: e.target.value})}
                          placeholder="0"
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-sm text-slate-200 focus:border-amber-500/50 focus:outline-none" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Start Date Bonus (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input 
                          type="text" 
                          value={offerForm.signOnBonus}
                          onChange={(e) => setOfferForm({...offerForm, signOnBonus: e.target.value})}
                          placeholder="0"
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-sm text-slate-200 focus:border-amber-500/50 focus:outline-none" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Equipamiento</label>
                    <select 
                      value={offerForm.equipment}
                      onChange={(e) => setOfferForm({...offerForm, equipment: e.target.value})}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-amber-500/50 focus:outline-none appearance-none"
                    >
                      <option>MacBook Pro 16" + Monitor Dell 27"</option>
                      <option>MacBook Air 13" + Monitor Dell 27"</option>
                      <option>ThinkPad X1 Carbon + Monitor Dell 27"</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Notas internas del reclutador</label>
                    <textarea 
                      value={offerForm.notes}
                      onChange={(e) => setOfferForm({...offerForm, notes: e.target.value})}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-3 text-sm text-slate-200 focus:border-amber-500/50 focus:outline-none min-h-[60px] resize-none styled-scrollbar"
                      placeholder="Ej. Acordamos negociar bono de reubicación si lo aprueba finanzas..."
                    ></textarea>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="w-full">
                      <h4 className="text-sm font-semibold text-amber-500 mb-1">Previsualizar Carta de Oferta</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">
                        Se generará un PDF usando la <b>{offerForm.template}</b> con los datos ingresados arriba.
                      </p>
                      {offerSuccess && (
                        <p className="text-xs text-emerald-400 font-semibold mb-3 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Oferta generada y enviada correctamente.</p>
                      )}
                      <div className="flex gap-2">
                        <button 
                          onClick={handleGenerateOffer}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Ver PDF
                        </button>
                        <button 
                          onClick={handleGenerateOffer}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-xs font-bold transition-colors shadow-[0_0_10px_rgba(251,191,36,0.2)] flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5" /> Enviar para Firma (Docusign)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="h-px bg-white/5 my-8"></div>
              
              <div className="flex items-center justify-between space-x-4">
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-bold text-blue-500/80">Agendar y Mover</h3>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <button 
                    onClick={() => setShowSchedule(!showSchedule)}
                    className={cn(
                      "px-3 py-1.5 glass-panel text-slate-300 hover:text-white hover:bg-white/5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                      showSchedule && "bg-slate-800 text-white border-slate-600"
                    )}
                  >
                    <CalendarIcon className="w-3.5 h-3.5" /> Entrevista
                  </button>
                  <button className="px-3 py-1.5 glass-panel text-slate-300 hover:text-white hover:bg-white/5 rounded-md text-xs font-medium transition-colors">Rechazar</button>
                  <button className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/40 text-blue-50 hover:text-white rounded-md text-xs font-bold flex items-center gap-1 transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                    Avanzar <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {showSchedule && (
                <div className="mt-4 p-4 rounded-xl border border-white/10 bg-slate-800/50 relative overflow-hidden">
                   {scheduled ? (
                     <div className="flex flex-col items-center justify-center py-4 text-emerald-400">
                       <CheckCircle2 className="w-8 h-8 mb-2" />
                       <p className="text-sm font-semibold">Entrevista agendada con éxito</p>
                       <p className="text-xs text-slate-400 mt-1">Sincronizado con tu calendario.</p>
                     </div>
                   ) : (
                     <div>
                       <h4 className="text-sm font-semibold text-white mb-3">Sincronizar con Calendario</h4>
                       <p className="text-xs text-slate-400 mb-4">Selecciona el proveedor para agendar la entrevista con {candidate.name.split(' ')[0]}. Se creará el evento y enlace de videollamada.</p>
                       
                       <div className="grid grid-cols-2 gap-3 mb-4">
                         <div>
                           <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1">Fecha</label>
                           <input 
                             type="date" 
                             value={scheduleDate}
                             onChange={(e) => setScheduleDate(e.target.value)}
                             className="w-full bg-slate-900 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50" 
                           />
                         </div>
                         <div>
                           <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1">Hora</label>
                           <input 
                             type="time" 
                             value={scheduleTime}
                             onChange={(e) => setScheduleTime(e.target.value)}
                             className="w-full bg-slate-900 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50" 
                           />
                         </div>
                       </div>

                       <div className="flex gap-3">
                         <button 
                           onClick={() => handleSchedule('google')}
                           className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-900 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
                         >
                           <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                           Google Calendar
                         </button>
                         <button 
                           onClick={() => handleSchedule('outlook')}
                           className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#0078D4] text-white rounded-lg text-xs font-semibold hover:bg-[#006cbd] transition-colors"
                         >
                           <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 5.5v13h-4v-11h-11v-4h15v2zm-20 6h15v11h-15v-11zm1 1v9h13v-9h-13z" /></svg>
                           Outlook Calendar
                         </button>
                       </div>
                     </div>
                   )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
