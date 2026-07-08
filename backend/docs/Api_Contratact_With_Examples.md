# Contrato de API Atual - Trip

**Data:** 2026-07-08
**Fonte da verdade:** `backend/src/trip/urls.py` e `backend/src/trip/api.py`

## Escopo

Este documento descreve o contrato atual exposto pelo app `trip`.
As rotas entram pelo prefixo `/api/`, conforme `backend/src/core/urls.py`.

O arquivo `backend/src/trip/apis.py` e o design antigo em `docs/` nao fazem
parte do contrato atual.

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
  "name": "Rodoviaria",
  "formatted_address": "Av. ...",
  "latitude": -5.09,
  "longitude": -42.8,
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
    "name": "Rodoviaria",
    "formatted_address": "Av. ...",
    "latitude": -5.09,
    "longitude": -42.8,
    "city": {
      "id": 1,
      "name": "Teresina",
      "state": "PI"
    }
  }
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
      "name": "Rodoviaria",
      "formatted_address": "Av. ...",
      "latitude": -5.09,
      "longitude": -42.8,
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
      "name": "Destino",
      "formatted_address": "Rua ...",
      "latitude": -2.9,
      "longitude": -41.77,
      "city": {
        "id": 2,
        "name": "Parnaiba",
        "state": "PI"
      }
    }
  },
  "status": "pending",
  "created_at": "2026-07-08T12:00:00Z",
  "confirmed_at": null
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
    "name": "Parnaiba",
    "state": "PI"
  },
  "departure_time": "2026-07-08T14:00:00Z",
  "available_spots": 3,
  "available_seats": 2,
  "status": "open",
  "line_trip": {},
  "total_distance_km": 340.5,
  "total_duration_min": 280.0,
  "stops": [],
  "started_at": null,
  "finished_at": null,
  "created_at": "2026-07-08T12:00:00Z",
  "updated_at": "2026-07-08T12:10:00Z"
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
    "name": "Parnaiba",
    "state": "PI"
  },
  "departure_time": "2026-07-08T14:00:00Z",
  "available_spots": 3,
  "status": "open",
  "total_distance_km": 340.5,
  "total_duration_min": 280.0
}
```

## Endpoints

### GET `/api/trips/search/`

Busca viagens abertas para passageiro.

Query params:

- `origin_city_id` `int` obrigatorio
- `destine_city_id` `int` obrigatorio
- `date_start` `datetime` opcional
- `date_end` `datetime` opcional

Resposta `200`:

```json
[
  {
    "id": 1,
    "origin_city": {
      "id": 1,
      "name": "Teresina",
      "state": "PI"
    },
    "destine_city": {
      "id": 2,
      "name": "Parnaiba",
      "state": "PI"
    },
    "departure_time": "2026-07-08T14:00:00Z",
    "available_spots": 3,
    "status": "open",
    "total_distance_km": 340.5,
    "total_duration_min": 280.0
  }
]
```

Observacoes:

- Se `date_start` e `date_end` vierem, aplica `departure_time__range`.
- Se vier apenas `date_start`, aplica `departure_time__gte=date_start`.
- Se nenhum vier, filtra viagens a partir de `timezone.now()`.
- So retorna trips com `status=open`.

### POST `/api/trips/`

Cria uma viagem.

Body:

```json
{
  "origin_city_id": 1,
  "destine_city_id": 2,
  "departure_time": "2026-07-08T14:00:00Z",
  "available_spots": 3,
  "origin_location_id": 10,
  "destination_location_id": 20,
  "intermediate_location_ids": [11, 12]
}
```

Resposta `201`:

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
    "name": "Parnaiba",
    "state": "PI"
  },
  "departure_time": "2026-07-08T14:00:00Z",
  "available_spots": 3,
  "available_seats": 3,
  "status": "open",
  "line_trip": {},
  "total_distance_km": 340.5,
  "total_duration_min": 280.0,
  "stops": [],
  "started_at": null,
  "finished_at": null,
  "created_at": "2026-07-08T12:00:00Z",
  "updated_at": "2026-07-08T12:00:00Z"
}
```

Observacoes:

- `intermediate_location_ids` e opcional e default `[]`.
- O motorista nao vem do body; vem de `request.user.driver_profile`.

### GET `/api/trips/<trip_id>/`

Retorna o detalhe da viagem.

Params:

- `trip_id` `int` obrigatorio na URL

Resposta `200`:

- payload `TripDetail`

### POST `/api/trips/<trip_id>/start/`

Inicia a viagem.

Params:

- `trip_id` `int` obrigatorio na URL

Body:

- sem body

Resposta `200`:

- payload `TripDetail` atualizado

Exemplo:

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
    "name": "Parnaiba",
    "state": "PI"
  },
  "departure_time": "2026-07-08T14:00:00Z",
  "available_spots": 3,
  "available_seats": 1,
  "status": "in_progress",
  "line_trip": {},
  "total_distance_km": 340.5,
  "total_duration_min": 280.0,
  "stops": [],
  "started_at": "2026-07-08T13:40:00Z",
  "finished_at": null,
  "created_at": "2026-07-08T12:00:00Z",
  "updated_at": "2026-07-08T13:40:00Z"
}
```

### POST `/api/trips/<trip_id>/finish/`

Finaliza a viagem.

Params:

- `trip_id` `int` obrigatorio na URL

Body:

- sem body

Resposta `200`:

- payload `TripDetail` atualizado

Exemplo:

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
    "name": "Parnaiba",
    "state": "PI"
  },
  "departure_time": "2026-07-08T14:00:00Z",
  "available_spots": 3,
  "available_seats": 1,
  "status": "finished",
  "line_trip": {},
  "total_distance_km": 340.5,
  "total_duration_min": 280.0,
  "stops": [],
  "started_at": "2026-07-08T13:40:00Z",
  "finished_at": "2026-07-08T18:20:00Z",
  "created_at": "2026-07-08T12:00:00Z",
  "updated_at": "2026-07-08T18:20:00Z"
}
```

### GET `/api/trips/<trip_id>/location/`

Retorna a ultima localizacao conhecida do motorista.

Params:

- `trip_id` `int` obrigatorio na URL

Resposta `200`:

```json
{
  "trip_id": 1,
  "latitude": -5.089,
  "longitude": -42.801,
  "updated_at": "2026-07-08T14:05:00Z"
}
```

Observacoes:

- So funciona quando a trip estiver com `status=in_progress`.
- So pode consultar quem participa da viagem.
- Participante = motorista da trip ou passageiro com booking `confirmed`.
- Se a trip ainda nao tiver localizacao registrada, retorna `404`.

### POST `/api/trips/<trip_id>/location/`

Cria ou atualiza a localizacao atual do motorista.

Params:

- `trip_id` `int` obrigatorio na URL

Body:

```json
{
  "latitude": -5.089,
  "longitude": -42.801
}
```

Resposta `200`:

```json
{
  "trip_id": 1,
  "latitude": -5.089,
  "longitude": -42.801,
  "updated_at": "2026-07-08T14:05:00Z"
}
```

Observacoes:

- So o motorista dono da trip pode atualizar.
- So funciona quando a trip estiver com `status=in_progress`.
- O endpoint faz upsert: cria no primeiro envio e atualiza nos proximos.
- `latitude` deve estar entre `-90` e `90`.
- `longitude` deve estar entre `-180` e `180`.

### POST `/api/trips/<trip_id>/reorder/`

Reordena as paradas da viagem.

Body:

```json
{
  "stop_orders": [
    { "stop_id": 100, "order": 0 },
    { "stop_id": 101, "order": 1 }
  ]
}
```

Resposta `204`:

- sem corpo

Observacoes:

- So pode ser usado enquanto a trip estiver com `status=open` ou `status=full`.

### POST `/api/trips/<trip_id>/recalculate-route/`

Recalcula rota e mapa da viagem.

Body:

- sem body

Resposta `200`:

- payload `TripDetail`

Observacoes:

- So pode ser usado enquanto a trip estiver com `status=open` ou `status=full`.

### GET `/api/trips/<trip_id>/booking-requests/`

Lista booking requests da viagem para o motorista.

Query params:

- `status` `string` opcional
- default: `pending`
- valor especial `all` remove o filtro

Resposta `200`:

```json
[
  {
    "id": 1,
    "trip": 1,
    "passenger": 9,
    "pickup_stop": {
      "id": 100,
      "order": 0,
      "location": {
        "id": 10,
        "name": "Rodoviaria",
        "formatted_address": "Av. ...",
        "latitude": -5.09,
        "longitude": -42.8,
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
        "name": "Destino",
        "formatted_address": "Rua ...",
        "latitude": -2.9,
        "longitude": -41.77,
        "city": {
          "id": 2,
          "name": "Parnaiba",
          "state": "PI"
        }
      }
    },
    "status": "pending",
    "created_at": "2026-07-08T12:00:00Z",
    "confirmed_at": null
  }
]
```

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

- So cria booking request quando a trip estiver com `status=open`.

### GET `/api/bookings/mine/`

Lista reservas do passageiro autenticado.

Resposta `200`:

```json
[
  {
    "id": 1,
    "trip": 1,
    "passenger": 9,
    "pickup_stop": {
      "id": 100,
      "order": 0,
      "location": {
        "id": 10,
        "name": "Rodoviaria",
        "formatted_address": "Av. ...",
        "latitude": -5.09,
        "longitude": -42.8,
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
        "name": "Destino",
        "formatted_address": "Rua ...",
        "latitude": -2.9,
        "longitude": -41.77,
        "city": {
          "id": 2,
          "name": "Parnaiba",
          "state": "PI"
        }
      }
    },
    "status": "pending",
    "created_at": "2026-07-08T12:00:00Z",
    "confirmed_at": null
  }
]
```

### POST `/api/bookings/<booking_id>/cancel/`

Cancela uma reserva do passageiro.

Params:

- `booking_id` `int` obrigatorio na URL

Resposta `200`:

- payload `Booking` atualizado

### POST `/api/bookings/<booking_id>/accept/`

Aceita uma solicitacao de reserva.

Params:

- `booking_id` `int` obrigatorio na URL

Resposta `200`:

- payload `Booking` atualizado

Observacoes:

- So aceita requests pendentes.
- So pode ser usado enquanto a trip estiver com `status=open` ou `status=full`.

### POST `/api/bookings/<booking_id>/reject/`

Recusa uma solicitacao de reserva.

Params:

- `booking_id` `int` obrigatorio na URL

Resposta `200`:

- payload `Booking` atualizado

Observacoes:

- So recusa requests pendentes.
- So pode ser usado enquanto a trip estiver com `status=open` ou `status=full`.

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

Params:

- `city_id` `int` obrigatorio na URL

Resposta `200`:

```json
[
  {
    "id": 10,
    "name": "Rodoviaria",
    "formatted_address": "Av. ...",
    "latitude": -5.09,
    "longitude": -42.8,
    "city": {
      "id": 1,
      "name": "Teresina",
      "state": "PI"
    }
  }
]
```

## Regras e comportamento observados no codigo

- Quase todas as views usam `AllowAny`, mas varias dependem de `request.user`.
- As acoes de motorista exigem `request.user.driver_profile`.
- `driver` e `passenger` saem como IDs brutos, nao como objetos aninhados.
- `available_seats` e calculado dinamicamente por `selectors.get_available_seats`.
- O endpoint de listagem de booking requests filtra `pending` por padrao.
- `TripDetail` agora inclui `started_at` e `finished_at`.
- Existe `DriverLocation`, que guarda apenas a localizacao atual do motorista.
- Existe uma `TripRouteApi` em `backend/src/trip/api.py`, mas ela nao esta
  exposta em `backend/src/trip/urls.py`, portanto nao faz parte da API ativa.

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
