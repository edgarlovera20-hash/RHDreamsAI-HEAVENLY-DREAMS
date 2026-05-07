import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register';

export function Login() {
  const { login, register, needsBootstrap } = useAuth();

  const initialMode: Mode = needsBootstrap ? 'register' : 'login';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), name.trim(), password);
      }
    } catch (err: any) {
      setError(err?.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  const showRegister = mode === 'register';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="relative glass-panel border border-slate-700/50 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-28 h-28 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan-500/40 blur-2xl rounded-full"></div>
            <img src="/logo.png" alt="Heavenly Dreams Logo" className="w-28 h-28 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(34,211,238,0.7)]" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">RH<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Dreams</span></h1>
            <p className="text-[10px] text-cyan-400/80 uppercase tracking-[0.25em] font-bold mb-1">Heavenly Dreams</p>
            <p className="text-xs text-slate-400">{showRegister ? (needsBootstrap ? 'Crea la cuenta admin' : 'Crear cuenta nueva') : 'Iniciar sesión'}</p>
          </div>
        </div>

        {needsBootstrap && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-200 text-sm mb-5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Aún no hay usuarios. Crea la primera cuenta — será administrador.</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block uppercase tracking-wider font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              placeholder="tu@email.com"
            />
          </div>

          {showRegister && (
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block uppercase tracking-wider font-medium">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={showRegister}
                autoComplete="name"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                placeholder="Tu nombre"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block uppercase tracking-wider font-medium">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={showRegister ? 'new-password' : 'current-password'}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              placeholder={showRegister ? 'Mínimo 6 caracteres' : '••••••••'}
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(34,211,238,0.25)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : showRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {showRegister ? (needsBootstrap ? 'Crear admin y entrar' : 'Crear cuenta') : 'Iniciar sesión'}
          </button>
        </form>

        {!needsBootstrap && (
          <div className="mt-6 text-center text-sm text-slate-400">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className={cn('text-cyan-400 hover:text-cyan-300 transition-colors')}
            >
              {mode === 'login' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
