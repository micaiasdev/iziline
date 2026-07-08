// Camada de serviço da autenticação. Segue o padrão do projeto: cada função
// tem um ramo mock (VITE_USE_MOCK=true, sem backend) e um ramo real que fala
// com a API Django (JWT via SimpleJWT).

import { apiClient } from "../services/apiClient";
import { buildApiError } from "../services/apiError";
import {
  clearTokens,
  getMockUser,
  setMockUser,
  setTokens,
} from "../services/authStorage";
import type {
  AuthUser,
  LoginCredentials,
  RegisterInput,
  TokenPair,
} from "../../types/auth";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 380));
}

// Monta um usuário plausível a partir do e-mail, para o modo mock.
function buildMockUser(email: string, overrides: Partial<AuthUser> = {}): AuthUser {
  const localPart = email.split("@")[0] ?? "usuario";
  const fullName = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

  return {
    id: 1,
    email,
    full_name: fullName || "Usuário iziline",
    cpf: "00000000000",
    birth_date: null,
    age: null,
    phone: "",
    ...overrides,
  };
}

// POST /api/auth/login/ → { access, refresh }. Guarda os tokens e devolve o
// perfil (via fetchMe) para o app já ter o usuário logo após o login.
export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  if (USE_MOCK) {
    await mockDelay();
    if (!credentials.email || !credentials.password) {
      throw buildApiError(null, "Informe e-mail e senha.");
    }
    setTokens("mock-access-token", "mock-refresh-token");
    const stored = getMockUser();
    const user =
      stored && stored.email === credentials.email
        ? stored
        : buildMockUser(credentials.email);
    setMockUser(user);
    return user;
  }

  try {
    const { data } = await apiClient.post<TokenPair>("/api/auth/login/", credentials);
    setTokens(data.access, data.refresh);
  } catch (error) {
    throw buildApiError(error, "E-mail ou senha inválidos.");
  }

  return fetchMe();
}

// POST /api/auth/register/ cria a conta e já faz login em seguida, para o
// usuário cair autenticado direto no app.
export async function register(input: RegisterInput): Promise<AuthUser> {
  if (USE_MOCK) {
    await mockDelay();
    const user = buildMockUser(input.email, {
      full_name: input.full_name,
      cpf: input.cpf,
      birth_date: input.birth_date ?? null,
      phone: input.phone ?? "",
    });
    setMockUser(user);
    setTokens("mock-access-token", "mock-refresh-token");
    return user;
  }

  try {
    await apiClient.post<AuthUser>("/api/auth/register/", input);
  } catch (error) {
    throw buildApiError(error, "Não foi possível concluir o cadastro.");
  }

  // O register não devolve tokens; autentica com as credenciais recém-criadas.
  return login({ email: input.email, password: input.password });
}

// GET /api/users/me/ — perfil do usuário autenticado.
export async function fetchMe(): Promise<AuthUser> {
  if (USE_MOCK) {
    const stored = getMockUser();
    if (!stored) {
      throw buildApiError(null, "Sessão expirada.");
    }
    return stored;
  }

  try {
    const { data } = await apiClient.get<AuthUser>("/api/users/me/");
    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível carregar seu perfil.");
  }
}

export function logout(): void {
  clearTokens();
}
