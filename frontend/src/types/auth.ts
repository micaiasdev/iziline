// Tipos do domínio de autenticação. O backend usa JWT (SimpleJWT): login
// devolve um par de tokens; o perfil vem de GET /api/users/me/.

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  cpf: string;
  birth_date: string | null;
  age: number | null;
  phone: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  full_name: string;
  cpf: string;
  birth_date?: string | null;
  phone?: string;
};

// Resposta do TokenObtainPairView do SimpleJWT.
export type TokenPair = {
  access: string;
  refresh: string;
};
