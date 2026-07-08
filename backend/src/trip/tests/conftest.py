"""
trip/tests/conftest.py

Fixtures compartilhadas. A mais importante é `fake_routing_client`
(autouse=True): ela troca o MapboxRoutingClient real por um fake em
TODOS os testes automaticamente, sem precisar de MAPBOX_ACCESS_TOKEN
nem conexão com a internet.
"""

from datetime import timedelta

import pytest # type: ignore
from django.contrib.auth import get_user_model # type: ignore
from django.utils import timezone # type: ignore

from trip.models import ProfileDriver, City, Location
from trip.services import trip as trip_services
from trip.services.routing import RouteResult


class FakeRoutingClient:
    """
    Substitui o MapboxRoutingClient nos testes. Nunca faz chamada de rede;
    devolve sempre um resultado fixo e determinístico, o suficiente pra
    testar a lógica de negócio (não a integração real com o Mapbox).
    """

    def get_route(self, coordinates):
        leg_count = max(len(coordinates) - 1, 1)
        distance_per_leg = 42.0 / leg_count
        duration_per_leg = 60.0 / leg_count
        legs = [
            {"distance_km": distance_per_leg, "duration_min": duration_per_leg}
            for _ in range(len(coordinates) - 1)
        ]
        return RouteResult(
            distance_km=42.0,
            duration_min=60.0,
            geometry={"type": "LineString", "coordinates": coordinates},
            legs=legs,
        )


@pytest.fixture(autouse=True)
def fake_routing_client(monkeypatch):
    """
    autouse=True: aplica em TODO teste, sem precisar declarar o fixture
    explicitamente em cada função de teste. Isso garante que nenhum teste
    bate na API real do Mapbox por acidente.
    """
    monkeypatch.setattr(trip_services, "get_routing_client", lambda: FakeRoutingClient())


# ---------------------------------------------------------------------------
# Usuários / perfis
# ---------------------------------------------------------------------------

@pytest.fixture
def passenger_user(db):
    return get_user_model().objects.create_user(username="passageiro1", password="x")


@pytest.fixture
def driver_user(db):
    return get_user_model().objects.create_user(username="motorista1", password="x")


@pytest.fixture
def driver_profile(driver_user):
    return ProfileDriver.objects.create(user=driver_user)


# ---------------------------------------------------------------------------
# City / Location
# ---------------------------------------------------------------------------

@pytest.fixture
def city_origin(db):
    return City.objects.create(name="Teresina", state="PI", mapbox_place_id="place.teresina")


@pytest.fixture
def city_destination(db):
    return City.objects.create(name="Fortaleza", state="CE", mapbox_place_id="place.fortaleza")


@pytest.fixture
def origin_location(city_origin):
    return Location.objects.create(
        name="Rodoviária de Teresina",
        formatted_address="Av. Presidente Getúlio Vargas, Teresina - PI",
        city=city_origin,
        latitude=-5.089,
        longitude=-42.801,
    )


@pytest.fixture
def destination_location(city_destination):
    return Location.objects.create(
        name="Rodoviária de Fortaleza",
        formatted_address="Av. Borges de Melo, Fortaleza - CE",
        city=city_destination,
        latitude=-3.717,
        longitude=-38.543,
    )


@pytest.fixture
def intermediate_location(db, city_origin):
    """Uma parada intermediária qualquer, na mesma cidade de origem pra simplificar."""
    return Location.objects.create(
        name="Posto BR-343 km 12",
        formatted_address="BR-343, km 12",
        city=city_origin,
        latitude=-5.200,
        longitude=-42.700,
    )


@pytest.fixture
def future_departure_time():
    return timezone.now() + timedelta(days=1)


# ---------------------------------------------------------------------------
# Trip já criada — pra testes que precisam de uma trip pronta (bookings etc.)
# ---------------------------------------------------------------------------

@pytest.fixture
def open_trip(driver_profile, city_origin, city_destination, origin_location, destination_location, future_departure_time):
    return trip_services.create_trip(
        driver=driver_profile,
        origin_city_id=city_origin.id,
        destine_city_id=city_destination.id,
        departure_time=future_departure_time,
        available_spots=2,
        origin_location_id=origin_location.id,
        destination_location_id=destination_location.id,
    )
