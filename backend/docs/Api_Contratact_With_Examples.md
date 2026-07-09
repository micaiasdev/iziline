# Contrato de API Atual - Trip

**Data:** 2026-07-09  
**Fonte da verdade:** `backend/src/trip/urls.py` e `backend/src/trip/api.py`

## Escopo

Este documento descreve o contrato HTTP atualmente exposto pelo app `trip`.
As rotas entram com prefixo `/api/`.

O que foi considerado aqui:

- `backend/src/trip/urls.py`
- `backend/src/trip/api.py`
- selectors/services chamados pelos endpoints quando isso altera resposta ou regra observavel

## Rotas ativas

### Trips

- `GET /api/trips/search/`
- `POST /api/trips/`
- `GET /api/trips/mine/`
- `GET /api/trips/<trip_id>/`
- `GET /api/trips/<trip_id>/route/`
- `GET /api/trips/<trip_id>/cost/`
- `GET /api/trips/<trip_id>/fare-split/`
- `GET /api/trips/<trip_id>/fare-quote/`
- `POST /api/trips/<trip_id>/start/`
- `POST /api/trips/<trip_id>/finish/`
- `GET /api/trips/<trip_id>/location/`
- `POST /api/trips/<trip_id>/location/`
- `POST /api/trips/<trip_id>/reorder/`
- `POST /api/trips/<trip_id>/recalculate-route/`
- `GET /api/trips/<trip_id>/booking-requests/`

### Bookings

- `POST /api/bookings/`
- `GET /api/bookings/mine/`
- `POST /api/bookings/<booking_id>/cancel/`
- `POST /api/bookings/<booking_id>/accept/`
- `POST /api/bookings/<booking_id>/reject/`

### Cities

- `GET /api/cities/search/`
- `GET /api/cities/<city_id>/locations/`

## Serializers de saida compartilhados

### City

```json
{
  "id": 1,
  "name": "Teresina",
  "state": "PI"
}
```

### Location

```json
{
  "id": 10,
  "name": "Rodoviaria de Teresina",
  "formatted_address": "Av. Presidente Getulio Vargas, Teresina - PI",
  "latitude": -5.089,
  "longitude": -42.801,
  "city": {
    "id": 1,
    "name": "Teresina",
    "state": "PI"
  }
}
```

### TripStop

```json
{
  "id": 100,
  "order": 0,
  "location": {
    "id": 10,
    "name": "Rodoviaria de Teresina",
    "formatted_address": "Av. Presidente Getulio Vargas, Teresina - PI",
    "latitude": -5.089,
    "longitude": -42.801,
    "city": {
      "id": 1,
      "name": "Teresina",
      "state": "PI"
    }
  }
}
```

### TripCost

```json
{
  "trip_id": 1,
  "price_per_km": "1.00",
  "distance_km_snapshot": 340.5,
  "total_cost": "340.50",
  "created_at": "2026-07-09T12:00:00Z"
}
```

### TripListItem

```json
{
  "id": 1,
  "origin_city": {
    "id": 1,
    "name": "Teresina",
    "state": "PI"
  },
  "destine_city": {
    "id": 2,
    "name": "Fortaleza",
    "state": "CE"
  },
  "departure_time": "2026-07-09T14:00:00Z",
  "available_spots": 3,
  "status": "open",
  "total_distance_km": 340.5,
  "total_duration_min": 280.0,
  "cost": {
    "trip_id": 1,
    "price_per_km": "1.00",
    "distance_km_snapshot": 340.5,
    "total_cost": "340.50",
    "created_at": "2026-07-09T12:00:00Z"
  }
}
```

### MyTripItem

```json
{
  "role": "driver",
  "trip": {
    "id": 1,
    "origin_city": {
      "id": 1,
      "name": "Teresina",
      "state": "PI"
    },
    "destine_city": {
      "id": 2,
      "name": "Fortaleza",
      "state": "CE"
    },
    "departure_time": "2026-07-09T14:00:00Z",
    "available_spots": 3,
    "status": "open",
    "total_distance_km": 340.5,
    "total_duration_min": 280.0,
    "cost": {
      "trip_id": 1,
      "price_per_km": "1.00",
      "distance_km_snapshot": 340.5,
      "total_cost": "340.50",
      "created_at": "2026-07-09T12:00:00Z"
    }
  }
}
```

### TripRoute

```json
{
  "id": 1,
  "line_trip": {
    "type": "LineString",
    "coordinates": [
      [-42.801, -5.089],
      [-38.543, -3.717]
    ]
  },
  "total_distance_km": 340.5,
  "total_duration_min": 280.0,
  "status": "open",
  "updated_at": "2026-07-09T12:10:00Z"
}
```

### TripDetail

```json
{
  "id": 1,
  "driver": 5,
  "origin_city": {
    "id": 1,
    "name": "Teresina",
    "state": "PI"
  },
  "destine_city": {
    "id": 2,
    "name": "Fortaleza",
    "state": "CE"
  },
  "departure_time": "2026-07-09T14:00:00Z",
  "available_spots": 3,
  "available_seats": 2,
  "status": "open",
  "line_trip": {
    "type": "LineString",
    "coordinates": [
      [-42.801, -5.089],
      [-38.543, -3.717]
    ]
  },
  "total_distance_km": 340.5,
  "total_duration_min": 280.0,
  "cost": {
    "trip_id": 1,
    "price_per_km": "1.00",
    "distance_km_snapshot": 340.5,
    "total_cost": "340.50",
    "created_at": "2026-07-09T12:00:00Z"
  },
  "stops": [
    {
      "id": 100,
      "order": 0,
      "location": {
        "id": 10,
        "name": "Rodoviaria de Teresina",
        "formatted_address": "Av. Presidente Getulio Vargas, Teresina - PI",
        "latitude": -5.089,
        "longitude": -42.801,
        "city": {
          "id": 1,
          "name": "Teresina",
          "state": "PI"
        }
      }
    },
    {
      "id": 101,
      "order": 1,
      "location": {
        "id": 20,
        "name": "Rodoviaria de Fortaleza",
        "formatted_address": "Av. Borges de Melo, Fortaleza - CE",
        "latitude": -3.717,
        "longitude": -38.543,
        "city": {
          "id": 2,
          "name": "Fortaleza",
          "state": "CE"
        }
      }
    }
  ],
  "started_at": null,
  "finished_at": null,
  "created_at": "2026-07-09T12:00:00Z",
  "updated_at": "2026-07-09T12:00:00Z"
}
```

### Booking

```json
{
  "id": 1,
  "trip": 1,
  "passenger": 9,
  "pickup_stop": {
    "id": 100,
    "order": 0,
    "location": {
      "id": 10,
      "name": "Rodoviaria de Teresina",
      "formatted_address": "Av. Presidente Getulio Vargas, Teresina - PI",
      "latitude": -5.089,
      "longitude": -42.801,
      "city": {
        "id": 1,
        "name": "Teresina",
        "state": "PI"
      }
    }
  },
  "dropoff_stop": {
    "id": 101,
    "order": 1,
    "location": {
      "id": 20,
      "name": "Rodoviaria de Fortaleza",
      "formatted_address": "Av. Borges de Melo, Fortaleza - CE",
      "latitude": -3.717,
      "longitude": -38.543,
      "city": {
        "id": 2,
        "name": "Fortaleza",
        "state": "CE"
      }
    }
  },
  "status": "pending",
  "created_at": "2026-07-09T12:00:00Z",
  "confirmed_at": null
}
```

### DriverLocation

```json
{
  "trip_id": 1,
  "latitude": -5.089,
  "longitude": -42.801,
  "updated_at": "2026-07-09T14:05:00Z"
}
```

### TripFareSplit

```json
{
  "trip_id": 1,
  "total_cost": "340.50",
  "covered_amount": "170.25",
  "driver_amount": "170.25",
  "confirmed_passengers": 1,
  "split": [
    {
      "booking_id": 10,
      "passenger_id": 9,
      "amount": "170.25"
    }
  ]
}
```

### TripFareQuote

```json
{
  "trip_id": 1,
  "pickup_stop_id": 100,
  "dropoff_stop_id": 101,
  "estimated_amount": "85.13",
  "total_cost": "340.50",
  "current_confirmed_passengers": 1
}
```

### ChatMessage

```json
{
  "id": 1,
  "sender_id": 9,
  "sender_name": "Maria Silva",
  "content": "Oi, podemos combinar o ponto de embarque?",
  "sent_at": "2026-07-09T12:00:00Z"
}
```

## Endpoints

### GET `/api/trips/search/`

Busca viagens abertas.

Query params:

- `origin_city_id` `int` obrigatorio
- `destine_city_id` `int` obrigatorio
- `date_start` `datetime` opcional
- `date_end` `datetime` opcional

Resposta `200`:

- lista de `TripListItem`

Observacoes:

- So retorna trips com `status=open`.
- Se `date_start` e `date_end` vierem, aplica `departure_time__range`.
- Se vier apenas `date_start`, aplica `departure_time__gte=date_start`.
- Se nenhum vier, filtra trips a partir de `timezone.now()`.

### POST `/api/trips/`

Cria uma viagem.

Body:

```json
{
  "origin_city_id": 1,
  "destine_city_id": 2,
  "departure_time": "2026-07-09T14:00:00Z",
  "available_spots": 3,
  "origin_location_id": 10,
  "destination_location_id": 20,
  "intermediate_location_ids": [11, 12]
}
```

Resposta `201`:

- payload `TripDetail`

Observacoes:

- `intermediate_location_ids` e opcional e default `[]`.
- O motorista nao vem do body; vem de `request.user.driver_profile`.
- A criacao da trip tambem calcula rota e cria `TripCost`.

### GET `/api/bookings/<booking_id>/messages/`

Lista mensagens do chat da reserva.

Params:

- `booking_id` `int` obrigatorio na URL

Query params:

- `after` `int` opcional

Resposta `200`:

```json
[
  {
    "id": 1,
    "sender_id": 9,
    "sender_name": "Maria Silva",
    "content": "Oi, podemos combinar o ponto de embarque?",
    "sent_at": "2026-07-09T12:00:00Z"
  }
]
```

Observacoes:

- Exige autenticacao.
- Esse chat e privado, 1:1.
- So podem acessar:
  - o passageiro dono do booking
  - o motorista da trip desse booking
- So fica disponivel enquanto o booking estiver com `status=pending`.
- Se `after` vier, retorna apenas mensagens com `id > after`.

### POST `/api/bookings/<booking_id>/messages/`

Envia mensagem no chat da reserva.

Params:

- `booking_id` `int` obrigatorio na URL

Body:

```json
{
  "content": "Posso embarcar na rodoviaria?"
}
```

Resposta `201`:

```json
{
  "id": 2,
  "sender_id": 9,
  "sender_name": "Maria Silva",
  "content": "Posso embarcar na rodoviaria?",
  "sent_at": "2026-07-09T12:05:00Z"
}
```

Observacoes:

- Exige autenticacao.
- Usa as mesmas regras de acesso do `GET`.
- O backend aplica `trim()` no conteudo.
- Conteudo vazio retorna `400`.

### GET `/api/trips/<trip_id>/messages/`

Lista mensagens do chat da viagem.

Params:

- `trip_id` `int` obrigatorio na URL

Query params:

- `after` `int` opcional

Resposta `200`:

```json
[
  {
    "id": 10,
    "sender_id": 5,
    "sender_name": "Carlos Motorista",
    "content": "Pessoal, saida em 10 minutos.",
    "sent_at": "2026-07-09T13:00:00Z"
  },
  {
    "id": 11,
    "sender_id": 9,
    "sender_name": "Maria Silva",
    "content": "Perfeito, ja estou no local.",
    "sent_at": "2026-07-09T13:01:00Z"
  }
]
```

Observacoes:

- Exige autenticacao.
- Esse chat e em grupo.
- Todos consultam a mesma conversa da viagem.
- So podem acessar:
  - o motorista da trip
  - passageiros com `Booking` `confirmed` nessa trip
- Passageiro com booking `pending`, `rejected` ou `cancelled` nao entra.
- Se `after` vier, retorna apenas mensagens com `id > after`.

### POST `/api/trips/<trip_id>/messages/`

Envia mensagem no chat da viagem.

Params:

- `trip_id` `int` obrigatorio na URL

Body:

```json
{
  "content": "Estou chegando."
}
```

Resposta `201`:

```json
{
  "id": 12,
  "sender_id": 9,
  "sender_name": "Maria Silva",
  "content": "Estou chegando.",
  "sent_at": "2026-07-09T13:02:00Z"
}
```

Observacoes:

- Exige autenticacao.
- Usa as mesmas regras de acesso do `GET`.
- O backend aplica `trim()` no conteudo.
- Conteudo vazio retorna `400`.

### GET `/api/trips/<trip_id>/`

Resposta `200`:

- lista de `MyTripItem`

Observacoes:

- Cada item vem com `role`, que pode ser `driver` ou `passenger`.
- Como `passenger`, o usuario entra apenas em trips onde tem `Booking` com `status=confirmed`.
- O retorno e ordenado por `trip.departure_time`.

### GET `/api/trips/<trip_id>/`

Retorna o detalhe completo da viagem.

Resposta `200`:

- payload `TripDetail`

### GET `/api/trips/<trip_id>/route/`

Retorna apenas os dados de rota da trip.

Resposta `200`:

- payload `TripRoute`

### GET `/api/trips/<trip_id>/cost/`

Retorna o snapshot fixo de custo da viagem.

Resposta `200`:

- payload `TripCost`

Observacoes:

- O custo e criado no `POST /api/trips/`.
- O custo usa a rota e o `PRICE_PER_KM` vigente naquele momento.
- O custo fixo nao muda depois, mesmo se a rota for recalculada.

### GET `/api/trips/<trip_id>/fare-split/`

Retorna o rateio atual entre passageiros confirmados e motorista.

Resposta `200`:

- payload `TripFareSplit`

Observacoes:

- `covered_amount` e a soma cobrada dos passageiros confirmados.
- `driver_amount` e a parte restante atribuida ao motorista.
- Cada trecho da rota e dividido entre motorista e passageiros que ocupam aquele trecho.

### GET `/api/trips/<trip_id>/fare-quote/`

Retorna a cotacao estimada para um passageiro antes do booking.

Query params:

- `pickup_stop_id` `int` obrigatorio
- `dropoff_stop_id` `int` obrigatorio

Resposta `200`:

- payload `TripFareQuote`

Observacoes:

- A cotacao usa os passageiros confirmados atuais e simula a entrada de mais um passageiro.
- `current_confirmed_passengers` nao inclui o passageiro projetado.
- Retorna erro de regra se o ponto de embarque nao vier antes do desembarque.

### POST `/api/trips/<trip_id>/start/`

Inicia a viagem.

Body:

- sem body

Resposta `200`:

- payload `TripDetail`

Observacoes:

- Exige motorista dono da trip.
- So funciona com `status=open` ou `status=full`.
- Exige ao menos um `Booking` com `status=confirmed`.
- So pode ser executado entre `departure_time - 1h` e `departure_time + 1h`.

### POST `/api/trips/<trip_id>/finish/`

Finaliza a viagem.

Body:

- sem body

Resposta `200`:

- payload `TripDetail`

Observacoes:

- Exige motorista dono da trip.
- So funciona com `status=in_progress`.

### GET `/api/trips/<trip_id>/location/`

Retorna a ultima localizacao conhecida do motorista.

Resposta `200`:

- payload `DriverLocation`

Observacoes:

- So funciona com `status=in_progress`.
- So pode consultar quem participa da viagem.
- Participante = motorista da trip ou passageiro com booking `confirmed`.
- Se ainda nao existir localizacao salva, o lookup termina em `404`.

### POST `/api/trips/<trip_id>/location/`

Cria ou atualiza a localizacao atual do motorista.

Body:

```json
{
  "latitude": -5.089,
  "longitude": -42.801
}
```

Resposta `200`:

- payload `DriverLocation`

Observacoes:

- So o motorista dono da trip pode atualizar.
- So funciona com `status=in_progress`.
- Faz upsert: cria no primeiro envio e atualiza nos proximos.
- `latitude` deve estar entre `-90` e `90`.
- `longitude` deve estar entre `-180` e `180`.

### POST `/api/trips/<trip_id>/reorder/`

Atualiza apenas o `order` dos stops da trip.

Body:

```json
{
  "stop_orders": [
    { "stop_id": 100, "order": 0 },
    { "stop_id": 101, "order": 1 },
    { "stop_id": 102, "order": 2 }
  ]
}
```

Resposta `204`:

- sem corpo

Observacoes:

- Exige motorista dono da trip.
- So pode ser usado com `status=open` ou `status=full`.
- A lista deve incluir todos os stops da viagem, e somente eles.
- Nao recalcula o mapa sozinho; isso acontece em `/recalculate-route/`.
- A validacao atual exige `order` unico, mas nao exige sequencia contigua.

### POST `/api/trips/<trip_id>/recalculate-route/`

Recalcula a rota da trip com base na ordem atual dos stops.

Body:

- sem body

Resposta `200`:

- payload `TripDetail`

Observacoes:

- Exige motorista dono da trip.
- So pode ser usado com `status=open` ou `status=full`.
- Atualiza `line_trip`, `total_distance_km`, `total_duration_min` e `route_legs`.
- Nao recria `TripCost`.

### GET `/api/trips/<trip_id>/booking-requests/`

Lista booking requests da viagem na visao do motorista.

Query params:

- `status` `string` opcional
- default: `pending`
- valor especial `all` remove o filtro

Resposta `200`:

- lista de `Booking`

Observacoes:

- Exige motorista dono da trip.
- Sem query param, filtra `pending`.

### POST `/api/bookings/`

Cria uma solicitacao de reserva.

Body:

```json
{
  "trip_id": 1,
  "pickup_stop_id": 100,
  "dropoff_stop_id": 101
}
```

Resposta `201`:

- payload `Booking`

Observacoes:

- So cria request quando a trip estiver com `status=open`.
- `pickup_stop` precisa vir antes de `dropoff_stop`.
- A trip precisa ter vaga disponivel no momento da criacao.

### GET `/api/bookings/mine/`

Lista reservas do passageiro autenticado.

Resposta `200`:

- lista de `Booking`

### POST `/api/bookings/<booking_id>/cancel/`

Cancela uma reserva do passageiro.

Resposta `200`:

- payload `Booking`

Observacoes:

- So o passageiro dono do booking pode cancelar.
- So cancela bookings com `status=pending`.
- O status resultante e `cancelled`.

### POST `/api/bookings/<booking_id>/accept/`

Aceita uma solicitacao de reserva.

Resposta `200`:

- payload `Booking`

Observacoes:

- Exige motorista dono da trip.
- So aceita requests pendentes.
- So pode ser usado enquanto a trip estiver com `status=open` ou `status=full`.
- Ao aceitar, o booking vira `confirmed`.
- Ao aceitar, a rota da trip e recalculada.
- Se a ultima vaga for ocupada, a trip vira `full`.

### POST `/api/bookings/<booking_id>/reject/`

Recusa uma solicitacao de reserva.

Resposta `200`:

- payload `Booking`

Observacoes:

- Exige motorista dono da trip.
- So recusa requests pendentes.
- So pode ser usado enquanto a trip estiver com `status=open` ou `status=full`.
- O status resultante e `rejected`.

### GET `/api/cities/search/`

Busca cidades para autocomplete.

Query params:

- `q` `string` obrigatorio
- minimo de 2 caracteres

Resposta `200`:

```json
[
  {
    "id": 1,
    "label": "Teresina-PI"
  }
]
```

### GET `/api/cities/<city_id>/locations/`

Lista locations de uma cidade.

Resposta `200`:

- lista de `Location`

## Regras gerais observadas no codigo

- As views usam `AllowAny`, mas varias acoes dependem de `request.user`.
- Acoes de motorista chamam `_get_driver_profile(request)`.
- `driver` e `passenger` saem como IDs brutos.
- `available_seats` e calculado dinamicamente.
- `TripDetail` e `TripListItem` incluem `cost`.
- `GET /api/trips/mine/` mistura viagens do usuario como motorista e como passageiro confirmado.
- `GET /api/trips/<trip_id>/route/` expoe um payload mais enxuto de rota que `TripDetail`.

## Regras e comportamento observados no codigo

- Quase todas as views usam `AllowAny`, mas varias dependem de `request.user`.
- Os endpoints de chat usam `IsAuthenticated`.
- As acoes de motorista exigem `request.user.driver_profile`.
- `driver` e `passenger` saem como IDs brutos, nao como objetos aninhados.
- `available_seats` e calculado dinamicamente por `selectors.get_available_seats`.
- O endpoint de listagem de booking requests filtra `pending` por padrao.
- `TripDetail` agora inclui `started_at` e `finished_at`.
- Existe `DriverLocation`, que guarda apenas a localizacao atual do motorista.
- Existe suporte a chat em dois contextos diferentes:
  - reserva pendente: `bookings/<booking_id>/messages/`
  - viagem confirmada: `trips/<trip_id>/messages/`
- O payload de mensagem e o mesmo para motorista e passageiro; o frontend decide a exibicao comparando `sender_id` com o usuario logado.
- O chat da reserva e uma conversa privada de negociacao.
- O chat da viagem e uma conversa em grupo.

## Regras do ciclo da viagem

- `POST /api/trips/<trip_id>/start/` exige que o usuario autenticado seja o dono da trip.
- `start` so funciona com `status=open` ou `status=full`.
- `start` exige pelo menos um `Booking` com `status=confirmed`.
- `start` so funciona dentro da janela `departure_time - 1h` ate `departure_time + 1h`.
- Ao iniciar, a trip vira `in_progress` e `started_at` recebe o horario atual.
- `POST /api/trips/<trip_id>/finish/` exige que o usuario autenticado seja o dono da trip.
- `finish` so funciona com `status=in_progress`.
- Ao finalizar, a trip vira `finished` e `finished_at` recebe o horario atual.
- `GET /api/trips/<trip_id>/location/` e `POST /api/trips/<trip_id>/location/` so funcionam com `status=in_progress`.
- A localizacao do motorista e acessivel apenas para participantes da viagem.

## Status e valores relevantes

### Trip.status

- `open`
- `full`
- `in_progress`
- `finished`
- `cancelled`

### Booking.status

- `pending`
- `confirmed`
- `rejected`
- `cancelled`
