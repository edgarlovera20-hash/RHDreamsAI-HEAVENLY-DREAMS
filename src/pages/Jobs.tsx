import { useState } from "react";
import { MOCK_JOBS } from "@/data/mockData";
import { Plus, Search, MapPin, Users, Globe, ExternalLink, Briefcase, Share2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Jobs() {
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [searchFilter, setSearchFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', department: '', location: '', status: 'Draft' });

  const filteredJobs = jobs.filter(j => 
    j.title.toLowerCase().includes(searchFilter.toLowerCase()) || 
    j.department.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleCreateJob = () => {
    if (!newJob.title || !newJob.department || !newJob.location) return;
    const added = {
      id: Date.now().toString(),
      ...newJob,
      applicants: 0,
      platforms: [],
      timeToHire: null
    };
    setJobs([...jobs, added]);
    setIsModalOpen(false);
    setNewJob({ title: '', department: '', location: '', status: 'Draft' });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mt-2">Ofertas de Empleo</h1>
          <p className="text-slate-400">Administra las vacantes e integra con portales de empleo.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-600/40 text-cyan-50 hover:text-white px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <Plus className="w-4 h-4" />
          Nueva Oferta
        </button>
      </div>

      <div className="flex items-center gap-2 glass-panel p-2 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar posiciones..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-500 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredJobs.map(job => (
          <div key={job.id} className="glass-panel glass-panel-hover rounded-2xl flex flex-col p-6 group">
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors">
                  <Briefcase className="w-6 h-6 opacity-80" />
                </div>
                <div>
                  <h3 className="font-semibold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">{job.title}</h3>
                  <p className="text-sm text-slate-400 mt-0.5">{job.department}</p>
                </div>
              </div>
              <span className={cn(
                "px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border",
                job.status === 'Active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]" :
                job.status === 'Closed' ? "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[inset_0_0_10px_rgba(244,63,94,0.1)]" :
                "bg-slate-800/50 text-slate-400 border-slate-700/50"
              )}>
                {job.status === 'Active' ? 'Activa' : job.status === 'Closed' ? 'Cerrada' : 'Borrador'}
              </span>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <MapPin className="w-4 h-4 text-slate-500" />
                {job.location}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-white">{job.applicants}</span> candidatos
              </div>
            </div>

            <div className="mt-auto pt-5 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-slate-500" />
                  <div className="flex flex-wrap gap-2">
                    {job.platforms.length > 0 ? (
                      job.platforms.map(p => (
                        <span key={p} className="text-[10px] bg-slate-800/50 border border-white/5 text-slate-300 px-2 py-1 rounded-md font-medium uppercase tracking-wider">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No publicada</span>
                    )}
                  </div>
                </div>
                {job.status === 'Active' && (
                  <button className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 p-6 md:p-8 rounded-2xl w-full max-w-lg relative flex flex-col glass-panel shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-6 flex items-center gap-2">
               <Briefcase className="w-6 h-6 text-cyan-400" />
               Nueva Oferta
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 mb-1.5 block">Título del Puesto</label>
                <input 
                  type="text" 
                  value={newJob.title}
                  onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  placeholder="Ej: Backend Developer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300 mb-1.5 block">Departamento</label>
                  <input 
                    type="text" 
                    value={newJob.department}
                    onChange={(e) => setNewJob({...newJob, department: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    placeholder="Ej: Engineering"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-1.5 block">Ubicación</label>
                  <input 
                    type="text" 
                    value={newJob.location}
                    onChange={(e) => setNewJob({...newJob, location: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    placeholder="Ej: Remote, Spain"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-1.5 block">Estado Inicial</label>
                <select 
                  value={newJob.status}
                  onChange={(e) => setNewJob({...newJob, status: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none"
                >
                  <option value="Draft">Borrador</option>
                  <option value="Active">Activa</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-700/50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 rounded-xl font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
               >
                Cancelar
              </button>
              <button 
                onClick={handleCreateJob}
                disabled={!newJob.title || !newJob.department || !newJob.location}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold px-6 py-2 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear Oferta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
