/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Liga dados mock (sem backend) quando "true". Ver .env.example. */
  readonly VITE_USE_MOCK?: string;
  /** Base da API real (usada quando VITE_USE_MOCK=false). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
