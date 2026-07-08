"""
Uso:
    pytest                      # roda tudo, MENOS os marcados integration
    pytest --run-integration    # roda tudo, incluindo os de integração
    pytest -m integration --run-integration   # roda SÓ os de integração
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from trip.models import City, Location, ProfileDriver
from trip.services import trip as trip_services
from trip.services.routing import RouteResult


class FakeRoutingClient:
    def get_route(self, coordinates):
        return RouteResult(
            distance_km=42.0,
            duration_min=60.0,
            geometry={
                "type": "LineString",
                "coordinates": [[lng, lat] for lng, lat in coordinates],
            },
        )


def pytest_addoption(parser):
    parser.addoption(
        "--run-integration",
        action="store_true",
        default=False,
        help="Roda também os testes marcados @pytest.mark.integration (fazem chamada de rede real).",
    )


def pytest_collection_modifyitems(config, items):
    if config.getoption("--run-integration"):
        return  # flag presente: não pula nada, roda tudo normalmente

    skip_integration = pytest.mark.skip(
        reason="Teste de integração (rede real) — rode com --run-integration pra incluí-lo."
    )
    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip_integration)


@pytest.fixture(autouse=True)
def fake_routing_client_for_unit_tests(request, monkeypatch):
    if request.node.get_closest_marker("integration"):
        return

    monkeypatch.setattr(trip_services, "get_routing_client", lambda: FakeRoutingClient())


@pytest.fixture
def city_origin(db):
    return City.objects.create(name="Teresina", state="PI", mapbox_place_id="city-origin")


@pytest.fixture
def city_destination(db):
    return City.objects.create(name="Timon", state="MA", mapbox_place_id="city-destination")


@pytest.fixture
def origin_location(db, city_origin):
    return Location.objects.create(
        name="Origem",
        formatted_address="Rua da Origem, 1",
        city=city_origin,
        latitude=-5.089,
        longitude=-42.802,
    )


@pytest.fixture
def destination_location(db, city_destination):
    return Location.objects.create(
        name="Destino",
        formatted_address="Rua do Destino, 2",
        city=city_destination,
        latitude=-5.095,
        longitude=-42.837,
    )


@pytest.fixture
def intermediate_location(db, city_origin):
    return Location.objects.create(
        name="Intermediária",
        formatted_address="Av. Intermediária, 3",
        city=city_origin,
        latitude=-5.1,
        longitude=-42.75,
    )


@pytest.fixture
def future_departure_time():
    return timezone.now() + timedelta(days=1)


@pytest.fixture
def driver_profile(db, django_user_model):
    user = django_user_model.objects.create_user(
        email="driver@example.com", password="x", full_name="Driver", cpf="11111111111"
    )
    return ProfileDriver.objects.create(user=user)


@pytest.fixture
def passenger_user(db, django_user_model):
    return django_user_model.objects.create_user(
        email="passenger@example.com", password="x", full_name="Passenger", cpf="22222222222"
    )


@pytest.fixture
def open_trip(
    db,
    driver_profile,
    city_origin,
    city_destination,
    origin_location,
    destination_location,
    future_departure_time,
):
    return trip_services.create_trip(
        driver=driver_profile,
        origin_city_id=city_origin.id,
        destine_city_id=city_destination.id,
        departure_time=future_departure_time,
        available_spots=2,
        origin_location_id=origin_location.id,
        destination_location_id=destination_location.id,
    )
 