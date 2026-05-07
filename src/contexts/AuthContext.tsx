import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, AuthUser, getAuthToken, setAuthToken, onUnauthorized } from '@/lib/api';

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  needsBootstrap: boolean | null;
  login: (email: string, password: string, persist?: boolean) => Promise<void>;
  register: (email: string, name: string, password: string, persist?: boolean) => Promise<void>;
  loginWithToken: (user: AuthUser, token: string, persist?: boolean) => void;
  logout: () => void;
  refreshBootstrapStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);

  const refreshBootstrapStatus = useCallback(async () => {
    try {
      const { needsBootstrap } = await api.bootstrapStatus();
      setNeedsBootstrap(needsBootstrap);
    } catch {
      setNeedsBootstrap(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await refreshBootstrapStatus();
      const token = getAuthToken();
      if (!token) {
        if (alive) setLoading(false);
        return;
      }
      try {
        const me = await api.me();
        if (alive) setUser(me);
      } catch {
        setAuthToken(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    const off = onUnauthorized(() => {
      setAuthToken(null);
      setUser(null);
    });
    return () => {
      alive = false;
      off();
    };
  }, [refreshBootstrapStatus]);

  const login = useCallback(async (email: string, password: string, persist = true) => {
    const { user, token } = await api.login(email, password);
    setAuthToken(token, persist);
    setUser(user);
    await refreshBootstrapStatus();
  }, [refreshBootstrapStatus]);

  const register = useCallback(async (email: string, name: string, password: string, persist = true) => {
    const { user, token } = await api.register(email, name, password);
    setAuthToken(token, persist);
    setUser(user);
    await refreshBootstrapStatus();
  }, [refreshBootstrapStatus]);

  const loginWithToken = useCallback((user: AuthUser, token: string, persist = true) => {
    setAuthToken(token, persist);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, needsBootstrap, login, register, loginWithToken, logout, refreshBootstrapStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
