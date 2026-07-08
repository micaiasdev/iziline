# Autenticação de motorista/passageiro — app `users` (Simple JWT)

**Data:** 2026-07-07
**Branch:** `107/feat-user-authentication` (a partir de `dev`)
**Status:** aprovado (design), aguardando revisão do spec

## Objetivo

Criar a camada de autenticação/cadastro de usuários (motoristas e passageiros)
no novo app `users`, no estilo Uber/99: um cadastro prévio antes de usar o
sistema. Login via JWT (Simple JWT). O app `trip` **não é modificado** — ele já
referencia `settings.AUTH_USER_MODEL` com `swappable_dependency` em todas as
migrations, então trocar o modelo de usuário não exige nenhuma alteração nele.

## Contexto atual (já verificado no código)

- Não existe app `users`. A auth usa o `auth.User` padrão via
  `settings.AUTH_USER_MODEL`.
- `trip.ProfileDriver.user`, `trip.Trip.driver` e `trip.Booking.passenger` já
  apontam para `settings.AUTH_USER_MODEL` (migrations usam
  `migrations.swappable_dependency`).
- `simplejwt` **não** está instalado (só DRF 3.17). O `settings.py` já tem um
  comentário pedindo pra trocar `BasicAuthentication` por Simple JWT.
- Auth atual: `BasicAuthentication` + `SessionAuthentication`,
  `IsAuthenticated` como permissão default.
- `conftest.py` (nível `src/`, infra de teste compartilhada) cria usuários com
  `create_user(username="driver", password="x")`.

## Decisões (confirmadas com o usuário)

1. **Login por e-mail** — `USERNAME_FIELD = 'email'`.
2. **Custom User + reset do `db.sqlite3` de dev** — forma correta de trocar
   `AUTH_USER_MODEL`; dados de dev atuais serão descartados.
3. **Um único `User`**; papel de motorista é definido pelo `trip.ProfileDriver`
   (que não tocamos). Qualquer usuário autenticado pode ser passageiro.

## Arquitetura

App novo `backend/src/users/` no layout flat do HackSoft (igual ao `trip`):

```
backend/src/users/
  __init__.py
  apps.py
  models.py        # User (AbstractBaseUser + PermissionsMixin) + UserManager
  services.py      # user_create (regra de negócio do cadastro)
  selectors.py     # user_get
  api.py           # RegisterApi, MeApi  (login/refresh vêm do simplejwt)
  urls.py
  admin.py
  migrations/
  tests/
    __init__.py
    test_api.py
    test_services.py
```

### Modelo `User`

`AbstractBaseUser` + `PermissionsMixin` (custom completo, login por e-mail).

Campos:

| Campo | Tipo | Observações |
|-------|------|-------------|
| `email` | `EmailField(unique=True)` | `USERNAME_FIELD` |
| `full_name` | `CharField` | nome completo |
| `cpf` | `CharField(max_length=11, unique=True)` | validação de 11 dígitos |
| `birth_date` | `DateField` | `age` exposto como `@property` derivada |
| `phone` | `CharField` | telefone |
| `is_active` | `BooleanField(default=True)` | padrão |
| `is_staff` | `BooleanField(default=False)` | acesso ao admin |
| `date_joined` | `DateTimeField(auto_now_add=True)` | padrão |

- `REQUIRED_FIELDS = ['full_name', 'cpf']` (usados pelo `createsuperuser`).
- `age` calculado a partir de `birth_date`.
- **Documentação de motorista (CNH/veículo) permanece no `trip.ProfileDriver`**
  (campo `is_verified`). O `User` guarda só identidade. Se for necessário um
  documento genérico (ex.: RG) depois, adiciona-se sem quebrar nada.

### `UserManager`

- `create_user(email, password=None, **extra)` — normaliza e-mail, `set_password`.
- `create_superuser(email, password, **extra)` — `is_staff=True`, `is_superuser=True`.

### Validação de CPF

Validador simples (11 dígitos numéricos) via `RegexValidator` no campo, mais
checagem de unicidade pelo próprio banco. Validação completa de dígito
verificador fica fora do escopo desta entrega (pode virar tarefa futura).

## Simple JWT

- Adicionar `djangorestframework-simplejwt` ao `requirements.txt` e instalar.
- `INSTALLED_APPS += ['users', 'rest_framework_simplejwt']`.
- `AUTH_USER_MODEL = 'users.User'`.
- `REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']`:
  - `rest_framework_simplejwt.authentication.JWTAuthentication`
  - `rest_framework.authentication.SessionAuthentication` (mantida p/ admin)
  - remover `BasicAuthentication`.
- Bloco `SIMPLE_JWT`: `ACCESS_TOKEN_LIFETIME` (ex.: 60 min),
  `REFRESH_TOKEN_LIFETIME` (ex.: 7 dias).
- `TokenObtainPairView` usa `User.USERNAME_FIELD`, então o login espera o campo
  `email` automaticamente — sem serializer custom.

## Endpoints

`core/urls.py` passa a incluir `users.urls`. As rotas do `trip` permanecem em
`/api/`.

| Método | Rota | View | Auth |
|--------|------|------|------|
| POST | `/api/auth/register/` | `RegisterApi` | `AllowAny` |
| POST | `/api/auth/login/` | `TokenObtainPairView` | `AllowAny` |
| POST | `/api/auth/refresh/` | `TokenRefreshView` | `AllowAny` |
| GET/PATCH | `/api/users/me/` | `MeApi` | `IsAuthenticated` |

### `RegisterApi`
- `InputSerializer`: `email`, `full_name`, `cpf`, `birth_date`, `phone`, `password`.
- Chama `services.user_create(...)`.
- `OutputSerializer`: dados públicos do usuário (sem senha). 201.

### `MeApi`
- `GET`: retorna o perfil do `request.user`.
- `PATCH`: atualiza campos permitidos (`full_name`, `phone`, `birth_date`).

## Fluxo de dados

1. Cliente → `POST /api/auth/register/` → `user_create` grava o `User`.
2. Cliente → `POST /api/auth/login/` (email+senha) → recebe `access`/`refresh`.
3. Requests autenticadas mandam `Authorization: Bearer <access>`.
4. `access` expira → `POST /api/auth/refresh/` com o `refresh`.

## Tratamento de erros

- Reaproveita `core.exceptions.exception_handler` (já configurado no DRF).
- Cadastro com e-mail/CPF duplicado → 400 com mensagem de validação.
- CPF fora do formato → 400.
- `/me/` sem token válido → 401.

## Impacto no banco e testes

- **Reset do `db.sqlite3`**: apagar o arquivo e rodar `migrate` do zero (troca de
  `AUTH_USER_MODEL` exige). Perde dados de dev.
- **Único arquivo fora de `users/` alterado:** `conftest.py`. As fixtures
  `driver_profile` e `passenger_user` passam de `create_user(username=...)` para
  `create_user(email=..., password=...)` (+ `full_name`/`cpf`/`birth_date`
  mínimos). **Nenhum arquivo dentro de `trip/` é modificado.**

## Testes (pytest / pytest-django, padrão do projeto)

`users/tests/test_services.py`:
- `user_create` cria usuário com senha hasheada.
- e-mail duplicado levanta erro.
- cpf duplicado levanta erro.

`users/tests/test_api.py`:
- `POST /register/` válido → 201 e usuário no banco.
- `POST /register/` com e-mail repetido → 400.
- `POST /login/` com credenciais válidas → 200 com `access`/`refresh`.
- `GET /me/` sem auth → 401; com `Bearer` válido → 200.

## Fora de escopo

- Logout/blacklist de refresh token (pode virar tarefa futura).
- Validação de dígito verificador de CPF.
- Verificação de motorista (CNH/veículo) — já é responsabilidade do `trip`.
- Recuperação de senha / verificação de e-mail.

## Git

Feature branch `107/feat-user-authentication` (a partir de `dev`) → PR para `dev`.
Nunca commitar direto no `dev`.
