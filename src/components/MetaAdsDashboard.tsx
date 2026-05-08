import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  MousePointer2, 
  Target, 
  DollarSign, 
  Calendar,
  Filter,
  RefreshCcw,
  ChevronRight,
  TrendingDown,
  Facebook,
  Instagram,
  Activity,
  Cpu,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card, Button, CyberIcon } from './UI';
import { cn } from '../lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const MOCK_DATA = [
  { date: '2024-05-01', impressions: 4500, clicks: 120, conversions: 12, spend: 45 },
  { date: '2024-05-02', impressions: 5200, clicks: 145, conversions: 15, spend: 52 },
  { date: '2024-05-03', impressions: 4800, clicks: 110, conversions: 10, spend: 48 },
  { date: '2024-05-04', impressions: 6100, clicks: 180, conversions: 22, spend: 61 },
  { date: '2024-05-05', impressions: 5900, clicks: 165, conversions: 18, spend: 59 },
  { date: '2024-05-06', impressions: 7200, clicks: 210, conversions: 28, spend: 72 },
  { date: '2024-05-07', impressions: 6800, clicks: 195, conversions: 25, spend: 68 },
];

interface MetaAdsDashboardProps {
  onClose: () => void;
}

export const MetaAdsDashboard: React.FC<MetaAdsDashboardProps> = ({ onClose }) => {
  const [period, setPeriod] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-tema-negro/40 backdrop-blur-3xl overflow-hidden animate-in fade-in slide-in-from-right-10 duration-500 relative">
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      
      {/* Header */}
      <div className="p-8 border-b border-tema-electrico/10 bg-tema-negro/60 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-3 bg-tema-texto/5 text-tema-texto/40 hover:text-tema-neon hover:bg-tema-neon/10 border border-tema-texto/10 hover:border-tema-neon/20 rounded-xl transition-all active:scale-95">
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <div>
            <div className="flex items-center gap-4 mb-2">
              <CyberIcon color="var(--tema-neon)" size="lg"><BarChart3 size={28} /></CyberIcon>
              <h2 className="text-3xl font-bold text-tema-texto tracking-tight uppercase whitespace-nowrap leading-none">
                MÉTRICAS META ADS
              </h2>
            </div>
            <p className="text-xs text-tema-neon font-semibold tracking-wider mt-1 uppercase opacity-80 ml-16">Protocolo de Análisis de Infraestructura Publicitaria</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex bg-tema-negro border border-tema-electrico/20 rounded-xl p-1.5 shadow-inner">
             {['7d', '30d', '90d'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                    period === p 
                      ? "bg-tema-neon text-tema-negro shadow-[0_0_20px_rgba(3,154,220,0.4)]" 
                      : "text-tema-texto/40 hover:text-tema-texto"
                  )}
                >
                  {p}
                </button>
             ))}
          </div>
          <button 
            onClick={refreshData} 
            className="w-12 h-12 bg-tema-negro border border-tema-electrico/20 rounded-xl flex items-center justify-center text-tema-texto/40 hover:text-tema-neon transition-all active:scale-90 shadow-inner"
          >
            <RefreshCcw size={18} className={cn(isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 ocultar-barra-desplazamiento relative z-10">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { label: 'IMPRESIONES', value: '40,500', icon: Activity, trend: '+12%', color: 'blue' },
              { label: 'CLARKS (CTR)', value: '1,125 (2.8%)', icon: MousePointer2, trend: '+5.4%', color: 'blue' },
              { label: 'CONVERSIONES', value: '130', icon: Target, trend: '+18.2%', color: 'emerald' },
              { label: 'GASTO TOTAL', value: '$415.00', icon: DollarSign, trend: '-2.1%', color: 'blue' }
            ].map((stat, i) => (
              <div key={i} className="panel-de-vidrio p-8 group relative overflow-hidden transition-all duration-500 border-l-4 border-l-transparent hover:border-l-tema-neon hover:bg-tema-neon/5">
                 <div className="absolute top-4 right-4 text-tema-texto/5 group-hover:text-tema-neon/20 transition-all group-hover:scale-125">
                    <stat.icon size={50} />
                 </div>
                 <p className="text-xs text-tema-texto/60 font-semibold tracking-wider mb-2 uppercase">{stat.label}</p>
                 <h4 className="text-2xl font-bold text-tema-texto mb-3 tracking-tight group-hover:text-tema-neon transition-colors leading-none">{stat.value}</h4>
                 <div className={cn("text-[10px] font-bold flex items-center gap-2 tracking-wide", stat.trend.includes('+') ? "text-tema-matriz" : "text-red-500")}>
                    {stat.trend.includes('+') ? <TrendingUp size={14} className="animate-pulse" /> : <TrendingDown size={14} />}
                    {stat.trend} VS PERIODO ANTERIOR
                 </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 panel-de-vidrio p-10 border-l-4 border-l-tema-neon shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
               <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="font-bold text-tema-texto tracking-wider uppercase text-base mb-2">Flujo de Conversión Neural</h3>
                    <p className="text-xs text-tema-texto/40 font-semibold uppercase tracking-widest">Análisis Telemetría de Campaña</p>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-tema-neon shadow-[0_0_15px_rgba(3,154,220,0.6)]" />
                        <span className="text-xs text-tema-texto/60 uppercase font-semibold tracking-wider">IMPRESIONES</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-tema-matriz shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
                        <span className="text-xs text-tema-texto/60 uppercase font-semibold tracking-wider">CONVERSIONES</span>
                     </div>
                  </div>
               </div>
               <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MOCK_DATA}>
                      <defs>
                        <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--tema-neon)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--tema-neon)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="rgba(255,255,255,0.1)" 
                        fontSize={10}
                        fontWeight={900}
                        tickFormatter={(str) => str.split('-')[2]}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.1)" 
                        fontSize={10} 
                        fontWeight={900}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(2, 7, 13, 0.95)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '16px',
                          backdropFilter: 'blur(10px)',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                        }}
                        itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, marginBottom: '4px' }}
                        labelStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 900, marginBottom: '8px', letterSpacing: '0.1em' }}
                      />
                      <Area type="monotone" dataKey="impressions" stroke="var(--tema-neon)" fillOpacity={1} fill="url(#colorImp)" strokeWidth={4} />
                      <Area type="monotone" dataKey="conversions" stroke="#22c55e" fillOpacity={1} fill="url(#colorConv)" strokeWidth={4} />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="panel-de-vidrio p-8 flex flex-col">
               <h3 className="font-bold text-tema-texto tracking-wider uppercase text-base mb-6">Bracketing de Presupuesto</h3>
               <div className="h-[250px] mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={MOCK_DATA}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip 
                         contentStyle={{ 
                           backgroundColor: 'rgba(2, 7, 13, 0.95)', 
                           border: '1px solid rgba(255,255,255,0.1)', 
                           borderRadius: '16px' 
                         }}
                         itemStyle={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 700 }}
                      />
                      <Bar dataKey="spend" fill="var(--tema-neon)" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
               <div className="mt-auto space-y-4">
                  <div className="flex items-center justify-between p-4 bg-tema-negro/40 rounded-xl border border-tema-electrico/5 hover:border-tema-neon/20 transition-all group">
                     <div className="flex items-center gap-4">
                        <Facebook size={24} className="text-tema-neon transition-transform group-hover:scale-110" />
                        <span className="text-sm font-semibold tracking-wider text-tema-texto/80 uppercase">Meta Enterprise</span>
                     </div>
                     <span className="text-sm font-bold font-mono text-tema-neon">65%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-tema-negro/40 rounded-xl border border-tema-electrico/5 hover:border-tema-neon/20 transition-all group">
                     <div className="flex items-center gap-4">
                        <Instagram size={24} className="text-pink-500 transition-transform group-hover:scale-110" />
                        <span className="text-sm font-semibold tracking-wider text-tema-texto/80 uppercase">IG Network</span>
                     </div>
                     <span className="text-sm font-bold font-mono text-pink-500">35%</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Recent Campaigns Table */}
          <section>
             <div className="flex items-center gap-6 mb-10 group">
                <div className="w-1.5 h-8 bg-tema-neon shadow-[0_0_15px_rgba(3,154,220,1)] rounded-full" />
                <div>
                   <h3 className="text-2xl font-bold text-tema-texto uppercase tracking-tighter leading-none">Canales Activos</h3>
                   <p className="text-[10px] text-tema-neon font-bold tracking-widest mt-2 uppercase opacity-40">Telemetría Operativa en Tiempo Real</p>
                </div>
                <div className="h-[1px] flex-1 bg-tema-electrico/10 mx-10 group-hover:bg-tema-neon/20 transition-colors" />
                <Zap size={24} className="text-tema-texto/10 group-hover:text-tema-neon/40 transition-colors" />
             </div>
             <div className="panel-de-vidrio overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                <table className="w-full text-left">
                   <thead>
                      <tr className="border-b border-tema-electrico/10 bg-tema-negro text-[10px] font-bold text-tema-texto/40 tracking-widest uppercase shadow-md">
                         <th className="px-10 py-6">CAMP_ID / PROTOCOLO</th>
                         <th className="px-10 py-6 text-center">STATUS_NET</th>
                         <th className="px-10 py-6 text-right">CLICKS_RAW</th>
                         <th className="px-10 py-6 text-right">CPC_VAL</th>
                         <th className="px-10 py-6 text-right">CTR_PERF</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-tema-electrico/5">
                      {[1, 2, 3, 4].map((i) => (
                         <tr key={i} className="hover:bg-tema-neon/5 transition-all group cursor-pointer">
                            <td className="px-10 py-8">
                               <p className="text-sm font-bold text-tema-texto group-hover:text-tema-neon transition-colors tracking-tight uppercase leading-none mb-1">Lead Gen_RealEstate_Q2_{i}</p>
                               <p className="text-[10px] text-tema-texto/20 font-bold tracking-wider uppercase">UID: 82736451{i}</p>
                            </td>
                            <td className="px-10 py-8 text-center">
                               <span className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-tema-matriz/10 text-tema-matriz text-[9px] font-bold border border-tema-matriz/20 tracking-wider">
                                  <div className="w-2 h-2 bg-tema-matriz rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" /> TRANSMITIENDO
                               </span>
                            </td>
                            <td className="px-10 py-8 text-right font-bold font-mono text-sm text-tema-texto/60">{340 + i * 20}</td>
                            <td className="px-10 py-8 text-right font-bold font-mono text-sm text-tema-neon">$0.{45 + i}</td>
                            <td className="px-10 py-8 text-right font-bold font-mono text-sm text-tema-matriz">{2.1 + i * 0.2}%</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </section>

        </div>
      </div>

      {/* Decorative Blurs */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-tema-neon/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-tema-electrico/5 blur-[150px] rounded-full pointer-events-none" />
    </div>
  );
};
