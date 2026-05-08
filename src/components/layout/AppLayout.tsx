import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Menu, X, LayoutDashboard, Users, Briefcase, Settings, PieChart, Zap, ChevronRight, Home, Sun, Moon, Smartphone, MessageSquare, PanelLeftClose, PanelLeftOpen, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";
import { useAuth } from "@/contexts/AuthContext";

const PATH_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/candidates": "Candidatos",
  "/jobs": "Ofertas de Empleo",
  "/messages": "Mensajes",
  "/agents": "Agentes AI",
  "/whatsapp": "Cuentas WhatsApp",
  "/reports": "Reportes",
  "/settings": "Configuración",
};

const NAV_ITEMS = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Candidatos", path: "/candidates", icon: Users },
  { name: "Ofertas de Empleo", path: "/jobs", icon: Briefcase },
  { name: "Mensajes", path: "/messages", icon: MessageSquare },
  { name: "Agentes AI", path: "/agents", icon: Zap },
  { name: "Cuentas WhatsApp", path: "/whatsapp", icon: Smartphone },
  { name: "Reportes", path: "/reports", icon: PieChart },
  { name: "Configuración", path: "/settings", icon: Settings },
];

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();

  const initials = (user?.name || 'Usuario')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'US';

  useEffect(() => {
    // Check local storage or default to dark
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light') {
      setIsDarkMode(false);
      document.body.classList.add('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    if (newIsDark) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="flex flex-col md:flex-row font-sans text-slate-200 app-container">
      {/* Mobile nav header */}
      <div className="md:hidden flex items-center justify-between glass-panel p-3 shrink-0 m-2 rounded-xl relative z-40">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 font-bold text-white text-lg tracking-tight">
            <div className="w-10 h-10 relative flex items-center justify-center text-white shrink-0">
              <div className="absolute inset-0 bg-blue-500/30 blur-lg rounded-full"></div>
              <img src="/logo.png" alt="Heavenly Dreams Logo" className="w-10 h-10 object-contain relative z-10 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
            </div>
            <span>RH<span className="text-blue-400">Dreams</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-blue-300 transition-colors">
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <NotificationsPopover align="right" direction="down" />
          <button onClick={logout} title="Cerrar sesión" className="p-2 text-slate-400 hover:text-rose-400 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-blue-400 hover:text-blue-300 transition-colors">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "glass-panel flex-shrink-0 flex-col relative z-50 md:z-50",
          "fixed inset-y-0 left-0 md:static md:flex",
          "transition-all duration-500 ease-out md:m-4 md:rounded-2xl border-r-0 md:border-r border-slate-700/50",
          sidebarOpen ? "translate-x-0 w-64 h-[100dvh] md:h-auto" : "-translate-x-full md:translate-x-0",
          !sidebarOpen && (isCollapsed ? "md:w-20" : "md:w-64")
        )}
      >
        <div className={cn("hidden md:flex flex-col justify-center border-b border-white/5 shrink-0 relative overflow-hidden transition-all duration-300", isCollapsed ? "h-20 px-2" : "h-32 px-8")}>
          <div className="absolute top-0 right-0 p-16 bg-blue-500/10 blur-2xl rounded-full opacity-50 pointer-events-none"></div>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className={cn(
              "absolute z-20 text-slate-400 hover:text-blue-300 transition-colors p-1 rounded-md hover:bg-slate-800/50 hidden md:block",
              isCollapsed ? "top-2 right-1/2 translate-x-1/2" : "top-3 right-3"
            )}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <div className={cn("flex items-center gap-3 font-bold text-white text-xl tracking-tight group cursor-pointer relative z-10", isCollapsed ? "justify-center mt-3" : "")}>
            <div className="w-14 h-14 relative flex items-center justify-center text-white transition-transform group-hover:scale-105 duration-300 shrink-0">
              <div className="absolute inset-0 bg-blue-500/40 blur-xl rounded-full group-hover:bg-blue-400/50 transition-all"></div>
              <img src="/logo.png" alt="Heavenly Dreams Logo" className="w-14 h-14 object-contain relative z-10 drop-shadow-[0_0_10px_rgba(96,165,250,0.7)]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold tracking-tighter text-2xl">RH<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-500">Dreams</span></span>
                <span className="text-[9px] text-blue-400/80 uppercase tracking-[0.2em] font-bold mt-0.5">Heavenly Dreams</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 styled-scrollbar relative">
          <nav className={cn("flex flex-col gap-1.5", isCollapsed ? "px-2" : "px-4")}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center rounded-lg font-medium transition-all duration-300 group relative overflow-hidden",
                    isCollapsed ? "justify-center py-3 px-0 w-10 h-10 mx-auto" : "gap-3 px-4 py-3",
                    isActive 
                      ? "text-blue-300 bg-blue-500/10 border border-blue-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" 
                      : "text-slate-400 hover:text-white border border-transparent hover:bg-slate-800/40"
                  )}
                >
                  <Icon className={cn("w-5 h-5 relative z-10 transition-colors shrink-0", isActive ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" : "opacity-70 group-hover:text-blue-300")} />
                  {!isCollapsed && <span className="relative z-10 tracking-wide text-[13px] whitespace-nowrap">{item.name}</span>}
                  {isActive && !isCollapsed && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa] animate-pulse relative z-10 shrink-0" />}
                </Link>
              );
            })}
          </nav>
          
          {!isCollapsed && (
            <div className="mt-8 px-4">
               <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 flex items-center gap-2 tracking-widest"><Zap className="w-3 h-3 text-amber-400" /> AI Insights</p>
                 <p className="text-xs text-slate-400 leading-relaxed font-light">4 candidatos muestran alto potencial de fit cultural esta semana.</p>
               </div>
            </div>
          )}
        </div>
        
        <div className={cn("p-4 border-t border-white/5 shrink-0 bg-black/10 flex items-center transition-all duration-300", isCollapsed ? "flex-col gap-4 justify-center" : "justify-between")}>
          <div className={cn("flex items-center gap-3 glass-panel p-2 rounded-xl group cursor-pointer hover:border-blue-500/30 transition-colors", isCollapsed ? "justify-center w-full" : "flex-1 min-w-0")}>
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-600 flex flex-shrink-0 items-center justify-center text-blue-400 font-bold text-sm shadow-[0_0_10px_rgba(96,165,250,0.1)] group-hover:shadow-[0_0_15px_rgba(96,165,250,0.3)] transition-all">
              {initials}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">{user?.name || 'Usuario'}</span>
                <span className="text-[10px] text-blue-500 uppercase tracking-widest mt-0.5 truncate">{user?.role || 'Member'}</span>
              </div>
            )}
          </div>
          <div className={cn("flex items-center gap-1 shrink-0", isCollapsed ? "flex-col w-full" : "ml-2")}>
            <button onClick={toggleTheme} className={cn("p-2 text-slate-400 hover:text-blue-300 transition-colors rounded-full hover:bg-slate-800/50", isCollapsed && "w-10 h-10 flex items-center justify-center")}>
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={cn(isCollapsed && "flex items-center justify-center w-10 h-10")}>
              <NotificationsPopover align={isCollapsed ? "center" : "left"} direction="up" />
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className={cn("p-2 text-slate-400 hover:text-rose-400 transition-colors rounded-full hover:bg-rose-500/10", isCollapsed && "w-10 h-10 flex items-center justify-center")}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto w-full relative z-10 styled-scrollbar">
        <div className="p-4 md:p-8 md:pt-4 max-w-7xl mx-auto min-w-0 flex flex-col h-full">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link to="/" className="hover:text-blue-400 transition-colors flex items-center gap-1">
              <Home className="w-4 h-4" />
            </Link>
            {location.pathname !== "/" && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-slate-300 font-medium">
                  {PATH_MAP[location.pathname] || location.pathname.split("/").filter(Boolean).pop()}
                </span>
              </>
            )}
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
