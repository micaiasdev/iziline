# Design — Reserva (Booking)

**Data:** 2026-06-10
**Autor:** Eduardo Melo de Carvalho
**Issues cobertas:** #25 (model Booking), #26 (POST reserva transacional), #27 (GET agenda do usuário)

## Objetivo

Implementar o bloco de Reserva, que sustenta as histórias US-05 (Reservar vaga
automaticamente) e US-06 (Agenda de Viagens): um passageiro reserva uma vaga em
uma viagem (decrementando as vagas disponíveis com segurança de concorrência) e
visualiza suas viagens — criadas como motorista ou reservadas como passageiro —
separadas em próximas e histórico.

## Arquitetura

Novo app Django `booking` (singular, espelhando `trip`), em layout flat estilo
HackSoft idêntico ao do app `trip`:

| Camada | Responsabilidade |
|--------|------------------|
| `apis.py` | Views finas (APIView). Sem regra de negócio. |
| `services.py` | Escrita + regras de negócio (`booking_create`). |
| `selectors.py` | Consultas (`user_agenda`). |
| `serializers.py` | I/O JSON. Saída read-only. |
| `models.py` | `Booking` (ORM puro). |

`booking` depende de `trip` (FK para `Trip`); `trip` nunca depende de `booking`.

## Estrutura de arquivos

```
backend/src/booking/
├── __init__.py
├── apps.py            → BookingConfig
├── admin.py           → registro do Booking
├── models.py          → Booking
├── serializers.py     → BookingCreateSerializer, BookingDetailSerializer, AgendaTripSerializer
├── services.py        → booking_create()
├── selectors.py       → user_agenda()
├── apis.py            → BookingCreateApi, UserAgendaApi
├── urls.py            → rotas do app
├── tests.py           → testes do bloco
└── migrations/
core/settings.py        → adicionar 'booking' a INSTALLED_APPS
core/urls.py            → include('booking.urls') sob /api/bookings/
```

## Model `Booking` (#25)

```
trip          ForeignKey(Trip, on_delete=CASCADE, related_name='bookings')
passenger     ForeignKey(AUTH_USER_MODEL, on_delete=CASCADE, related_name='bookings')
is_cancelled  BooleanField(default=False)
created_at    DateTimeField(auto_now_add=True)
updated_at    DateTimeField(auto_now=True)

class Meta:
    ordering = ['-created_at']
    constraints = [
        UniqueConstraint(
            fields=['trip', 'passenger'],
            condition=Q(is_cancelled=False),
            name='unique_active_booking_per_passenger_per_trip',
        )
    ]
```

A constraint é **parcial** (só reservas ativas): impede reserva ativa duplicada,
mas permite reservar de novo após um cancelamento (o registro cancelado antigo
não bloqueia). É a rede de segurança contra condição de corrida.

## Service `booking_create(*, trip_id, passenger)` (#26)

Executa dentro de `transaction.atomic()`; a linha do `Trip` é travada com
`select_for_update()` antes de revalidar e decrementar as vagas, garantindo o
tratamento de concorrência exigido pela US-05.

Validações, nesta ordem:

1. Viagem existe (`select_for_update`) — senão `Http404` (→ 404).
2. Viagem não cancelada (`is_cancelled=False`) — senão `ValidationError` (→ 400).
3. `departure_at` no futuro — não reservar viagem passada (→ 400).
4. `passenger != trip.driver` — motorista não reserva a própria viagem (→ 400).
5. Não existe reserva ativa do mesmo passageiro nessa viagem (→ 400).
6. `seats_available > 0`, revalidado dentro do lock (→ 400).

Em sucesso: decrementa `trip.seats_available` em 1, salva a viagem, cria a
`Booking` e a retorna.

## Selector `user_agenda(*, user, when)` (#27)

Retorna um queryset de **Trips** vinculadas ao usuário, anotadas com o papel:

- Viagens onde `trip.driver == user` (papel `driver`), OU
- Viagens com uma `Booking` ativa do usuário (`bookings__passenger=user`,
  `bookings__is_cancelled=False`) (papel `passenger`).

Um usuário nunca é motorista e passageiro da mesma viagem (regra 4 do service),
então o papel é sempre único por viagem.

- `when="upcoming"` (padrão): `departure_at >= agora`.
- `when="past"`: `departure_at < agora`.
- `select_related('driver')`, `distinct()`, ordenado por `departure_at`.

O papel é resolvido via anotação no queryset (ex.: `Case/When` sobre
`driver_id == user.id`).

## Serializers

- **`BookingCreateSerializer`** (entrada): campo `trip` (PrimaryKeyRelatedField
  para `Trip`). `passenger` nunca vem do corpo — é `request.user`.
- **`BookingDetailSerializer`** (saída, read-only): `id`, `trip` (id), `passenger_name`
  (get_full_name → username), `is_cancelled`, `created_at`.
- **`AgendaTripSerializer`** (saída, read-only): campos da Trip
  (`id`, `driver_name`, `origin`, `destination`, `departure_at`, `seats_available`,
  `price`, `is_cancelled`) + `role` (`driver`/`passenger`).

## Endpoints

### POST /api/bookings/ — reservar (#26)
- Auth: `IsAuthenticated`. Body: `{"trip": <id>}`.
- Valida com `BookingCreateSerializer`, chama `booking_create(trip_id=..., passenger=request.user)`.
- Sucesso: `201` com `BookingDetailSerializer`.
- Erros: `404` viagem inexistente; `400` regras de negócio; `401` sem auth.

### GET /api/bookings/my-trips/ — agenda (#27)
- Auth: `IsAuthenticated`. Query param `when` = `upcoming` (padrão) ou `past`.
- Chama `user_agenda(user=request.user, when=...)`, paginado (mesma
  `PageNumberPagination`, page size 10).
- Sucesso: `200` paginado com `AgendaTripSerializer`. `when` inválido → `400`.

## Tratamento de erros

| Situação | Status |
|----------|--------|
| Viagem inexistente (reserva) | 404 |
| Cancelada / passada / sem vaga / própria viagem / reserva duplicada | 400 |
| `when` inválido na agenda | 400 |
| Sem autenticação | 401 |

Regras de negócio levantam `rest_framework.exceptions.ValidationError` no service;
a camada de API não duplica a validação.

## Configuração necessária

- `INSTALLED_APPS += ['booking']`.
- `core/urls.py`: `path('api/bookings/', include('booking.urls'))`.
- Reutiliza a config DRF existente (auth, `IsAuthenticated`, paginação por-view).
- A paginação da agenda usa uma classe `PageNumberPagination` (page size 10, igual
  à `TripPagination`); reaproveitar/duplicar a classe é decisão do plano.

## Testes (TDD)

`booking/tests.py`:

- **Model:** criação válida; a constraint parcial impede 2ª reserva ativa do mesmo
  passageiro; permite nova reserva após cancelar a anterior.
- **`booking_create`:** sucesso decrementa `seats_available` em 1 e cria Booking;
  rejeita viagem cancelada, viagem passada, motorista reservando a própria viagem,
  reserva duplicada ativa, viagem sem vaga; viagem inexistente levanta 404.
- **`user_agenda`:** inclui viagens como motorista e como passageiro com `role`
  correto; exclui reservas canceladas; split `upcoming`/`past` por `departure_at`;
  não duplica viagens.
- **Endpoints:** `POST` 201 decrementa vaga; 400 nas regras; 401 sem auth; 404
  viagem inexistente; `GET my-trips` paginado, filtra por `when`, 400 em `when`
  inválido, 401 sem auth.

## Fora de escopo

- Cancelamento de reserva (#30) e de viagem (#31) — bloco seguinte. O model já
  suporta (`is_cancelled` + devolução de vaga espelhando o decremento).
- Pagamento, chat (#28/#29), frontend.
- Migração para PostgreSQL e Simple JWT.
