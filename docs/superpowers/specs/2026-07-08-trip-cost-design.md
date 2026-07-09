# Design — Custo Fixo e Rateio da Viagem (TripCost)

**Data:** 2026-07-08
**Autor:** Edson
**Issues cobertas:** definir

## Objetivo

Implementar o bloco de custo da viagem dentro do app `trip`, com duas
responsabilidades separadas:

- fixar o custo-base da viagem uma única vez, no momento da criação da carona,
  usando apenas a rota original do motorista;
- expor o rateio atual desse custo entre os passageiros confirmados, sem alterar
  o valor total originalmente congelado.

A simplificação é proposital: o valor da viagem não será recalculado a cada novo
booking confirmado. O que pode mudar ao longo do tempo é apenas a forma como o
custo fixado será distribuído entre os passageiros que de fato embarcam.

## Arquitetura

O app `trip` já está seguindo um estilo HackSoft simplificado, com
`api.py` como ponto central das views:

| Camada | Responsabilidade |
|--------|------------------|
| `api.py` | Uma `APIView` por ação. Valida entrada/saída e chama `service` ou `selector`. |
| `services/trip.py` | Escrita e regras de negócio que gravam no banco. |
| `selectors.py` | Leitura, consultas e cálculos read-only. |
| `models.py` | `Trip`, `TripStop`, `Booking`, `TripCost`. |
| `urls.py` | Mapeamento explícito das actions expostas pela API. |

## Regra de produto

O custo da viagem será sempre derivado da rota original do motorista, usando os
stops definidos na criação do `Trip`.

Regra adotada neste desenho:

1. `TripCost` é criado uma única vez.
2. O valor de `TripCost.total_cost` não muda depois, mesmo que a rota atual seja
   recalculada por causa de bookings confirmados.
3. O que muda depois é apenas o rateio entre passageiros confirmados.
4. Trechos sem passageiro confirmado não são cobrados de ninguém; ficam
   implicitamente absorvidos pelo motorista.

Essa decisão preserva previsibilidade de preço e simplifica backend, frontend e
testes.

## Estrutura de arquivos

```text
backend/src/trip/
├── models.py              -> TripCost já existe
├── selectors.py           -> get_fare_split(), helper de leitura do custo
├── services/trip.py       -> create_trip_cost(), create_trip()
├── api.py                 -> TripCostDetailApi, TripFareSplitApi
├── urls.py                -> rotas /cost/ e /fare-split/
└── tests/                 -> testes de service, selector e API
```

## Model `TripCost`

O model já foi introduzido em [models.py](/home/edson/ufpi/eng_softII/backend/src/trip/models.py:74):

- `trip`: `OneToOneField` com `Trip`
- `price_per_km`: valor usado no momento do cálculo
- `distance_km_snapshot`: distância da rota original no momento da criação
- `total_cost`: custo fixado
- `created_at`

### Decisão

Não haverá edição manual de `TripCost` por API neste primeiro momento. Ele é um
snapshot técnico calculado pelo backend e não uma entidade de CRUD.

## Service `create_trip_cost(trip)` 

Implementado em [services/trip.py](/home/edson/ufpi/eng_softII/backend/src/trip/services/trip.py:60),
mas ainda precisa ser fechado e conectado corretamente ao fluxo de criação.

### Responsabilidade

- usar `trip.total_distance_km` já calculado por `recalculate_route(trip)`;
- ler `settings.PRICE_PER_KM`;
- calcular `total_cost = price_per_km * distance_km_snapshot`;
- persistir um `TripCost` associado ao `Trip`.

### Regras

1. Só pode ser chamado depois que a rota original do `Trip` já existe.
2. Só deve ser chamado uma vez por viagem.
3. Não deve recalcular ou sobrescrever `TripCost` em aceite de booking,
   reordenação de stops ou novo cálculo de rota.

## Ajuste obrigatório em `create_trip(...)`

O fluxo final do service de criação deve ser:

1. criar `Trip`
2. criar `TripStop`s
3. chamar `recalculate_route(trip)`
4. chamar `create_trip_cost(trip)`
5. retornar `Trip`

Sem esse passo 4, as APIs de custo ficam inconsistentes porque `trip.cost` pode
não existir.

## Selectors

### 1. Leitura do custo fixo

Não precisa de selector específico se a API abrir a viagem com `selectors.get_trip()`
e serializar `trip.cost`.

Se houver necessidade de otimizar query depois, pode-se adicionar:

- `get_trip_with_cost(trip_id)`

Mas isso não é obrigatório para a primeira entrega.

### 2. `get_fare_split(trip)`

Já existe em [selectors.py](/home/edson/ufpi/eng_softII/backend/src/trip/selectors.py:174)
e a ideia está correta para este desenho:

- usa `trip.cost.total_cost` como valor base congelado;
- usa `trip.route_legs` e a rota atual para descobrir o peso de cada trecho;
- distribui o custo apenas entre passageiros `CONFIRMED`;
- trechos sem passageiros não geram cobrança.

### Decisão sobre retorno

O selector continua retornando uma lista de dicionários, por exemplo:

```python
[
    {"booking_id": 10, "passenger_id": 7, "amount": Decimal("12.30")},
    {"booking_id": 11, "passenger_id": 9, "amount": Decimal("18.45")},
]
```

A montagem do envelope HTTP fica na camada de `api.py`.

## Novas APIs em `api.py`

Como o projeto foi reorganizado para usar [api.py](/home/edson/ufpi/eng_softII/backend/src/trip/api.py:1)
como arquivo principal de views, as novas APIs devem ser adicionadas ali, não em
`apis.py`.

### 1. `TripCostDetailApi`

#### Rota

`GET /api/trips/<trip_id>/cost/`

#### Objetivo

Retornar o snapshot fixo de custo criado na abertura da viagem.

#### Output

Campos sugeridos:

- `trip_id`
- `price_per_km`
- `distance_km_snapshot`
- `total_cost`
- `created_at`

#### Serializer sugerido

```python
class TripCostOutputSerializer(serializers.ModelSerializer):
    trip_id = serializers.IntegerField(source="trip_id", read_only=True)

    class Meta:
        model = TripCost
        fields = [
            "trip_id",
            "price_per_km",
            "distance_km_snapshot",
            "total_cost",
            "created_at",
        ]
```

#### View sugerida

```python
class TripCostDetailApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = TripCostOutputSerializer

    def get(self, request, trip_id: int):
        trip = selectors.get_trip(trip_id)
        return Response(self.OutputSerializer(trip.cost).data)
```

### 2. `TripFareSplitApi`

#### Rota

`GET /api/trips/<trip_id>/fare-split/`

#### Objetivo

Retornar o rateio atual do custo fixo entre os passageiros confirmados daquela
viagem.

#### Output

A API deve retornar um envelope, não apenas uma lista solta. Sugestão:

- `trip_id`
- `total_cost`
- `split`

Onde `split` contém:

- `booking_id`
- `passenger_id`
- `amount`

#### Serializers sugeridos

```python
class FareSplitItemOutputSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    passenger_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)


class TripFareSplitOutputSerializer(serializers.Serializer):
    trip_id = serializers.IntegerField()
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2)
    split = FareSplitItemOutputSerializer(many=True)
```

#### View sugerida

```python
class TripFareSplitApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = TripFareSplitOutputSerializer

    def get(self, request, trip_id: int):
        trip = selectors.get_trip(trip_id)
        split = selectors.get_fare_split(trip)
        data = {
            "trip_id": trip.id,
            "total_cost": trip.cost.total_cost,
            "split": split,
        }
        return Response(self.OutputSerializer(data).data)
```

## Conexão com `urls.py`

Adicionar em [urls.py](/home/edson/ufpi/eng_softII/backend/src/trip/urls.py:7):

```python
path("trips/<int:trip_id>/cost/", api.TripCostDetailApi.as_view(), name="trip-cost-detail"),
path("trips/<int:trip_id>/fare-split/", api.TripFareSplitApi.as_view(), name="trip-fare-split"),
```

Essas rotas seguem o padrão já adotado no app:

- um recurso principal (`trips/<id>/`)
- actions específicas sob subcaminhos explícitos

## Alterações em serializers já existentes

`TripDetailOutputSerializer` pode continuar sem `cost` embutido na primeira
versão, para manter separação de responsabilidades entre:

- detalhe da viagem
- custo fixo
- rateio atual

Se o frontend precisar reduzir chamadas depois, pode-se adicionar um campo
opcional `cost`, serializado com `TripCostOutputSerializer`.

## Tratamento de erros

| Situação | Status |
|----------|--------|
| `trip_id` inexistente | `404` |
| `Trip` sem `TripCost` associado | `500` enquanto houver inconsistência de dados; idealmente não deve ocorrer |
| `route_legs` inconsistente no rateio | `400` ou `500`, conforme decisão de tratamento na API |

### Decisão prática

Como `TripCost` deve sempre nascer no `create_trip()`, a ausência de `trip.cost`
é bug de consistência interna, não erro de input do cliente.

## Permissões

No estado atual do código, muitas views usam `AllowAny`, mas isso deve ser
revisto separadamente.

Para estas novas APIs:

- `TripCostDetailApi`: pode ser pública se o produto considerar o custo visível
  para passageiro e motorista.
- `TripFareSplitApi`: idealmente autenticada, porque expõe quem paga quanto.

Se a política de permissão ainda não estiver madura, é aceitável começar com o
mesmo padrão do app atual e endurecer depois.

## Testes

### Service

- `create_trip()` cria `TripCost` junto com a viagem
- `TripCost.total_cost` usa `PRICE_PER_KM` e `trip.total_distance_km`
- `TripCost` não muda após `accept_booking_request()`
- `TripCost` não muda após `new_map_order()`

### Selector

- `get_fare_split()` retorna lista vazia sem bookings confirmados
- divide custo por trechos corretamente
- não cobra trecho sem passageiro
- soma final dos passageiros é menor ou igual a `TripCost.total_cost`
- falha se `route_legs` estiver inconsistente

### API

- `GET /trips/{id}/cost/` retorna `200` com snapshot correto
- `GET /trips/{id}/cost/` retorna `404` se a viagem não existir
- `GET /trips/{id}/fare-split/` retorna `200` com `split`
- `GET /trips/{id}/fare-split/` retorna lista vazia quando não há confirmados

## Pendências técnicas identificadas

Antes da implementação completa, há alguns ajustes necessários no app `trip`:

- `services/trip.py` precisa importar `Decimal`, `settings` e `TripCost`
- `create_trip()` ainda não chama `create_trip_cost(trip)`
- `api.py` e `urls.py` precisam ser mantidos como fonte principal; `apis.py`
  não deve receber essas novas actions
- a suíte antiga em [tests.py](/home/edson/ufpi/eng_softII/backend/src/trip/tests.py:1)
  parece refletir uma versão anterior do domínio e deve ser tratada com cuidado

## Fora de escopo

- CRUD manual de `TripCost`
- recalcular `TripCost` após bookings confirmados
- parametrização administrativa de margem, comissão da plataforma ou lucro do
  motorista
- cobrança real / pagamentos
- repasse financeiro entre passageiros, motorista e plataforma
