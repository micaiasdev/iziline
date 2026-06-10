# Trip Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os endpoints REST de Viagem — criar (`POST`), buscar com filtros (`GET`) e detalhar (`GET /{id}`) — com cálculo de rateio mockado.

**Architecture:** Estilo HackSoft em layout flat no app `trip` existente. Views finas (`apis.py`) que só orquestram; regras de escrita em `services.py`; consultas em `selectors.py`; I/O JSON em `serializers.py`. O cálculo de rateio é um mock com interface estável para futura integração com Google Routes.

**Tech Stack:** Python 3.13, Django 6.0.6, Django REST Framework, SQLite (dev). Testes via `APITestCase` do DRF + `manage.py test`.

---

## File Structure

```
backend/
├── requirements.txt          NOVO  → pin de Django + DRF
└── src/
    ├── core/
    │   ├── settings.py        MODIFICAR → bloco REST_FRAMEWORK
    │   └── urls.py            MODIFICAR → include('trip.urls') sob /api/trips/
    └── trip/
        ├── models.py          (existe — sem mudança)
        ├── serializers.py     NOVO  → TripCreateSerializer, TripDetailSerializer, TripListSerializer
        ├── services.py        (vazio) → calculate_fare(), trip_create()
        ├── selectors.py       NOVO  → trip_list(), trip_get()
        ├── apis.py            (vazio) → TripListCreateApi, TripDetailApi
        ├── urls.py            NOVO  → rotas do app
        └── tests.py           MODIFICAR → testes dos services, selectors e endpoints
```

**Convenção de comandos:** todos os comandos `python`/`pytest` assumem o virtualenv ativo e o diretório de trabalho `backend/src` (onde está o `manage.py`), salvo indicação contrária.

---

## Task 0: Configurar ambiente (venv + dependências)

Sem isto, nenhum teste roda. Fecha parte da issue #33.

**Files:**
- Create: `backend/requirements.txt`

- [ ] **Step 1: Criar virtualenv**

Run (a partir de `backend/`):
```bash
cd /Users/eduardomelo/Documents/iziline/backend
python3 -m venv .venv
```

- [ ] **Step 2: Instalar Django e DRF**

Run:
```bash
/Users/eduardomelo/Documents/iziline/backend/.venv/bin/pip install --upgrade pip
/Users/eduardomelo/Documents/iziline/backend/.venv/bin/pip install "Django==6.0.6" djangorestframework
```
Expected: instalação concluída sem erro.

- [ ] **Step 3: Gerar requirements.txt**

Run:
```bash
/Users/eduardomelo/Documents/iziline/backend/.venv/bin/pip freeze > /Users/eduardomelo/Documents/iziline/backend/requirements.txt
```
Verifique que `Django==6.0.6` e `djangorestframework==` aparecem no arquivo.

- [ ] **Step 4: Validar que o projeto sobe e a migration aplica**

Run (a partir de `backend/src`):
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
/Users/eduardomelo/Documents/iziline/backend/.venv/bin/python manage.py migrate
/Users/eduardomelo/Documents/iziline/backend/.venv/bin/python manage.py check
```
Expected: migrations aplicadas, `System check identified no issues`.

- [ ] **Step 5: Commit**

```bash
cd /Users/eduardomelo/Documents/iziline
git add backend/requirements.txt
git commit -m "chore: configurar venv e requirements (Django 6.0.6 + DRF)"
```

> **Nota:** todos os comandos seguintes usam o interpretador do venv. Para encurtar, o plano escreve `python` — leia como `/Users/eduardomelo/Documents/iziline/backend/.venv/bin/python` (ou ative o venv com `source backend/.venv/bin/activate`).

---

## Task 1: Configurar DRF em settings.py

**Files:**
- Modify: `backend/src/core/settings.py` (adicionar bloco ao final)

- [ ] **Step 1: Adicionar bloco REST_FRAMEWORK**

Acrescente ao final de `core/settings.py`:
```python

# Django REST Framework
# https://www.django-rest-framework.org/api-guide/settings/
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}
```

- [ ] **Step 2: Validar configuração**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py check
```
Expected: `System check identified no issues`.

- [ ] **Step 3: Commit**

```bash
cd /Users/eduardomelo/Documents/iziline
git add backend/src/core/settings.py
git commit -m "feat: configurar DRF (auth de sessao, IsAuthenticated, paginacao)"
```

---

## Task 2: Service de cálculo de rateio (mock) — `calculate_fare()`

**Files:**
- Modify: `backend/src/trip/services.py`
- Test: `backend/src/trip/tests.py`

- [ ] **Step 1: Escrever o teste que falha**

Substitua o conteúdo de `trip/tests.py` por:
```python
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from trip.services import calculate_fare


class CalculateFareTests(APITestCase):
    def test_known_route_divides_cost_by_passengers_plus_driver(self):
        # Teresina -> Parnaiba = 339 km; custo = 339 * 0.30 = 101.70
        # 2 vagas + motorista = 3 pessoas; 101.70 / 3 = 33.90
        fare = calculate_fare(origin="Teresina", destination="Parnaiba", seats_available=2)
        self.assertEqual(fare, Decimal("33.90"))

    def test_is_case_and_accent_insensitive(self):
        fare_plain = calculate_fare(origin="teresina", destination="parnaiba", seats_available=2)
        fare_accent = calculate_fare(origin="TERESINA", destination="Parnaíba", seats_available=2)
        self.assertEqual(fare_plain, fare_accent)

    def test_unknown_route_uses_default_distance(self):
        # Distancia default = 100 km; custo = 30.00; 1 vaga + motorista = 2; 30.00 / 2 = 15.00
        fare = calculate_fare(origin="Cidade X", destination="Cidade Y", seats_available=1)
        self.assertEqual(fare, Decimal("15.00"))

    def test_result_has_two_decimal_places(self):
        fare = calculate_fare(origin="Teresina", destination="Picos", seats_available=2)
        self.assertEqual(fare.as_tuple().exponent, -2)
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py test trip.tests.CalculateFareTests -v 2
```
Expected: FAIL com `ImportError: cannot import name 'calculate_fare'`.

- [ ] **Step 3: Implementar `calculate_fare`**

Substitua o conteúdo de `trip/services.py` por:
```python
import unicodedata
from decimal import Decimal, ROUND_HALF_UP


# Tabela mock de distâncias entre cidades conhecidas (km).
# Substituível por Google Routes API no futuro, sem alterar a assinatura.
_KNOWN_DISTANCES_KM = {
    frozenset({"teresina", "parnaiba"}): 339,
    frozenset({"teresina", "picos"}): 320,
    frozenset({"teresina", "floriano"}): 240,
}
_DEFAULT_DISTANCE_KM = 100
_COST_PER_KM = Decimal("0.30")


def _normalize_city(name):
    """Minúsculas, sem acentos e sem espaços nas bordas, para casar chaves."""
    stripped = unicodedata.normalize("NFKD", name.strip().lower())
    return "".join(c for c in stripped if not unicodedata.combining(c))


def calculate_fare(*, origin, destination, seats_available):
    """Calcula o rateio por pessoa (mock).

    custo_total = distancia_km * CUSTO_POR_KM
    rateio = custo_total / (seats_available + 1)  # passageiros + motorista
    Retorna Decimal arredondado a 2 casas.
    """
    key = frozenset({_normalize_city(origin), _normalize_city(destination)})
    distance_km = _KNOWN_DISTANCES_KM.get(key, _DEFAULT_DISTANCE_KM)
    total_cost = Decimal(distance_km) * _COST_PER_KM
    fare = total_cost / Decimal(seats_available + 1)
    return fare.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
```

- [ ] **Step 4: Rodar para confirmar que passa**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py test trip.tests.CalculateFareTests -v 2
```
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
cd /Users/eduardomelo/Documents/iziline
git add backend/src/trip/services.py backend/src/trip/tests.py
git commit -m "feat: calculate_fare mock para rateio (issue #13)"
```

---

## Task 3: Service de criação — `trip_create()`

**Files:**
- Modify: `backend/src/trip/services.py`
- Test: `backend/src/trip/tests.py`

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao final de `trip/tests.py`:
```python
from rest_framework.exceptions import ValidationError

from trip.models import Trip
from trip.services import trip_create

User = get_user_model()


class TripCreateServiceTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista", password="x")

    def test_creates_trip_with_calculated_price(self):
        departure = timezone.now() + timedelta(days=1)
        trip = trip_create(
            driver=self.driver,
            origin="Teresina",
            destination="Parnaiba",
            departure_at=departure,
            seats_available=2,
        )
        self.assertIsInstance(trip, Trip)
        self.assertEqual(trip.driver, self.driver)
        self.assertEqual(trip.price, Decimal("33.90"))
        self.assertEqual(Trip.objects.count(), 1)

    def test_rejects_past_departure(self):
        past = timezone.now() - timedelta(hours=1)
        with self.assertRaises(ValidationError):
            trip_create(
                driver=self.driver,
                origin="Teresina",
                destination="Parnaiba",
                departure_at=past,
                seats_available=2,
            )
        self.assertEqual(Trip.objects.count(), 0)

    def test_rejects_zero_seats(self):
        departure = timezone.now() + timedelta(days=1)
        with self.assertRaises(ValidationError):
            trip_create(
                driver=self.driver,
                origin="Teresina",
                destination="Parnaiba",
                departure_at=departure,
                seats_available=0,
            )
        self.assertEqual(Trip.objects.count(), 0)
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py test trip.tests.TripCreateServiceTests -v 2
```
Expected: FAIL com `ImportError: cannot import name 'trip_create'`.

- [ ] **Step 3: Implementar `trip_create`**

Acrescente ao final de `trip/services.py`:
```python
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from trip.models import Trip


def trip_create(*, driver, origin, destination, departure_at, seats_available):
    """Cria uma viagem aplicando regras de negócio e calculando o rateio."""
    if departure_at <= timezone.now():
        raise ValidationError({"departure_at": "A data/hora da viagem deve ser futura."})
    if seats_available < 1:
        raise ValidationError({"seats_available": "Deve haver ao menos 1 vaga."})

    price = calculate_fare(
        origin=origin,
        destination=destination,
        seats_available=seats_available,
    )
    return Trip.objects.create(
        driver=driver,
        origin=origin,
        destination=destination,
        departure_at=departure_at,
        seats_available=seats_available,
        price=price,
    )
```

> **Nota:** mantenha os imports de `Trip` e `timezone` no topo do arquivo se preferir; deixá-los aqui evita reordenar o que já existe. Não duplique imports.

- [ ] **Step 4: Rodar para confirmar que passa**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py test trip.tests.TripCreateServiceTests -v 2
```
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
cd /Users/eduardomelo/Documents/iziline
git add backend/src/trip/services.py backend/src/trip/tests.py
git commit -m "feat: trip_create service com validacao de regras (issue #10)"
```

---

## Task 4: Selectors — `trip_list()` e `trip_get()`

**Files:**
- Create: `backend/src/trip/selectors.py`
- Test: `backend/src/trip/tests.py`

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao final de `trip/tests.py`:
```python
from django.http import Http404

from trip.selectors import trip_get, trip_list


class TripSelectorTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista", password="x")
        self.future = timezone.now() + timedelta(days=2)

    def _make_trip(self, **overrides):
        defaults = dict(
            driver=self.driver,
            origin="Teresina",
            destination="Parnaiba",
            departure_at=self.future,
            seats_available=3,
            price=Decimal("10.00"),
            is_cancelled=False,
        )
        defaults.update(overrides)
        return Trip.objects.create(**defaults)

    def test_list_returns_only_bookable_trips(self):
        valid = self._make_trip()
        self._make_trip(seats_available=0)  # lotada
        self._make_trip(is_cancelled=True)  # cancelada
        self._make_trip(departure_at=timezone.now() - timedelta(days=1))  # passada
        results = list(trip_list())
        self.assertEqual(results, [valid])

    def test_list_filters_by_origin_destination_case_insensitive(self):
        match = self._make_trip(origin="Teresina", destination="Picos")
        self._make_trip(origin="Floriano", destination="Picos")
        results = list(trip_list(origin="teres", destination="pic"))
        self.assertEqual(results, [match])

    def test_list_filters_by_date(self):
        target_day = (timezone.now() + timedelta(days=5)).date()
        match = self._make_trip(departure_at=timezone.now() + timedelta(days=5))
        self._make_trip(departure_at=timezone.now() + timedelta(days=6))
        results = list(trip_list(date=target_day.isoformat()))
        self.assertEqual(results, [match])

    def test_get_returns_trip_by_id(self):
        trip = self._make_trip()
        self.assertEqual(trip_get(trip_id=trip.id), trip)

    def test_get_raises_404_when_missing(self):
        with self.assertRaises(Http404):
            trip_get(trip_id=999999)
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py test trip.tests.TripSelectorTests -v 2
```
Expected: FAIL com `ModuleNotFoundError: No module named 'trip.selectors'`.

- [ ] **Step 3: Implementar selectors**

Crie `trip/selectors.py`:
```python
from django.shortcuts import get_object_or_404
from django.utils import timezone

from trip.models import Trip


def trip_list(*, origin=None, destination=None, date=None):
    """Retorna viagens reserváveis (futuras, com vaga, não canceladas),
    aplicando filtros opcionais de origem, destino e data."""
    qs = (
        Trip.objects.select_related("driver")
        .filter(
            seats_available__gt=0,
            is_cancelled=False,
            departure_at__gt=timezone.now(),
        )
    )
    if origin:
        qs = qs.filter(origin__icontains=origin)
    if destination:
        qs = qs.filter(destination__icontains=destination)
    if date:
        qs = qs.filter(departure_at__date=date)
    return qs


def trip_get(*, trip_id):
    """Retorna a viagem pelo id ou levanta Http404."""
    return get_object_or_404(Trip.objects.select_related("driver"), id=trip_id)
```

- [ ] **Step 4: Rodar para confirmar que passa**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py test trip.tests.TripSelectorTests -v 2
```
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
cd /Users/eduardomelo/Documents/iziline
git add backend/src/trip/selectors.py backend/src/trip/tests.py
git commit -m "feat: selectors trip_list (filtros) e trip_get (issues #23 #24)"
```

---

## Task 5: Serializers

**Files:**
- Create: `backend/src/trip/serializers.py`
- Test: `backend/src/trip/tests.py`

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao final de `trip/tests.py`:
```python
from trip.serializers import (
    TripCreateSerializer,
    TripDetailSerializer,
    TripListSerializer,
)


class TripSerializerTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(
            username="motorista", password="x", first_name="Ana", last_name="Silva"
        )
        self.trip = Trip.objects.create(
            driver=self.driver,
            origin="Teresina",
            destination="Parnaiba",
            departure_at=timezone.now() + timedelta(days=1),
            seats_available=3,
            price=Decimal("10.00"),
        )

    def test_create_serializer_rejects_missing_fields(self):
        serializer = TripCreateSerializer(data={"origin": "Teresina"})
        self.assertFalse(serializer.is_valid())
        self.assertIn("destination", serializer.errors)

    def test_create_serializer_excludes_price_and_driver(self):
        serializer = TripCreateSerializer()
        self.assertNotIn("price", serializer.fields)
        self.assertNotIn("driver", serializer.fields)

    def test_detail_serializer_includes_driver_name(self):
        data = TripDetailSerializer(self.trip).data
        self.assertEqual(data["driver_name"], "Ana Silva")
        self.assertEqual(data["seats_available"], 3)
        self.assertEqual(data["price"], "10.00")

    def test_detail_driver_name_falls_back_to_username(self):
        self.driver.first_name = ""
        self.driver.last_name = ""
        self.driver.save()
        data = TripDetailSerializer(self.trip).data
        self.assertEqual(data["driver_name"], "motorista")

    def test_list_serializer_includes_core_fields(self):
        data = TripListSerializer(self.trip).data
        for field in ["id", "driver_name", "origin", "destination", "departure_at", "seats_available", "price"]:
            self.assertIn(field, data)
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py test trip.tests.TripSerializerTests -v 2
```
Expected: FAIL com `ModuleNotFoundError: No module named 'trip.serializers'`.

- [ ] **Step 3: Implementar serializers**

Crie `trip/serializers.py`:
```python
from rest_framework import serializers

from trip.models import Trip


class TripCreateSerializer(serializers.Serializer):
    origin = serializers.CharField(max_length=255)
    destination = serializers.CharField(max_length=255)
    departure_at = serializers.DateTimeField()
    seats_available = serializers.IntegerField(min_value=1)


class _TripOutputBase(serializers.ModelSerializer):
    driver_name = serializers.SerializerMethodField()

    def get_driver_name(self, obj):
        full_name = obj.driver.get_full_name()
        return full_name or obj.driver.get_username()


class TripDetailSerializer(_TripOutputBase):
    class Meta:
        model = Trip
        fields = [
            "id",
            "driver_name",
            "origin",
            "destination",
            "departure_at",
            "seats_available",
            "price",
            "is_cancelled",
            "created_at",
        ]


class TripListSerializer(_TripOutputBase):
    class Meta:
        model = Trip
        fields = [
            "id",
            "driver_name",
            "origin",
            "destination",
            "departure_at",
            "seats_available",
            "price",
        ]
```

- [ ] **Step 4: Rodar para confirmar que passa**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py test trip.tests.TripSerializerTests -v 2
```
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
cd /Users/eduardomelo/Documents/iziline
git add backend/src/trip/serializers.py backend/src/trip/tests.py
git commit -m "feat: serializers de Trip (create/detail/list)"
```

---

## Task 6: Views finas + URLs

**Files:**
- Modify: `backend/src/trip/apis.py`
- Create: `backend/src/trip/urls.py`
- Modify: `backend/src/core/urls.py`
- Test: `backend/src/trip/tests.py`

- [ ] **Step 1: Escrever os testes de endpoint que falham**

Acrescente ao final de `trip/tests.py`:
```python
from django.urls import reverse


class TripEndpointTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista", password="x")
        self.future = timezone.now() + timedelta(days=1)

    # --- POST /api/trips/ ---
    def test_create_requires_authentication(self):
        url = reverse("trip-list-create")
        response = self.client.post(url, {
            "origin": "Teresina",
            "destination": "Parnaiba",
            "departure_at": self.future.isoformat(),
            "seats_available": 2,
        }, format="json")
        self.assertEqual(response.status_code, 401)

    def test_create_returns_201_with_calculated_price(self):
        self.client.force_authenticate(self.driver)
        url = reverse("trip-list-create")
        response = self.client.post(url, {
            "origin": "Teresina",
            "destination": "Parnaiba",
            "departure_at": self.future.isoformat(),
            "seats_available": 2,
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["price"], "33.90")
        self.assertEqual(response.data["driver_name"], "motorista")

    def test_create_rejects_past_departure_with_400(self):
        self.client.force_authenticate(self.driver)
        url = reverse("trip-list-create")
        response = self.client.post(url, {
            "origin": "Teresina",
            "destination": "Parnaiba",
            "departure_at": (timezone.now() - timedelta(hours=1)).isoformat(),
            "seats_available": 2,
        }, format="json")
        self.assertEqual(response.status_code, 400)

    # --- GET /api/trips/ ---
    def test_list_returns_paginated_bookable_trips(self):
        self.client.force_authenticate(self.driver)
        Trip.objects.create(
            driver=self.driver, origin="Teresina", destination="Parnaiba",
            departure_at=self.future, seats_available=3, price=Decimal("10.00"),
        )
        url = reverse("trip-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 1)

    def test_list_filters_by_origin(self):
        self.client.force_authenticate(self.driver)
        Trip.objects.create(
            driver=self.driver, origin="Teresina", destination="Picos",
            departure_at=self.future, seats_available=3, price=Decimal("10.00"),
        )
        Trip.objects.create(
            driver=self.driver, origin="Floriano", destination="Picos",
            departure_at=self.future, seats_available=3, price=Decimal("10.00"),
        )
        url = reverse("trip-list-create")
        response = self.client.get(url, {"origin": "teres"})
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["origin"], "Teresina")

    # --- GET /api/trips/{id}/ ---
    def test_detail_returns_200(self):
        self.client.force_authenticate(self.driver)
        trip = Trip.objects.create(
            driver=self.driver, origin="Teresina", destination="Parnaiba",
            departure_at=self.future, seats_available=3, price=Decimal("10.00"),
        )
        url = reverse("trip-detail", args=[trip.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], trip.id)

    def test_detail_returns_404_when_missing(self):
        self.client.force_authenticate(self.driver)
        url = reverse("trip-detail", args=[999999])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py test trip.tests.TripEndpointTests -v 2
```
Expected: FAIL — `reverse` não encontra `trip-list-create` (`NoReverseMatch`).

- [ ] **Step 3: Implementar as views**

Substitua o conteúdo de `trip/apis.py` por:
```python
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from trip.selectors import trip_get, trip_list
from trip.serializers import (
    TripCreateSerializer,
    TripDetailSerializer,
    TripListSerializer,
)
from trip.services import trip_create


class TripPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class TripListCreateApi(APIView):
    def get(self, request):
        trips = trip_list(
            origin=request.query_params.get("origin"),
            destination=request.query_params.get("destination"),
            date=request.query_params.get("date"),
        )
        paginator = TripPagination()
        page = paginator.paginate_queryset(trips, request)
        serializer = TripListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = TripCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trip = trip_create(driver=request.user, **serializer.validated_data)
        return Response(TripDetailSerializer(trip).data, status=status.HTTP_201_CREATED)


class TripDetailApi(APIView):
    def get(self, request, trip_id):
        trip = trip_get(trip_id=trip_id)
        return Response(TripDetailSerializer(trip).data)
```

- [ ] **Step 4: Criar urls do app**

Crie `trip/urls.py`:
```python
from django.urls import path

from trip.apis import TripDetailApi, TripListCreateApi

urlpatterns = [
    path("", TripListCreateApi.as_view(), name="trip-list-create"),
    path("<int:trip_id>/", TripDetailApi.as_view(), name="trip-detail"),
]
```

- [ ] **Step 5: Registrar as urls no projeto**

Em `core/urls.py`, troque a linha de import e a lista `urlpatterns`:
```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/trips/', include('trip.urls')),
]
```

- [ ] **Step 6: Rodar para confirmar que passa**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py test trip.tests.TripEndpointTests -v 2
```
Expected: PASS (7 testes).

- [ ] **Step 7: Commit**

```bash
cd /Users/eduardomelo/Documents/iziline
git add backend/src/trip/apis.py backend/src/trip/urls.py backend/src/core/urls.py backend/src/trip/tests.py
git commit -m "feat: endpoints de Trip (POST criar, GET busca, GET detalhe) (issues #10 #23 #24)"
```

---

## Task 7: Suíte completa verde + checagem final

**Files:**
- (nenhum novo)

- [ ] **Step 1: Rodar a suíte inteira**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py test trip -v 2
```
Expected: PASS em todos os testes (cálculo de rateio, services, selectors, serializers, endpoints).

- [ ] **Step 2: Rodar o system check**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py check
```
Expected: `System check identified no issues`.

- [ ] **Step 3: Smoke test manual (opcional)**

Run:
```bash
cd /Users/eduardomelo/Documents/iziline/backend/src
python manage.py runserver
```
Acesse `http://127.0.0.1:8000/api/trips/` — deve exigir login (browsable API do DRF). Encerre com Ctrl+C.

---

## Mapa de cobertura (spec → tasks)

| Requisito da spec | Task |
|-------------------|------|
| Ambiente Django + DRF (issue #33 parcial) | Task 0 |
| Config DRF (auth, permissão, paginação) | Task 1 |
| Cálculo de rateio mock — `calculate_fare()` (#13) | Task 2 |
| `POST /api/trips/` criar + regras (#10) | Tasks 3, 6 |
| `GET /api/trips/` busca com filtros (#23) | Tasks 4, 6 |
| `GET /api/trips/{id}/` detalhe (#24) | Tasks 4, 6 |
| Serializers (entrada/saída, driver_name) | Task 5 |
| Tratamento de erros (400/401/404) | Tasks 3, 6 |
| Suíte de testes TDD | Tasks 2–6 |

## Fora de escopo (confirmado)

- Migração SQLite → PostgreSQL.
- Integração real com Google Routes API (mantém o mock).
- Simple JWT real (mantém auth de sessão).
- Reserva, chat, cancelamento (#25–#31) e frontend.
- Layout aninhado `api/` da wiki.
