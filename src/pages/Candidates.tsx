import { useState } from "react";
import { MOCK_CANDIDATES, CRM_STAGES } from "@/data/mockData";
import { Search, Filter, Plus, Calendar as CalendarIcon, Mail, Star, Phone, MessageCircle, MoreVertical, MapPin, Briefcase, Clock, Facebook, Map, Image as ImageIcon, Send, Activity, User, FileText, Settings as SettingsIcon, Trash2, Check, X, XCircle, Linkedin, Globe, ArrowDownAZ } from "lucide-react";
import { cn } from "@/lib/utils";
import { CandidateProfileModal } from "@/components/CandidateProfileModal";
import { useNotifications } from "@/contexts/NotificationContext";
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Helper function for stage colors
const getStageColor = (stage: string) => {
  const stageLower = stage.toLowerCase();
  if (['nuevo'].includes(stageLower)) return 'cyan';
  if (['contactado', 'espera de respuesta', 'reagendar'].includes(stageLower)) return 'yellow';
  if (['cita agendada', 'confirmó asistencia'].includes(stageLower)) return 'cyan';
  if (['contratado', 'ddo y bienvenida'].includes(stageLower)) return 'emerald';
  if (['rechazado', 'no asistió'].includes(stageLower)) return 'rose';
  if (['entrevista realizada', 'en capacitación'].includes(stageLower)) return 'purple';
  return 'slate';
};

// Helper for source icon & color
const SourceIcon = ({ source }: { source: string }) => {
  const s = source?.toLowerCase() || '';
  if (s.includes('linkedin')) return <Linkedin className="w-3 h-3 text-[#0a66c2]" />;
  if (s.includes('facebook') || s.includes('messenger')) return <Facebook className="w-3 h-3 text-blue-400" />;
  if (s.includes('whatsapp')) return <MessageCircle className="w-3 h-3 text-emerald-400" />;
  if (s.includes('job board') || s.includes('portal')) return <Globe className="w-3 h-3 text-amber-500" />;
  if (s.includes('volante') || s.includes('documento')) return <FileText className="w-3 h-3 text-slate-300" />;
  if (s.includes('lona') || s.includes('física') || s.includes('ubicación')) return <Map className="w-3 h-3 text-orange-400" />;
  if (s.includes('instagram') || s.includes('tiktok')) return <ImageIcon className="w-3 h-3 text-pink-400" />;
  if (s.includes('referido') || s.includes('referral')) return <User className="w-3 h-3 text-purple-400" />;
  return <Briefcase className="w-3 h-3 text-blue-400" />;
};

export function Candidates() {
  const [activeView, setActiveView] = useState<'list' | 'kanban' | 'calendar'>('kanban');
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [sortByRating, setSortByRating] = useState(false);
  const [sortBySource, setSortBySource] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedPools, setSelectedPools] = useState<string[]>([]);
  const [searchFilterTerm, setSearchFilterTerm] = useState("");
  const [kanbanStages, setKanbanStages] = useState([...CRM_STAGES]);
  const [isEditingStages, setIsEditingStages] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string[]>([]);
  const [selectedSalary, setSelectedSalary] = useState<string[]>([]);
  const [contactCandidate, setContactCandidate] = useState<any | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [contactMethod, setContactMethod] = useState<'email' | 'whatsapp'>('email');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const uniqueSources = Array.from(new Set(MOCK_CANDIDATES.map(c => c.source)));
  const uniqueLocations = Array.from(new Set(MOCK_CANDIDATES.map(c => c.location).filter(Boolean)));
  const uniqueExperience = ['1 año', '2 años', '3 años', '4 años', '5 años', '6 años', '8 años'];
  const uniqueSalaryRanges = ['<$30k / año', '$30k - $50k / año', '$50k - $80k / año', '>$80k / año'];
  const uniquePools = ['Frontend', 'Backend', 'Design', 'Product'];

  const { triggerEvent } = useNotifications();

  let displayedCandidates = [...MOCK_CANDIDATES];
  
  if (searchFilterTerm) {
    const term = searchFilterTerm.toLowerCase();
    displayedCandidates = displayedCandidates.filter(c => 
      c.name.toLowerCase().includes(term) ||
      (c.role && c.role.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term))
    );
  }

  if (selectedSources.length > 0) {
    displayedCandidates = displayedCandidates.filter(c => selectedSources.includes(c.source));
  }
  if (selectedLocations.length > 0) {
    displayedCandidates = displayedCandidates.filter(c => selectedLocations.includes(c.location));
  }
  if (selectedExperience.length > 0) {
    displayedCandidates = displayedCandidates.filter(c => selectedExperience.includes(c.experienceTime));
  }
  if (selectedSalary.length > 0) {
    // Exact mapping for mock data is complex since mock data doesn't have salary, but we can fake it:
    // It's just a mock UI, so filter randomly or ignore unless added to mock data
  }
  if (selectedPools.length > 0) {
    displayedCandidates = displayedCandidates.filter(c => {
       const roleLower = c.role?.toLowerCase() || '';
       return selectedPools.some(pool => roleLower.includes(pool.toLowerCase()));
    });
  }

  if (sortByRating) {
    displayedCandidates.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBySource) {
    displayedCandidates.sort((a, b) => (a.source || "").localeCompare(b.source || ""));
  }

  const totalPages = Math.ceil(displayedCandidates.length / itemsPerPage);
  const paginatedCandidates = displayedCandidates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Parse events for Calendar
  const calendarEvents = displayedCandidates
    .filter(c => c.appointment)
    .map(c => {
      // Mock data dates look like "2026-05-10" and time "10:00 AM". Let's parse them simply.
      // E.g. c.appointment.date + " " + c.appointment.time
      const [year, month, day] = c.appointment.date.split('-').map(Number);
      const [timeStr, ampm] = c.appointment.time.split(' ');
      const [hours, minutes] = timeStr.split(':').map(Number);
      let hour = hours;
      if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
      
      const start = new Date(year, month - 1, day, hour, minutes || 0);
      const end = new Date(year, month - 1, day, hour + 1, minutes || 0); // 1 hour duration
      
      return {
        id: c.id,
        title: `Entrevista: ${c.name} - ${c.role}`,
        start,
        end,
        candidate: c,
        status: c.appointment.status
      };
    });

  return (
    <div className="page-enter flex flex-col gap-6 h-full pb-8">
      {selectedCandidate && (
        <CandidateProfileModal 
          candidate={selectedCandidate} 
          onClose={() => setSelectedCandidate(null)} 
        />
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" />
            CRM Pipeline
          </h1>
          <p className="text-slate-400 text-sm font-light mt-1">Supervisión y flujo en tiempo real de talentos.</p>
        </div>
        <div className="flex self-start sm:self-auto flex-wrap items-center gap-3">
          <div className="glass-panel p-1 rounded-lg flex border border-slate-700/50 w-full sm:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveView('kanban')}
              className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", activeView === 'kanban' ? "bg-slate-800/80 text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}
            >
              Kanban
            </button>
            <button 
              onClick={() => setActiveView('list')}
              className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", activeView === 'list' ? "bg-slate-800/80 text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}
            >
              Tabla
            </button>
            <button 
              onClick={() => setActiveView('calendar')}
              className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", activeView === 'calendar' ? "bg-slate-800/80 text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}
            >
              Calendario
            </button>
            {activeView === 'kanban' && (
              <button 
                onClick={() => setIsEditingStages(!isEditingStages)}
                className={cn("px-2 py-1.5 ml-1 text-sm font-medium rounded-md transition-colors border max-w-fit flex items-center justify-center", 
                  isEditingStages ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "text-slate-500 hover:text-slate-300 border-transparent"
                )}
                title="Editar Etapas"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <button 
            onClick={() => {
              triggerEvent('sync', {
                title: 'Sincronización Iniciada',
                message: 'Conectando con LinkedIn y otras plataformas para importar candidatos...',
                type: 'info'
              });
            }}
            className="bg-[#0a66c2]/20 border border-[#0a66c2]/50 hover:bg-[#0a66c2]/40 text-[#0a66c2] hover:text-white px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(10,102,194,0.1)]">
            <Linkedin className="w-4 h-4" />
            Importar/Sincronizar
          </button>
          <button 
            onClick={() => {
              triggerEvent('new_candidate', {
                title: 'Nuevo candidato prometedor',
                message: 'Julia Roberts acaba de aplicar a la vacante "UI/UX Designer".',
                type: 'success'
              });
            }}
            className="bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/40 text-blue-50 hover:text-white px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            <Plus className="w-4 h-4" />
            Nuevo Lead
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 glass-panel p-2 rounded-xl border border-slate-700/50">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            value={searchFilterTerm}
            onChange={(e) => setSearchFilterTerm(e.target.value)}
            placeholder="Buscar por nombre, vacante, número o email..." 
            className="w-full pl-9 pr-4 py-2 text-sm bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-500 text-white font-light"
          />
        </div>
        <div className="hidden sm:block h-6 w-px bg-white/10 mx-2"></div>
        <div className="flex w-full sm:w-auto gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-start">
          <button 
            onClick={() => { setSortBySource(false); setSortByRating(!sortByRating); }}
          className={cn(
            "px-4 py-2 text-xs border rounded-md transition-colors font-medium flex items-center gap-2",
            sortByRating 
              ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-400" 
              : "bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800 hover:text-white"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", sortByRating && "fill-yellow-400")} /> Mejores
        </button>
        <button 
          onClick={() => { setSortByRating(false); setSortBySource(!sortBySource); }}
          className={cn(
            "px-4 py-2 text-xs border rounded-md transition-colors font-medium flex items-center gap-2",
            sortBySource 
              ? "bg-purple-500/10 border-purple-500/50 text-purple-400" 
              : "bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800 hover:text-white"
          )}
        >
          <ArrowDownAZ className="w-3.5 h-3.5" /> Fuente
        </button>

          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
              className={cn(
                "w-full sm:w-auto justify-center px-4 py-2 text-xs border rounded-md transition-colors font-medium flex items-center gap-2",
              selectedSources.length > 0 || selectedPools.length > 0 || selectedLocations.length > 0 || selectedExperience.length > 0 || selectedSalary.length > 0
                ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                : "bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Filter className="w-3.5 h-3.5" /> 
            {(selectedSources.length > 0 || selectedPools.length > 0 || selectedLocations.length > 0 || selectedExperience.length > 0 || selectedSalary.length > 0) ? `Filtros Activos` : 'Filtros Avanzados'}
          </button>
          
          {isAdvancedFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center shrink-0">
                <span className="text-xs font-bold text-white uppercase tracking-widest">Búsqueda Avanzada</span>
                <button onClick={() => setIsAdvancedFilterOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto styled-scrollbar p-1 flex-1">
                {/* Global Search Input */}
                <div className="p-3 border-b border-white/5 bg-slate-900/20">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input 
                      type="text"
                      placeholder="Búsqueda booleana (ej. React AND Node)..."
                      onChange={() => {}}
                      className="w-full bg-slate-950/50 border border-slate-700/80 focus:border-blue-500/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/5">
                  {/* Talent Pools Section */}
                  <div className="bg-slate-900 p-3 flex flex-col">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 shrink-0">
                      <User className="w-3 h-3" /> Talent Pools
                    </div>
                    <div className="space-y-1.5 flex-1 overflow-y-auto">
                      {uniquePools.map((pool) => (
                        <label key={pool} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/50 rounded-lg cursor-pointer text-xs text-slate-300 transition-colors group">
                          <input 
                            type="checkbox"
                            checked={selectedPools.includes(pool)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedPools([...selectedPools, pool]);
                              else setSelectedPools(selectedPools.filter(s => s !== pool));
                            }}
                            className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                          />
                          <span className="group-hover:text-white truncate">{pool}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sources Section */}
                  <div className="bg-slate-900 p-3 flex flex-col">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between shrink-0">
                      <span className="flex items-center gap-1.5"><Filter className="w-3 h-3" /> Fuentes</span>
                      <button 
                        onClick={() => {
                          if (selectedSources.length === uniqueSources.length) setSelectedSources([]);
                          else setSelectedSources([...uniqueSources]);
                        }}
                        className="text-blue-500 hover:text-blue-400 normal-case text-[10px] font-medium transition-colors"
                      >
                        {selectedSources.length === uniqueSources.length ? 'Limpiar todas' : 'Seleccionar todas'}
                      </button>
                    </div>
                    
                    <div className="max-h-32 overflow-y-auto styled-scrollbar space-y-1.5 pr-1 mb-2">
                      {uniqueSources.map((source) => (
                        <label key={source} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/50 rounded-lg cursor-pointer text-xs text-slate-300 transition-colors group">
                          <input 
                            type="checkbox"
                            checked={selectedSources.includes(source)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedSources([...selectedSources, source]);
                              else setSelectedSources(selectedSources.filter(s => s !== source));
                            }}
                            className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                          />
                          <SourceIcon source={source} />
                          <span className="group-hover:text-white truncate">{source}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {/* Location Section */}
                  <div className="bg-slate-900 p-3 flex flex-col col-span-2 sm:col-span-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 shrink-0">
                      <MapPin className="w-3 h-3" /> Ubicación
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto styled-scrollbar">
                      {uniqueLocations.map((loc) => (
                        <label key={loc} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/50 rounded-lg cursor-pointer text-xs text-slate-300 transition-colors group">
                          <input 
                            type="checkbox"
                            checked={selectedLocations.includes(loc)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedLocations([...selectedLocations, loc]);
                              else setSelectedLocations(selectedLocations.filter(l => l !== loc));
                            }}
                            className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                          />
                          <span className="group-hover:text-white truncate">{loc}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Experience Section */}
                  <div className="bg-slate-900 p-3 flex flex-col col-span-2 sm:col-span-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 shrink-0">
                      <Briefcase className="w-3 h-3" /> Nivel de Experiencia
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto styled-scrollbar">
                      {uniqueExperience.map((exp) => (
                        <label key={exp} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/50 rounded-lg cursor-pointer text-xs text-slate-300 transition-colors group">
                          <input 
                            type="checkbox"
                            checked={selectedExperience.includes(exp)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedExperience([...selectedExperience, exp]);
                              else setSelectedExperience(selectedExperience.filter(l => l !== exp));
                            }}
                            className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
                          />
                          <span className="group-hover:text-white truncate">{exp}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Salary Section */}
                  <div className="bg-slate-900 p-3 flex flex-col col-span-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 shrink-0">
                      <Clock className="w-3 h-3" /> Salario Pretendido (Anual)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {uniqueSalaryRanges.map((sal) => {
                        const isSelected = selectedSalary.includes(sal);
                        return (
                          <button
                            key={sal}
                            onClick={() => {
                              if (isSelected) setSelectedSalary(selectedSalary.filter(s => s !== sal));
                              else setSelectedSalary([...selectedSalary, sal]);
                            }}
                            className={cn(
                              "text-xs px-3 py-1.5 rounded border transition-colors",
                              isSelected ? "bg-blue-500/10 border-blue-500/50 text-blue-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                            )}>
                            {sal}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {(selectedSources.length > 0 || selectedPools.length > 0 || selectedLocations.length > 0 || selectedExperience.length > 0 || selectedSalary.length > 0) && (
                <div className="p-3 bg-slate-800/50 border-t border-slate-700 flex justify-between items-center mt-auto shrink-0">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {selectedSources.length + selectedPools.length + selectedLocations.length + selectedExperience.length + selectedSalary.length} filtros activos
                  </span>
                  <button 
                    onClick={() => { 
                      setSelectedSources([]); 
                      setSelectedPools([]); 
                      setSelectedLocations([]);
                      setSelectedExperience([]);
                      setSelectedSalary([]);
                      setSearchFilterTerm(""); 
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium border border-rose-500/30 hover:border-rose-400/50 px-3 py-1.5 rounded-lg transition-colors hover:bg-rose-500/10"
                  >
                    Restablecer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {activeView === 'kanban' && (
        <div className="flex-1 overflow-x-auto min-h-0 pb-4 styled-scrollbar">
          <div className="flex gap-4 h-full snap-x">
            {kanbanStages.map((stage, index) => {
              const count = displayedCandidates.filter(c => c.stage === stage).length;
              if (!isEditingStages && count === 0 && !['Nuevo', 'Entrevista realizada', 'Contratado'].includes(stage)) return null; // Hide empty columns mostly

              const colorBase = getStageColor(stage);
              const bgLineMap: Record<string, string> = {
                slate: "via-slate-500/30",
                cyan: "via-blue-500/50",
                purple: "via-purple-500/50",
                orange: "via-orange-500/50",
                emerald: "via-emerald-500/50",
                rose: "via-rose-500/50",
                yellow: "via-yellow-500/50"
              };
              const textMap: Record<string, string> = {
                slate: "text-slate-400",
                cyan: "text-blue-400",
                purple: "text-purple-400",
                orange: "text-orange-400",
                emerald: "text-emerald-400",
                rose: "text-rose-400",
                yellow: "text-yellow-400"
              };

              return (
              <div key={stage} className={cn("flex flex-col w-[320px] flex-shrink-0 glass-panel rounded-xl p-3 snap-start relative overflow-hidden border border-slate-700/30")}>
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent ${bgLineMap[colorBase]} to-transparent opacity-80`}></div>
                
                <div className="flex items-center justify-between mb-3 px-1 relative z-10 pt-1">
                  {isEditingStages ? (
                    <div className="flex items-center justify-between w-full gap-2">
                       <input 
                         type="text" 
                         value={stage} 
                         onChange={(e) => {
                           const newStages = [...kanbanStages];
                           newStages[index] = e.target.value;
                           setKanbanStages(newStages);
                         }}
                         className="bg-slate-900 border border-white/20 text-xs text-white px-2 py-1 rounded w-full focus:outline-none focus:border-blue-500"
                       />
                       <button onClick={() => setKanbanStages(kanbanStages.filter((_, i) => i !== index))} className="text-rose-400 hover:text-rose-300 p-1 bg-rose-500/10 rounded">
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  ) : (
                    <>
                      <span className={cn("text-[11px] uppercase font-bold tracking-widest flex items-center gap-2", textMap[colorBase])}>
                        <span className={cn("w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]")}></span>
                        {stage}
                      </span>
                      <div className="bg-slate-800/80 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/5">
                        {count}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0 pr-1 styled-scrollbar relative z-10">
                  {displayedCandidates.filter(c => c.stage === stage).map(candidate => (
                    <div 
                      key={candidate.id} 
                      onClick={() => setSelectedCandidate(candidate)}
                      className={cn(
                        "glass-panel text-left p-3.5 rounded-xl transition-all cursor-pointer group hover:scale-[1.02] border hover:border-white/10",
                        "hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex flex-col gap-2 relative overflow-hidden"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="flex gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700 shadow-inner overflow-hidden shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                          <span className="relative z-10">{candidate.name.charAt(0)}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-100 text-sm truncate group-hover:text-blue-300 transition-colors">{candidate.name}</h4>
                            {candidate.rating > 0 && (
                              <div className="flex items-center">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-[10px] text-yellow-400 font-bold ml-0.5">{candidate.rating}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate font-light flex items-center gap-1 mt-0.5">
                            <Briefcase className="w-3 h-3 opacity-70" /> {candidate.role}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-1 relative z-10">
                        <span className="text-[10px] bg-slate-800/80 border border-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                           {candidate.experienceTime} exp
                        </span>
                        <span className="text-[10px] bg-slate-800/80 border border-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1 truncate max-w-[120px]">
                           <MapPin className="w-2.5 h-2.5" /> {candidate.location}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50 relative z-10">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded-full border border-white/5">
                           <SourceIcon source={candidate.source} />
                           {candidate.source}
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                          {candidate.linkedin && (
                            <button onClick={(e) => { e.stopPropagation(); window.open(candidate.linkedin.startsWith('http') ? candidate.linkedin : `https://${candidate.linkedin}`, '_blank'); }} className="p-1.5 bg-[#0a66c2]/10 text-[#0a66c2] hover:bg-[#0a66c2]/30 hover:text-[#0a66c2]/80 rounded-md transition-colors" title="Ver LinkedIn">
                              <Linkedin className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setContactCandidate(candidate); }} className="px-2 py-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded text-[10px] font-semibold transition-colors uppercase flex items-center gap-1">
                            <Send className="w-3 h-3" /> Contactar
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 bg-slate-700/30 text-slate-300 hover:bg-slate-600 hover:text-white rounded-md transition-colors" title="Cambiar Estado Manualmente">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                  {isEditingStages && (
                    <div className="h-full min-h-[100px] border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-slate-500 text-xs cursor-not-allowed">
                       Arrastra para reordenar (Próximamente)
                    </div>
                  )}
                </div>
              </div>
            )})}
            
            {isEditingStages && (
              <div className="flex flex-col w-[320px] flex-shrink-0 glass-panel rounded-xl p-3 snap-start relative border-2 border-dashed border-white/10 items-center justify-center min-h-[200px]">
                 <div className="w-full flex gap-2">
                   <input 
                     type="text" 
                     placeholder="Nueva etapa..."
                     value={newStageName}
                     onChange={(e) => setNewStageName(e.target.value)}
                     className="bg-slate-900 border border-white/10 text-sm text-white px-3 py-2 rounded-lg w-full focus:outline-none focus:border-blue-500/50"
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && newStageName.trim()) {
                         setKanbanStages([...kanbanStages, newStageName.trim()]);
                         setNewStageName('');
                       }
                     }}
                   />
                   <button 
                     onClick={() => {
                       if (newStageName.trim()) {
                         setKanbanStages([...kanbanStages, newStageName.trim()]);
                         setNewStageName('');
                       }
                     }}
                     className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-colors border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
                   >
                     <Plus className="w-5 h-5" />
                   </button>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeView === 'calendar' && (
        <div className="flex-1 glass-panel rounded-2xl border border-slate-700/50 p-4 min-h-[600px] bg-slate-900/50">
           <Calendar
             localizer={localizer}
             events={calendarEvents}
             startAccessor="start"
             endAccessor="end"
             culture="es"
             views={['month', 'week', 'day']}
             onSelectEvent={(event) => setSelectedCandidate(event.candidate)}
             messages={{
               next: "Siguiente",
               previous: "Anterior",
               today: "Hoy",
               month: "Mes",
               week: "Semana",
               day: "Día",
               noEventsInRange: "No hay entrevistas programadas en este rango."
             }}
             className="text-slate-300 font-sans rbc-theme-custom"
             eventPropGetter={(event) => {
               const isDone = event.status && event.status.toLowerCase() === 'realizada';
               return {
                 className: cn("rounded outline-none border", isDone ? "bg-slate-700 border-slate-600 text-slate-300 opactiy-70" : "bg-blue-500/20 border-blue-500/50 text-blue-300 hover:bg-blue-500/30")
               };
             }}
           />
           <style>
             {`
                /* Custom Calendar Styling for Dark Mode */
                .rbc-theme-custom .rbc-header {
                  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                  padding: 8px;
                  font-weight: 600;
                }
                .rbc-theme-custom .rbc-month-view,
                .rbc-theme-custom .rbc-time-view,
                .rbc-theme-custom .rbc-agenda-view {
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 0.5rem;
                  overflow: hidden;
                }
                .rbc-theme-custom .rbc-day-bg + .rbc-day-bg,
                .rbc-theme-custom .rbc-month-row + .rbc-month-row,
                .rbc-theme-custom .rbc-header + .rbc-header,
                .rbc-theme-custom .rbc-time-header-content {
                  border-left-color: rgba(255, 255, 255, 0.1);
                  border-top-color: rgba(255, 255, 255, 0.1);
                }
                .rbc-theme-custom .rbc-off-range-bg {
                  background: rgba(0, 0, 0, 0.2);
                }
                .rbc-theme-custom .rbc-today {
                  background: rgba(59,130,246, 0.05); /* subtle cyan */
                }
                .rbc-theme-custom .rbc-btn-group button {
                  color: #cbd5e1;
                  border-color: rgba(255, 255, 255, 0.1);
                  background: transparent;
                  cursor: pointer;
                  pointer-events: auto;
                }
                .rbc-theme-custom .rbc-btn-group button:hover,
                .rbc-theme-custom .rbc-btn-group button:focus {
                  background: rgba(255, 255, 255, 0.05);
                  color: white;
                }
                .rbc-theme-custom .rbc-btn-group button.rbc-active {
                  background: rgba(59,130,246, 0.2);
                  color: #60a5fa;
                  border-color: rgba(59,130,246, 0.5);
                  box-shadow: none;
                }
                .rbc-theme-custom .rbc-toolbar button {
                   transition: all 0.2s;
                }
                .rbc-theme-custom .rbc-event {
                  padding: 2px 4px;
                }
                .rbc-time-content { border-top: 1px solid rgba(255, 255, 255, 0.1) !important; }
                .rbc-timeslot-group { border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important; }
                .rbc-day-slot .rbc-time-slot { border-top: 1px solid rgba(255, 255, 255, 0.02) !important; }
             `}
           </style>
        </div>
      )}

      {activeView === 'list' && (
        <div className="glass-panel overflow-hidden overflow-x-auto rounded-2xl border border-slate-700/50">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-900/40 border-b border-white/5">
                <th className="px-6 py-4 font-semibold text-slate-400 text-[10px] uppercase tracking-widest">Candidato</th>
                <th className="px-6 py-4 font-semibold text-slate-400 text-[10px] uppercase tracking-widest">Vacante & Exp</th>
                <th className="px-6 py-4 font-semibold text-slate-400 text-[10px] uppercase tracking-widest">Contacto</th>
                <th className="px-6 py-4 font-semibold text-slate-400 text-[10px] uppercase tracking-widest">Fuente de Reclutamiento</th>
                <th className="px-6 py-4 font-semibold text-slate-400 text-[10px] uppercase tracking-widest">Estatus</th>
                <th className="px-6 py-4 font-semibold text-slate-400 text-[10px] uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedCandidates.map(candidate => {
                const colorBase = getStageColor(candidate.stage);
                const bgTintMap: Record<string, string> = {
                  slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
                  cyan: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                  orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
                  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                  yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                };

                return (
                <tr key={candidate.id} className="hover:bg-blue-500/5 transition-colors group cursor-pointer" onClick={() => setSelectedCandidate(candidate)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-700">
                        {candidate.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-white group-hover:text-blue-300 transition-colors flex items-center gap-2">
                          {candidate.name} {candidate.age && <span className="text-slate-500 font-normal">({candidate.age})</span>}
                          {candidate.rating > 0 && (
                            <div className="flex items-center">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-[10px] text-yellow-400 font-bold ml-0.5">{candidate.rating}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {candidate.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-300">{candidate.role}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{candidate.experienceTime} • {candidate.lastJob}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {candidate.whatsapp ? (
                         <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                           <MessageCircle className="w-3.5 h-3.5" /> {candidate.phone}
                         </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                          <Phone className="w-3.5 h-3.5" /> {candidate.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <SourceIcon source={candidate.source} /> {candidate.source}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border shadow-[inset_0_0_8px_rgba(255,255,255,0.05)]", bgTintMap[colorBase])}>
                      {candidate.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {candidate.linkedin && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); window.open(candidate.linkedin.startsWith('http') ? candidate.linkedin : `https://${candidate.linkedin}`, '_blank'); }}
                          className="text-[#0a66c2] hover:text-[#0a66c2]/80 transition-colors p-1 bg-[#0a66c2]/10 hover:bg-[#0a66c2]/20 rounded" title="Contactar por LinkedIn"
                        >
                          <Linkedin className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedCandidate(candidate); }}
                        className="text-slate-400 hover:text-blue-400 font-medium text-sm transition-colors hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                      >
                        Analizar
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-slate-900/40">
              <span className="text-xs text-slate-500">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, displayedCandidates.length)} de {displayedCandidates.length} candidatos
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-xs border border-white/5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <div className="px-3 py-1 text-xs text-slate-300 font-medium">
                  {currentPage} / {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-xs border border-white/5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {contactCandidate && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-lg relative flex flex-col glass-panel shadow-2xl">
            <button 
              onClick={() => setContactCandidate(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-500 mb-2">
              Contactar a {contactCandidate.name.split(' ')[0]}
            </h2>
            <p className="text-sm text-slate-400 mb-6">Selecciona el medio e ingresa tu mensaje para contactar al candidato.</p>
            
            <div className="space-y-4">
              <div className="flex gap-4 border-b border-slate-700/50 pb-4">
                <button 
                  onClick={() => setContactMethod('email')}
                  className={`flex flex-col items-center justify-center gap-2 p-3 flex-1 rounded-xl border transition-all ${contactMethod === 'email' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-800/50 border-transparent text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                  <Mail className="w-6 h-6" />
                  <span className="text-xs font-semibold">Email</span>
                </button>
                <button 
                  onClick={() => setContactMethod('whatsapp')}
                  disabled={!contactCandidate.whatsapp}
                  className={`flex flex-col items-center justify-center gap-2 p-3 flex-1 rounded-xl border transition-all ${contactMethod === 'whatsapp' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-800/50 border-transparent text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="text-xs font-semibold">WhatsApp</span>
                </button>
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-2 block">Mensaje <span className="text-rose-500">*</span></label>
                <textarea 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none text-sm leading-relaxed h-32"
                  placeholder={`Hola ${contactCandidate.name.split(' ')[0]}, quería contactarme contigo para hablar sobre la vacante...`}
                  value={contactMessage}
                  onChange={e => setContactMessage(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-700/50">
              <button 
                onClick={() => setContactCandidate(null)}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 transition-colors"
               >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  triggerEvent('sync', {
                    title: 'Mensaje Enviado',
                    message: `Mensaje enviado a ${contactCandidate.name.split(' ')[0]} por ${contactMethod === 'email' ? 'Email' : 'WhatsApp'} exitosamente.`,
                    type: 'success'
                  });
                  setContactCandidate(null);
                  setContactMessage('');
                }}
                disabled={!contactMessage.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-slate-900 font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(96,165,250,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 text-slate-900" fill="currentColor" />
                Enviar Mensaje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
