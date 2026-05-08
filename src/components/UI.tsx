import { type FC, type ReactNode, type ReactElement, cloneElement } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: FC<CardProps> = ({ children, className }) => (
  <div className={cn("panel-de-vidrio rounded-2xl overflow-hidden", className)}>
    {children}
  </div>
);

export const CyberIcon: FC<{
  children: ReactElement;
  className?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ children, className, color = 'var(--tema-neon)' }) => {
  return (
    <div className={cn("cyber-icon flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:brightness-150 transition-all duration-300", className)}>
      {cloneElement(children, {
        strokeWidth: 1.5,
        style: {
          filter: `drop-shadow(0 0 8px ${color}99) drop-shadow(0 0 20px ${color}66)`,
          color: color
        }
      } as any)}
    </div>
  );
};

export const Button: FC<{
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}> = ({ children, onClick, className, variant = 'primary', disabled, type = 'button' }) => {
  const variants = {
    primary: "bg-tema-neon/20 text-tema-neon border border-tema-neon/50 hover:bg-tema-neon/30 hover:border-tema-neon shadow-[0_0_15px_rgba(3,154,220,0.2)]",
    secondary: "bg-tema-profundo/40 text-tema-texto/70 border border-tema-electrico/20 hover:bg-tema-profundo/60",
    ghost: "bg-transparent text-tema-texto/50 hover:text-tema-neon hover:bg-tema-neon/5",
    danger: "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative px-6 py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 font-bold tracking-wider uppercase text-[10px] disabled:opacity-30 disabled:cursor-not-allowed group overflow-hidden",
        variants[variant],
        className
      )}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </button>
  );
};

export const Avatar: FC<{ src?: string | null; name: string; size?: 'sm' | 'md' | 'lg'; status?: 'online' | 'offline'; className?: string }> = ({ src, name, size = 'md', status, className }) => {
  const sizes = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-10 h-10 text-xs",
    lg: "w-14 h-14 text-sm"
  };

  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <div className={cn(
        "relative bg-tema-profundo/60 border border-tema-electrico/30 rounded-xl flex items-center justify-center overflow-hidden panel-de-vidrio",
        sizes[size]
      )}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-tema-neon tracking-tighter">
            {name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      {status === 'online' && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-tema-matriz rounded-full border-2 border-tema-negro shadow-[0_0_8px_rgba(0,255,136,0.8)] animate-pulse" />
      )}
    </div>
  );
};
