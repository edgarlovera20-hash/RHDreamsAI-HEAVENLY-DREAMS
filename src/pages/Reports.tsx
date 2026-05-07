import { Building, Filter, LayoutDashboard, Users, PieChart, TrendingUp, Calendar, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { FUNNEL_DATA, PERFORMANCE_DATA, CANDIDATES_PER_JOB_DATA } from "@/data/mockData";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, LineChart, Line, ComposedChart, PieChart as RechartsPieChart, Pie, Cell 
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#64748b'];

export function Reports() {
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    // Funnel Data
    csvContent += "=== Embudo de Conversión ===\n";
    csvContent += "Fase,Cantidad\n";
    FUNNEL_DATA.forEach(row => {
      csvContent += `${row.stage},${row.count}\n`;
    });
    
    // Performance Data
    csvContent += "\n=== Rendimiento Histórico ===\n";
    csvContent += "Mes,Contrataciones,Time to Hire (días)\n";
    PERFORMANCE_DATA.forEach(row => {
      csvContent += `${row.name},${row.hires},${row.timeToHire}\n`;
    });
    
    // Candidates per job data
    csvContent += "\n=== Distribución por Oferta ===\n";
    csvContent += "Oferta,Candidatos\n";
    CANDIDATES_PER_JOB_DATA.forEach(row => {
      csvContent += `"${row.name}",${row.count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reportes_talentflow_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-enter flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <PieChart className="w-6 h-6 text-blue-400" />
            Reportes y Analíticas
          </h1>
          <p className="text-slate-400 text-sm font-light mt-1">
            Visualizaciones clave del rendimiento del reclutamiento y embudo de talento.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-xs bg-slate-800/50 border border-white/5 text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors font-medium flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Últimos 30 días
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/40 text-blue-50 hover:text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-12 h-12 text-blue-400" />
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Time to Hire (Promedio)</p>
          <h3 className="text-3xl font-bold text-white mb-2">29 <span className="text-sm font-medium text-slate-500">días</span></h3>
          <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> -12% vs mes anterior
          </p>
        </div>
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Building className="w-12 h-12 text-purple-400" />
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Candidatos Totales</p>
          <h3 className="text-3xl font-bold text-white mb-2">219</h3>
          <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> +5% vs mes anterior
          </p>
        </div>
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-12 h-12 text-amber-400" />
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Tasa de Conversión</p>
          <h3 className="text-3xl font-bold text-white mb-2">1.5%</h3>
          <p className="text-xs text-rose-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3 rotate-180" /> -0.2% vs mes anterior
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />
            Embudo de Conversión
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FUNNEL_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `${val}`} />
                <YAxis dataKey="stage" type="category" stroke="#94a3b8" fontSize={11} width={90} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                  {FUNNEL_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time to Hire & Performance Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Rendimiento histórico (Contrataciones vs TTH)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={PERFORMANCE_DATA} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} orientation="left" />
                <YAxis yAxisId="right" stroke="#94a3b8" fontSize={12} orientation="right" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar yAxisId="left" dataKey="hires" name="Contratados" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
                <Line yAxisId="right" type="monotone" dataKey="timeToHire" name="Tiempo (días)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source of Hire (Using Candidates Per Job for now, but pretending it's source) */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            Distribución por Fuente de Candidatos
          </h3>
          <div className="h-[300px] w-full flex itmes-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PERFORMANCE_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="hires" stroke="#10b981" fillOpacity={1} fill="url(#colorHires)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
