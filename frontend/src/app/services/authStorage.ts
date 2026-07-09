// Persistência dos tokens JWT no navegador. Centralizado aqui para que só um
// arquivo saiba ONDE os tokens moram — apiClient e authService só chamam estas
// funções, nunca tocam localStorage direto.

import type { AuthUser } from "../../types/auth";

const ACCESS_KEY = "iziline.auth.access";
const REFRESH_KEY = "iziline.auth.refresh";
// Usado só no modo mock (VITE_USE_MOCK=true) para lembrar quem "logou".
const MOCK_USER_KEY = "iziline.auth.mockUser";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function setAccessToken(access: string): void {
  localStorage.setItem(ACCESS_KEY, access);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(MOCK_USER_KEY);
}

export function hasSession(): boolean {
  return Boolean(getAccessToken());
}

// --- Modo mock -------------------------------------------------------------

export function setMockUser(user: AuthUser): void {
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
}

export function getMockUser(): AuthUser | null {
  const raw = localStorage.getItem(MOCK_USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
