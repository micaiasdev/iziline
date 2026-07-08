"""
services/trip.py

Funções de ESCRITA sobre o domínio de viagens — toda regra de negócio que
grava algo no banco mora aqui.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone

from core.exceptions import ApplicationError
from trip.models import Trip, TripStop, Booking, ProfileDriver, Location
from trip.models import TripCost
from trip import selectors
from trip.services.routing import get_routing_client, RoutingError


class TripServiceError(ApplicationError):
    """Erro de regra de negócio (não de infraestrutura)."""


@dataclass
class StopInput:
    location_id: int
    order: int


# ---------------------------------------------------------------------------
# Recálculo de rota — usado por create_trip, accept_booking_request e
# new_map_order. Única função que fala com o routing.py e grava
# line_trip/total_distance_km/total_duration_min.
# ---------------------------------------------------------------------------

def recalculate_route(trip: Trip) -> Trip:
    route_stops = list(selectors.get_route_stops(trip))
    if len(route_stops) < 2:
        raise TripServiceError("A viagem precisa de pelo menos origem e destino pra calcular rota.")
 
    coordinates = [(stop.location.longitude, stop.location.latitude) for stop in route_stops]
 
    client = get_routing_client()
    try:
        route = client.get_route(coordinates)
    except RoutingError as exc:
        raise TripServiceError(f"Não foi possível calcular a rota: {exc}") from exc
 
    trip.line_trip = route.geometry
    trip.total_distance_km = route.distance_km
    trip.total_duration_min = route.duration_min
    trip.route_legs = route.legs
    trip.save(update_fields=[
        "line_trip", "total_distance_km", "total_duration_min", "route_legs", "updated_at",
    ])
    return trip


def create_trip_cost(trip: Trip) -> TripCost:
    """
    Calcula e FIXA o custo da viagem, uma única vez — usa
    trip.total_distance_km (precisa já estar calculado, ou seja, chamar
    depois de recalculate_route) x settings.PRICE_PER_KM vigente agora.
    Não é chamado de novo depois disso; o custo não muda mesmo que a
    rota seja recalculada por causa de bookings confirmados.
    """
    if trip.total_distance_km is None:
        raise TripServiceError("A viagem precisa ter a rota calculada antes de fixar o custo.")

    if TripCost.objects.filter(trip=trip).exists():
        raise TripServiceError("Essa viagem já possui um custo fixado.")

    price_per_km = Decimal(str(settings.PRICE_PER_KM))
    distance_km = Decimal(str(trip.total_distance_km))
    total_cost = (price_per_km * distance_km).quantize(Decimal("0.01"))
 
    return TripCost.objects.create(
        trip=trip,
        price_per_km=price_per_km,
        distance_km_snapshot=trip.total_distance_km,
        total_cost=total_cost,
    )
 

# ---------------------------------------------------------------------------
# Criar viagem
# ---------------------------------------------------------------------------

@transaction.atomic
def create_trip(
    *,
    driver: ProfileDriver,
    origin_city_id: int,
    destine_city_id: int,
    departure_time,
    available_spots: int,
    origin_location_id: int,
    destination_location_id: int,
    intermediate_location_ids: list[int] | None = None,
) -> Trip:
    """
    origin_location_id / destination_location_id: os pontos fixos que o
    motorista sempre vai passar (viram TripStop de order 0 e order N).
    intermediate_location_ids: locations extras oferecidas como possíveis
    paradas — na ordem em que o motorista pretende passar por elas.
    """
    if available_spots <= 0:
        raise TripServiceError("A viagem precisa ter pelo menos 1 vaga disponível.")

    if departure_time <= timezone.now():
        raise TripServiceError("A data/hora de partida precisa estar no futuro.")

    intermediate_location_ids = intermediate_location_ids or []

    origin_location = Location.objects.get(pk=origin_location_id)
    if origin_location.city_id != origin_city_id:
        raise TripServiceError("A location de origem não pertence à cidade de origem informada.")

    destination_location = Location.objects.get(pk=destination_location_id)
    if destination_location.city_id != destine_city_id:
        raise TripServiceError("A location de destino não pertence à cidade de destino informada.")

    trip = Trip.objects.create(
        driver=driver,
        origin_city_id=origin_city_id,
        destine_city_id=destine_city_id,
        departure_time=departure_time,
        available_spots=available_spots,
    )

    ordered_location_ids = [origin_location_id, *intermediate_location_ids, destination_location_id]
    TripStop.objects.bulk_create([
        TripStop(trip=trip, location_id=location_id, order=index)
        for index, location_id in enumerate(ordered_location_ids)
    ])

    recalculate_route(trip)
    create_trip_cost(trip)
    return trip


# ---------------------------------------------------------------------------
# Criar / cancelar request de booking
# ---------------------------------------------------------------------------

@transaction.atomic
def create_booking_request(
    *,
    passenger,
    trip_id: int,
    pickup_stop_id: int,
    dropoff_stop_id: int,
) -> Booking:
    trip = Trip.objects.select_for_update().get(pk=trip_id)

    if trip.status != Trip.Status.OPEN:
        raise TripServiceError("Esta viagem não está mais aceitando passageiros.")

    pickup_stop = TripStop.objects.get(pk=pickup_stop_id, trip=trip)
    dropoff_stop = TripStop.objects.get(pk=dropoff_stop_id, trip=trip)

    if pickup_stop.order >= dropoff_stop.order:
        raise TripServiceError("O ponto de embarque precisa vir antes do ponto de desembarque.")

    if selectors.get_available_seats(trip) < 1:
        raise TripServiceError("Não há vagas disponíveis nesta viagem.")

    return Booking.objects.create(
        trip=trip,
        passenger=passenger,
        pickup_stop=pickup_stop,
        dropoff_stop=dropoff_stop,
        status=Booking.Status.PENDING,
    )


@transaction.atomic
def cancel_booking_request(*, booking_id: int, passenger) -> Booking:
    """
    Só é possível cancelar requests PENDING. Depois de aceita (CONFIRMED),
    cancelamento fica pra uma feature futura.
    """
    booking = Booking.objects.select_for_update().get(pk=booking_id)

    if booking.passenger_id != passenger.id:
        raise PermissionDenied("Esse booking não pertence a este passageiro.")

    if booking.status != Booking.Status.PENDING:
        raise TripServiceError(
            "Só é possível cancelar requests que ainda não foram aceitas pelo motorista."
        )

    booking.status = Booking.Status.CANCELLED
    booking.save(update_fields=["status"])
    return booking


# ---------------------------------------------------------------------------
# Aceitar / recusar request de booking
# ---------------------------------------------------------------------------

@transaction.atomic
def accept_booking_request(*, booking_id: int, driver_profile_id: int) -> Booking:
    booking = Booking.objects.select_for_update().select_related("trip").get(pk=booking_id)
    trip = Trip.objects.select_for_update().get(pk=booking.trip_id)

    if trip.driver_id != driver_profile_id:
        raise PermissionDenied("Essa viagem não pertence a este motorista.")

    if booking.status != Booking.Status.PENDING:
        raise TripServiceError("Só é possível aceitar requests pendentes.")

    if selectors.get_available_seats(trip) < 1:
        raise TripServiceError("Não há mais vagas disponíveis pra aceitar este request.")

    booking.status = Booking.Status.CONFIRMED
    booking.confirmed_at = timezone.now()
    booking.save(update_fields=["status", "confirmed_at"])

    recalculate_route(trip)  # a parada confirmada agora entra na geometria

    if selectors.get_available_seats(trip) == 0:
        trip.status = Trip.Status.FULL
        trip.save(update_fields=["status", "updated_at"])

    return booking


@transaction.atomic
def reject_booking_request(*, booking_id: int, driver_profile_id: int) -> Booking:
    booking = Booking.objects.select_for_update().select_related("trip").get(pk=booking_id)

    if booking.trip.driver_id != driver_profile_id:
        raise PermissionDenied("Essa viagem não pertence a este motorista.")

    if booking.status != Booking.Status.PENDING:
        raise TripServiceError("Só é possível recusar requests pendentes.")

    booking.status = Booking.Status.REJECTED
    booking.save(update_fields=["status"])
    return booking


# ---------------------------------------------------------------------------
# Reordenar paradas / recalcular mapa
# ---------------------------------------------------------------------------

@transaction.atomic
def update_order(
    *,
    trip_id: int,
    driver_profile_id: int,
    stop_orders: list[tuple[int, int]],  # [(trip_stop_id, novo_order), ...]
) -> None:
    """
    Só atualiza o campo `order` dos TripStops — não recalcula o mapa.
    Pra ver/persistir o novo traçado depois de reordenar, chame
    new_map_order() em seguida.

    ASSUNÇÃO ATUAL (MVP): confiamos que o frontend sempre manda uma
    sequência de `order` válida (crescente, sem buracos). Ainda não
    validamos isso aqui.
    TODO: validar que os valores de `order` formam uma sequência
    contígua começando em 0 (0, 1, 2, ...), sem pular números.
    """
    trip = Trip.objects.get(pk=trip_id, driver_id=driver_profile_id)

    stops_by_id = {stop.id: stop for stop in trip.stops.all()}
    new_orders = [order for _, order in stop_orders]

    if len(new_orders) != len(set(new_orders)):
        raise TripServiceError("Cada stop precisa de um `order` único.")

    if set(stops_by_id.keys()) != {stop_id for stop_id, _ in stop_orders}:
        raise TripServiceError("A lista precisa incluir todos os stops da viagem, e só eles.")

    updated_stops = []
    for stop_id, new_order in stop_orders:
        stop = stops_by_id[stop_id]
        stop.order = new_order
        updated_stops.append(stop)

    TripStop.objects.bulk_update(updated_stops, ["order"])


def new_map_order(*, trip_id: int, driver_profile_id: int) -> Trip:
    """
    Chamado depois de update_order (ou sempre que quiser ver/persistir o
    traçado atual). É a mesma lógica de recalculate_route, só que exposta
    aqui como o ponto de entrada específico pra esse fluxo de "motorista
    reordenou e quer ver o novo mapa".
    """
    trip = Trip.objects.get(pk=trip_id, driver_id=driver_profile_id)
    return recalculate_route(trip)
