# Design — Endpoints de Viagem (Trip)

**Data:** 2026-06-10
**Autor:** Eduardo Melo de Carvalho
**Issues cobertas:** #10, #23, #24, #13 (mock), #14 (já feito)

## Objetivo

Implementar os endpoints REST do módulo de Viagens (Trip) que sustentam as
histórias US-01 (Criar Viagem), US-03 (Buscar Caronas) e US-04 (Visualizar
Detalhes), seguindo a arquitetura definida na wiki do projeto.

## Arquitetura

O backend segue o estilo HackSoft (camadas separadas), conforme a wiki:

| Camada | Responsabilidade |
|--------|------------------|
| **API** (`apis.py`) | Views finas. Recebe request, valida auth/permissão, serializa, chama service/selector. **Sem regra de negócio.** |
| **Services** (`services.py`) | Operações de escrita e regras de negócio. |
| **Selectors** (`selectors.py`) | Consultas/leitura. Não alteram estado. |
| **Serializers** (`serializers.py`) | Entrada/saída JSON. |
| **Models** (`models.py`) | ORM puro (já existe). |

### Decisão de estrutura

Mantemos o app `trip` (singular) com layout **flat** — arquivos
`services.py`, `selectors.py`, `serializers.py`, `apis.py`, `urls.py` na raiz
do app — em vez do layout aninhado `api/` da wiki. Motivo: o app `trip` já
existe com migration aplicada; renomear/reestruturar agora geraria churn sem
ganho. A separação de responsabilidades HackSoft é preservada. A migração para
o layout aninhado pode ser feita depois, junto com a adoção de PostgreSQL.

## Estrutura de arquivos

```
backend/src/trip/
├── models.py        (existe — sem mudança)
├── serializers.py   NOVO  → TripCreateSerializer, TripDetailSerializer, TripListSerializer
├── services.py      (existe, vazio) → trip_create(), calculate_fare()
├── selectors.py     NOVO  → trip_list(), trip_get()
├── apis.py          (existe, vazio) → TripListCreateApi, TripDetailApi (APIView)
├── urls.py          NOVO  → rotas do app
└── tests.py         (existe) → testes dos endpoints
core/urls.py         → include('trip.urls') sob /api/trips/
```

## Endpoints

### 1. POST /api/trips/ — Criar viagem (#10, #13)

- **Auth:** `IsAuthenticated`.
- **`driver`** vem de `request.user`, nunca do body.
- **Body de entrada:** `origin`, `destination`, `departure_at`, `seats_available`.
- **`price` NÃO vem do body** — é calculado no service.
- **Service `trip_create(...)`:**
  - Valida `departure_at` no futuro → senão `ValidationError`.
  - Valida `seats_available >= 1`.
  - Chama `calculate_fare(origin, destination, seats_available)` para o rateio.
  - Persiste e retorna a `Trip`.
- **Resposta:** `201 Created` com a viagem serializada (incluindo `price`).
- **Erros:** `400` para validação/regra de negócio; `401` sem auth.

### 2. GET /api/trips/ — Buscar com filtros (#23)

- **Auth:** `IsAuthenticated`.
- **Query params:** `origin`, `destination`, `date` (formato `YYYY-MM-DD`) — todos opcionais.
- **Selector `trip_list(filters)`:**
  - Filtra por `origin`/`destination` case-insensitive (`icontains`).
  - Filtra por `date` (dia de `departure_at`) quando informado.
  - Retorna **apenas** viagens com `seats_available > 0`, `departure_at` futura
    e `is_cancelled = False`.
  - `select_related('driver')` para performance.
- **Paginação:** obrigatória (PageNumberPagination, page size padrão).
- **Resposta:** `200 OK` com lista paginada. Lista vazia retorna `200` com
  `results: []` (frontend exibe mensagem amigável).

### 3. GET /api/trips/{id}/ — Detalhe (#24)

- **Auth:** `IsAuthenticated`.
- **Selector `trip_get(trip_id)`:** retorna a viagem ou levanta `Http404`.
- **Resposta:** `200 OK` com nome do motorista, origem, destino, data/hora,
  valor do rateio e vagas restantes. `404` se não existe.

## Cálculo de rateio — mock (#13)

`calculate_fare(origin, destination, seats_available)` em `services.py`:

- Estima distância via tabela fixa de pares de cidades conhecidas
  (ex.: Teresina↔Parnaíba), com fallback para uma distância default quando o
  par é desconhecido.
- `custo_total = distancia_km * CUSTO_POR_KM` (constante, ex.: `R$ 0,30/km`).
- `rateio = custo_total / (seats_available + 1)` (passageiros + motorista),
  conforme critério de aceite da US-02.
- Retorna `Decimal` arredondado a 2 casas.
- **Interface estável:** assinatura preparada para, no futuro, delegar à Google
  Routes API sem alterar `trip_create()` nem os endpoints. A integração externa
  real fica fora do escopo desta entrega.

## Serializers

- **`TripCreateSerializer`** (entrada): `origin`, `destination`, `departure_at`,
  `seats_available`. Não inclui `price` nem `driver`.
- **`TripDetailSerializer`** (saída): todos os campos relevantes +
  `driver_name` (nome do motorista).
- **`TripListSerializer`** (saída): subconjunto para cards de busca.

## Tratamento de erros

| Situação | Status |
|----------|--------|
| Campos obrigatórios ausentes / formato inválido | `400` |
| Regra de negócio (data passada, `seats_available < 1`) | `400` |
| Sem autenticação | `401` |
| Viagem não encontrada (detalhe) | `404` |

Regras de negócio levantam `rest_framework.exceptions.ValidationError` dentro do
service; a camada de API não duplica essa validação.

## Configuração necessária

- `REST_FRAMEWORK` em `settings.py`: `DEFAULT_AUTHENTICATION_CLASSES`,
  `DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]`, `DEFAULT_PAGINATION_CLASS`.
- Por enquanto `SessionAuthentication` (começar simples); a migração para Simple
  JWT é trocar a config, sem mexer nos endpoints.

## Testes (TDD)

`trip/tests.py`:

- **Criar:** viagem válida (`201`, `price` calculado); data passada (`400`);
  sem auth (`401`); `seats_available = 0` (`400`).
- **Buscar:** sem filtros lista futuras com vaga; filtro por origem/destino/data;
  exclui lotadas / passadas / canceladas; lista vazia retorna `200`.
- **Detalhe:** existente (`200`, contém nome do motorista); inexistente (`404`).

## Fora de escopo

- Migração SQLite → PostgreSQL.
- Integração real com Google Routes API (mantém-se o mock).
- Simple JWT real (mantém-se auth de sessão).
- Reserva, chat, cancelamento (issues #25–#31) e todo o frontend.
- Restruturação para o layout aninhado `api/` da wiki.
