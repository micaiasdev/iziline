import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from "./authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// Evento disparado quando a sessão expira de vez (refresh falhou). O
// AuthProvider escuta isso para derrubar o usuário para a tela de login.
export const AUTH_EXPIRED_EVENT = "iziline:auth-expired";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Cliente "cru" só para o refresh — sem interceptors, para não cair em
// recursão quando o próprio refresh responder 401.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Request: anexa o access token (Bearer) quando existe.
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Controle para não disparar N refreshes simultâneos: requisições que caírem
// em 401 ao mesmo tempo esperam o mesmo refresh em andamento.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error("Sem refresh token.");
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<{ access: string }>("/api/auth/refresh/", { refresh })
      .then((response) => {
        const access = response.data.access;
        setAccessToken(access);
        return access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

// Response: em 401, tenta renovar o access token uma vez e refaz a requisição.
// Se o refresh falhar, limpa a sessão e avisa o app (AUTH_EXPIRED_EVENT).
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes("/api/auth/refresh/");

    if (status === 401 && original && !original._retry && !isRefreshCall && getRefreshToken()) {
      original._retry = true;
      try {
        const access = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${access}`;
        return apiClient(original);
      } catch {
        clearTokens();
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      }
    }

    return Promise.reject(error);
  }
);
