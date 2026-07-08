import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authService from "../auth/authService";
import { AUTH_EXPIRED_EVENT } from "../services/apiClient";
import { clearTokens, hasSession } from "../services/authStorage";
import type {
  AuthUser,
  LoginCredentials,
  RegisterInput,
} from "../../types/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Sem token guardado já começa "unauthenticated" (evita setState síncrono no
  // effect); com token, fica "loading" até o fetchMe resolver.
  const [status, setStatus] = useState<AuthStatus>(() =>
    hasSession() ? "loading" : "unauthenticated"
  );

  // Bootstrap: se há token guardado, tenta recuperar o perfil. Sessão inválida
  // cai para "unauthenticated" sem quebrar o app.
  useEffect(() => {
    if (!hasSession()) {
      return;
    }

    let active = true;

    authService
      .fetchMe()
      .then((me) => {
        if (active) {
          setUser(me);
          setStatus("authenticated");
        }
      })
      .catch(() => {
        if (active) {
          clearTokens();
          setUser(null);
          setStatus("unauthenticated");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Refresh falhou lá no interceptor → derruba a sessão aqui.
  useEffect(() => {
    function handleExpired() {
      setUser(null);
      setStatus("unauthenticated");
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const me = await authService.login(credentials);
    setUser(me);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const me = await authService.register(input);
    setUser(me);
    setStatus("authenticated");
  }, []);

  const updateUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      login,
      register,
      updateUser,
      logout,
    }),
    [user, status, login, register, updateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  }
  return context;
}
