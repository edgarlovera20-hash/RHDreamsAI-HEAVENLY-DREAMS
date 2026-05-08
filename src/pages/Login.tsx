import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Loader2, AlertCircle, UserPlus, LogIn, Eye, EyeOff, Fingerprint,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRememberedEmail, setRememberedEmail } from '@/lib/api';
import {
  isPasskeySupported,
  isPlatformAuthenticatorAvailable,
  loginWithPasskey,
} from '@/lib/passkeys';

type Mode = 'login' | 'register';

export function Login() {
  const { login, register, loginWithToken, needsBootstrap } = useAuth();

  const initialMode: Mode = needsBootstrap ? 'register' : 'login';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState(() => getRememberedEmail());
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(getRememberedEmail()));
  const [keepSession, setKeepSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!isPasskeySupported()) return;
    isPlatformAuthenticatorAvailable().then((ok) => {
      if (alive) setBiometricSupported(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  function persistRememberPreference() {
    if (rememberEmail && email.trim()) {
      setRememberedEmail(email.trim());
    } else if (!rememberEmail) {
      setRememberedEmail(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password, keepSession);
      } else {
        await register(email.trim(), name.trim(), password, keepSession);
      }
      persistRememberPreference();
    } catch (err: any) {
      setError(err?.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  async function onBiometric() {
    setError(null);
    setBiometricBusy(true);
    try {
      const result = await loginWithPasskey(email.trim() || undefined);
      loginWithToken(result.user, result.token, keepSession);
      persistRememberPreference();
    } catch (err: any) {
      const msg = err?.message || String(err);
      // Friendlier message for the most common dev-time error.
      if (/credential_unknown/i.test(msg)) {
        setError('Esta cuenta aún no tiene huella registrada. Inicia con contraseña y agrégala desde Configuración → Seguridad.');
      } else if (/NotAllowedError|aborted/i.test(msg)) {
        setError('Cancelaste el inicio con huella.');
      } else {
        setError(msg);
      }
    } finally {
      setBiometricBusy(false);
    }
  }

  const showRegister = mode === 'register';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="relative glass-panel border border-slate-700/50 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-28 h-28 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-blue-500/40 blur-2xl rounded-full"></div>
            <img src="/logo.png" alt="Heavenly Dreams Logo" className="w-28 h-28 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(96,165,250,0.7)]" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">RH<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-500">Dreams</span></h1>
            <p className="text-[10px] text-blue-400/80 uppercase tracking-[0.25em] font-bold mb-1">Heavenly Dreams</p>
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
            <label className="text-xs text-slate-400 mb-1.5 block uppercase tracking-wider font-medium">
              {showRegister ? 'Email' : 'Email o usuario'}
            </label>
            <input
              type={showRegister ? 'email' : 'text'}
              name="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              inputMode={showRegister ? 'email' : 'text'}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder={showRegister ? 'tu@email.com' : 'tu@email.com o usuario'}
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Tu nombre"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block uppercase tracking-wider font-medium">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={showRegister ? 'new-password' : 'current-password'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 pr-11 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder={showRegister ? 'Mínimo 6 caracteres' : '••••••••'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember-me row */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                className="accent-blue-500 cursor-pointer"
              />
              Recordar usuario
            </label>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={keepSession}
                onChange={(e) => setKeepSession(e.target.checked)}
                className="accent-blue-500 cursor-pointer"
              />
              Mantener sesión iniciada
            </label>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || biometricBusy}
            className="cta w-full bg-blue-500 hover:bg-blue-600 text-slate-900 font-semibold py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(96,165,250,0.25)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : showRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {showRegister ? (needsBootstrap ? 'Crear admin y entrar' : 'Crear cuenta') : 'Iniciar sesión'}
          </button>
        </form>

        {/* Biometric / passkey login — only when supported and on login mode */}
        {!showRegister && isPasskeySupported() && (
          <div className="mt-4">
            <div className="relative my-2 flex items-center">
              <div className="flex-1 h-px bg-white/10" />
              <span className="px-3 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">o</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <button
              type="button"
              onClick={onBiometric}
              disabled={submitting || biometricBusy}
              title={biometricSupported ? 'Iniciar con huella o reconocimiento facial' : 'Tu dispositivo no detecta autenticador biométrico — puedes intentarlo igualmente'}
              className="cta w-full mt-2 bg-slate-800/80 hover:bg-slate-700/80 border border-blue-500/30 hover:border-blue-400/60 text-blue-200 hover:text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(59,130,246,0.18)]"
            >
              {biometricBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-5 h-5 animate-pulse-soft" />}
              Iniciar con huella digital
            </button>
            {!biometricSupported && (
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                Si no tienes huella registrada o tu dispositivo no la soporta, sigue con tu contraseña.
              </p>
            )}
          </div>
        )}

        {!needsBootstrap && (
          <div className="mt-6 text-center text-sm text-slate-400">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className={cn('text-blue-400 hover:text-blue-300 transition-colors')}
            >
              {mode === 'login' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
