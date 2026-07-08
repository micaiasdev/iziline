# app/

Código compartilhado por toda a aplicação — não pertence a um único módulo (`travel/`, `carona/`, `agenda/`).

- **`services/`** — infraestrutura HTTP genérica (`apiClient`, `apiError`). Sem nada de domínio (viagem, cidade, reserva); esses continuam nos módulos que os usam até fazer sentido promovê-los.
- **`hooks/`** — hooks React reutilizáveis entre módulos (ainda vazio).
- **`auth/`** — autenticação/sessão do usuário (ainda vazio; backend já tem Simple JWT, frontend ainda não tem fluxo de login).
