import { useState } from 'react';
import { useNotifications, AppNotification } from '@/contexts/NotificationContext';
import { useClickOutside } from '@/hooks/useClickOutside';
import { Bell, X, Check, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success': return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    case 'error': return <AlertCircle className="w-5 h-5 text-red-400" />;
    case 'info':
    default:
      return <Info className="w-5 h-5 text-blue-400" />;
  }
};

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `Hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
};

export function NotificationsPopover({ 
  align = 'right', 
  direction = 'down' 
}: { 
  align?: 'left' | 'right' | 'center',
  direction?: 'up' | 'down' 
} = {}) {
  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-4 w-4 shrink-0 translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(96,165,250,0.6)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: direction === 'up' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === 'up' ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "fixed left-4 right-4 z-[100] sm:absolute sm:left-auto sm:right-auto sm:w-96 glass-panel rounded-2xl shadow-2xl border border-white/10 overflow-hidden",
              direction === 'up' ? "bottom-[4.5rem] sm:bottom-full sm:mb-4" : "top-[4.5rem] sm:top-full sm:mt-4",
              align === 'right' ? "sm:right-0" : align === 'left' ? "sm:-left-[200px] md:sm:-left-24 lg:left-0" : "sm:-translate-x-1/2 sm:left-1/2"
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/30">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors group relative"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button 
                    onClick={clearAll}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Limpiar todas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto styled-scrollbar p-2 flex flex-col gap-1 relative bg-black/20">
              {notifications.length === 0 ? (
                <div className="py-10 px-4 text-center flex flex-col items-center justify-center text-slate-500">
                  <Bell className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm">No tienes notificaciones</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((notification) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                      onClose={() => setIsOpen(false)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
            
            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2 border-t border-white/5 bg-slate-900/50">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2 text-xs font-medium text-slate-400 hover:text-blue-400 transition-colors text-center uppercase tracking-wider"
                >
                  Ver historial completo
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({ notification, onClose }: { notification: AppNotification, onClose: () => void }) {
  const { markAsRead, removeNotification } = useNotifications();
  const navigate = useNavigate();

  const handleActionClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        "relative p-3 rounded-xl border transition-all flex gap-3 group",
        notification.read 
          ? "bg-slate-900/40 border-transparent" 
          : "bg-slate-800/80 border-blue-500/20 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
      )}
    >
      {!notification.read && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-md"></div>
      )}
      
      <div className="mt-1 shrink-0">
        {getNotificationIcon(notification.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className={cn("text-sm font-medium", notification.read ? "text-slate-300" : "text-white")}>
            {notification.title}
          </h4>
          <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">
            {formatTimeAgo(notification.createdAt)}
          </span>
        </div>
        
        <p className="text-xs text-slate-400 leading-snug break-words pr-4">
          {notification.message}
        </p>

        {notification.actionUrl && (
          <button 
            onClick={handleActionClick}
            className="mt-2 text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            {notification.actionLabel || 'Ver detalles'} <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
        {!notification.read && (
          <button 
            onClick={() => markAsRead(notification.id)}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
            title="Marcar como leída"
          >
            <Check className="w-3 h-3" />
          </button>
        )}
        <button 
          onClick={() => removeNotification(notification.id)}
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
          title="Eliminar"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}
