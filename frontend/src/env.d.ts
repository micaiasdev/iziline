/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Liga dados mock (sem backend) quando "true". Ver .env.example. */
  readonly VITE_USE_MOCK?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_USERNAME?: string;
  readonly VITE_API_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
