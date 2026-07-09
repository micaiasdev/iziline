"""
selectors.py

Funções de LEITURA sobre o domínio de viagens. Nenhuma função aqui grava
nada no banco — só monta queries e devolve dados.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import PermissionDenied
from django.db.models import QuerySet
from django.utils import timezone

from core.exceptions import ApplicationError
from .models import Trip, TripStop, Booking, City, Location, TripCost, DriverLocation
@dataclass(frozen=True)
class FareParticipant:
    booking_id: int | None
    passenger_id: int | None
    pickup_order: int
    dropoff_order: int


# ---------------------------------------------------------------------------
# Busca de viagens disponíveis
# ---------------------------------------------------------------------------

def get_trips_opened(
    origin_city_id: int,
    destine_city_id: int,
    date_start=None,
    date_end=None,
) -> QuerySet[Trip]:
    """
    Versão "burra": compara só Trip.origin_city / Trip.destine_city.

    TODO (futuro): considerar TripStop -> Location -> City também, pra
    achar viagens onde a cidade buscada aparece como parada intermediária.

    date_start/date_end são opcionais:
    - nenhum dos dois: todas as trips OPEN a partir de agora
    - só date_start: trips OPEN a partir dessa data
    - os dois: trips OPEN dentro do intervalo [date_start, date_end]
    """
    qs = Trip.objects.filter(
        status=Trip.Status.OPEN,
        origin_city_id=origin_city_id,
        destine_city_id=destine_city_id,
    )

    if date_start and date_end:
        qs = qs.filter(departure_time__range=(date_start, date_end))
    elif date_start:
        qs = qs.filter(departure_time__gte=date_start)
    else:
        qs = qs.filter(departure_time__gte=timezone.now())

    return qs.select_related("origin_city", "destine_city", "driver", "cost").order_by("departure_time")


def get_trip(trip_id: int) -> Trip:
    return Trip.objects.select_related("driver", "origin_city", "destine_city", "cost").get(pk=trip_id)


# ---------------------------------------------------------------------------
# Requests de booking de uma trip (visão do motorista)
# ---------------------------------------------------------------------------

def get_trip_booking_requests(
    driver_profile_id: int,
    trip_id: int,
    status: str | None = Booking.Status.PENDING,
) -> QuerySet[Booking]:
    """
    Busca a trip garantindo que pertence a esse driver, depois lista os
    booking requests dela. Por padrão só mostra PENDING — passe status=None
    pra ver todos, independente do status.
    """
    try:
        trip = Trip.objects.get(pk=trip_id, driver_id=driver_profile_id)
    except Trip.DoesNotExist:
        raise PermissionDenied("Essa viagem não existe ou não pertence a este motorista.")

    qs = trip.bookings.select_related(
        "passenger", "pickup_stop__location", "dropoff_stop__location"
    )
    if status is not None:
        qs = qs.filter(status=status)

    return qs.order_by("created_at")


# ---------------------------------------------------------------------------
# Locations de uma city
# ---------------------------------------------------------------------------

def get_locations_of_city(city_id: int) -> QuerySet[Location]:
    return Location.objects.filter(city_id=city_id).order_by("name")


# ---------------------------------------------------------------------------
# Busca de cities por nome
# ---------------------------------------------------------------------------

def search_cities_by_name(query: str) -> list[dict]:
    """
    Busca por nome usando `icontains` nativo do Django — já é
    case-insensitive por padrão. Não ignora acentuação (MVP).

    Retorna já no formato pronto pro front: [{"id": 1, "label": "Teresina-PI"}, ...]
    """
    cities = City.objects.filter(name__icontains=query).order_by("name")

    return [
        {"id": city.id, "label": f"{city.name}-{city.state}"} for city in cities
    ]


# ---------------------------------------------------------------------------
# Bookings de um passageiro
# ---------------------------------------------------------------------------

def get_passenger_bookings(passenger_id: int) -> QuerySet[Booking]:
    """Pro passageiro acompanhar o status de cada reserva que ele fez."""
    return (
        Booking.objects.filter(passenger_id=passenger_id)
        .select_related("trip", "trip__origin_city", "trip__destine_city", "pickup_stop", "dropoff_stop")
        .order_by("-created_at")
    )


# ---------------------------------------------------------------------------
# Selectors de apoio (usados internamente pelos services)
# ---------------------------------------------------------------------------


def get_my_trips(user) -> list[dict]:
    """
    Todas as Trips relacionadas a esse usuário — como MOTORISTA (todas
    as que ele cadastrou) OU como PASSAGEIRO (só as que têm um booking
    CONFIRMED dele; pending/rejected/cancelled não contam como "virou
    viagem de verdade" pra ele).
 
    Cada item vem com "role" indicando o papel do usuário NAQUELA trip
    específica — útil pro frontend distinguir "suas viagens como
    motorista" de "suas viagens como passageiro" (ou juntar tudo numa
    lista só, ordenada por data, se preferir).
 
    Retorna: [{"trip": Trip, "role": "driver" | "passenger"}, ...]
    ordenado por departure_time.
    """
    trips_by_id: dict[int, dict] = {}
 
    try:
        driver_profile = user.driver_profile
    except ProfileDriver.DoesNotExist:
        driver_profile = None
 
    if driver_profile is not None:
        driver_trips = Trip.objects.filter(driver=driver_profile).select_related(
            "origin_city", "destine_city"
        )
        for trip in driver_trips:
            trips_by_id[trip.id] = {"trip": trip, "role": "driver"}
 
    passenger_trips = (
        Trip.objects.filter(
            bookings__passenger=user, bookings__status=Booking.Status.CONFIRMED
        )
        .select_related("origin_city", "destine_city")
        .distinct()
    )
    for trip in passenger_trips:
        # setdefault: se por acaso já apareceu como driver (não deveria
        # acontecer na prática), não sobrescreve o role
        trips_by_id.setdefault(trip.id, {"trip": trip, "role": "passenger"})
 
    results = list(trips_by_id.values())
    results.sort(key=lambda item: item["trip"].departure_time)
    return results
 

def get_trip_stops(trip: Trip) -> QuerySet[TripStop]:
    return trip.stops.select_related("location", "location__city").order_by("order")


def get_endpoint_stops(trip: Trip) -> tuple[TripStop | None, TripStop | None]:
    """(stop_de_origem, stop_de_destino) — os dois extremos (menor/maior order)."""
    stops = list(get_trip_stops(trip))
    if not stops:
        return None, None
    return stops[0], stops[-1]


def get_confirmed_stop_ids(trip: Trip) -> set[int]:
    confirmed = Booking.objects.filter(trip=trip, status=Booking.Status.CONFIRMED)
    pickup_ids = confirmed.values_list("pickup_stop_id", flat=True)
    dropoff_ids = confirmed.values_list("dropoff_stop_id", flat=True)
    return set(pickup_ids) | set(dropoff_ids)


def get_route_stops(trip: Trip) -> QuerySet[TripStop]:
    """Stops publicados pelo motorista, na ordem em que ele pretende passar."""
    return get_trip_stops(trip)


def get_confirmed_seats_count(trip: Trip) -> int:
    """Cada Booking confirmado ocupa exatamente 1 vaga."""
    return Booking.objects.filter(trip=trip, status=Booking.Status.CONFIRMED).count()


def get_available_seats(trip: Trip) -> int:
    return trip.available_spots - get_confirmed_seats_count(trip)


def user_is_trip_participant(*, trip: Trip, user_id: int) -> bool:
    if trip.driver and trip.driver.user_id == user_id:
        return True

    return Booking.objects.filter(
        trip=trip,
        passenger_id=user_id,
        status=Booking.Status.CONFIRMED,
    ).exists()


def get_driver_location_for_participant(*, trip_id: int, user_id: int) -> DriverLocation:
    trip = Trip.objects.select_related("driver").get(pk=trip_id)

    if trip.status != Trip.Status.IN_PROGRESS:
        raise ApplicationError("A localização do motorista só fica disponível durante a viagem em andamento.")

    if not user_is_trip_participant(trip=trip, user_id=user_id):
        raise PermissionDenied("Você não participa desta viagem.")

    return DriverLocation.objects.select_related("trip").get(trip=trip)


# ---------------------------------------------------------------------------
# Rateamento de custo
# ---------------------------------------------------------------------------

def get_fare_split(trip: Trip) -> list[dict]:
    """
    Divide trip.cost.total_cost (TripCost, fixado na criação da viagem —
    ver services.create_trip_cost) entre os passageiros CONFIRMADOS,
    proporcionalmente à distância de cada trecho da rota, dividindo cada
    trecho entre o motorista e os passageiros que ocupavam aquele trecho.

    Algoritmo, por trecho (par de paradas consecutivas na rota atual):
    1. custo_do_trecho = total_cost * (distância_do_trecho / distância_total)
    2. passageiros_no_trecho = confirmados cujo pickup.order <= início do
       trecho E dropoff.order >= fim do trecho (ou seja, estavam "a bordo"
       durante esse trecho inteiro)
    3. custo_do_trecho é dividido entre esses passageiros + motorista
    4. se NINGUÉM está no trecho, o trecho fica integralmente com o motorista
    5. o total de cada passageiro é a soma do que ele deve em cada
       trecho que ocupou

    Requer trip.route_legs consistente com a rota atual (chame
    recalculate_route() antes se a rota mudou desde o último cálculo) —
    trip.cost.total_cost em si NÃO muda, só a forma como é dividido pode
    mudar se os stops confirmados mudarem.

    Retorna: [{"booking_id": .., "passenger_id": .., "amount": Decimal}, ...]
    """
    participants = _build_confirmed_fare_participants(trip)
    fare_amounts = _calculate_fare_amounts(trip=trip, participants=participants)

    return [
        {
            "booking_id": participant.booking_id,
            "passenger_id": participant.passenger_id,
            "amount": _quantize_money(fare_amounts[index]),
        }
        for index, participant in enumerate(participants)
    ]


def get_fare_overview(trip: Trip) -> dict:
    total_cost = _get_total_cost(trip)
    split = get_fare_split(trip)
    covered_amount = sum((item["amount"] for item in split), start=Decimal("0"))

    return {
        "trip_id": trip.id,
        "total_cost": total_cost,
        "covered_amount": _quantize_money(covered_amount),
        "driver_amount": _quantize_money(total_cost - covered_amount),
        "confirmed_passengers": len(split),
        "split": split,
    }


def get_projected_fare_quote(
    *,
    trip: Trip,
    pickup_stop_id: int,
    dropoff_stop_id: int,
) -> dict:
    pickup_stop = TripStop.objects.get(pk=pickup_stop_id, trip=trip)
    dropoff_stop = TripStop.objects.get(pk=dropoff_stop_id, trip=trip)

    if pickup_stop.order >= dropoff_stop.order:
        raise ApplicationError("O ponto de embarque precisa vir antes do ponto de desembarque.")

    participants = _build_confirmed_fare_participants(trip)
    participants.append(
        FareParticipant(
            booking_id=None,
            passenger_id=None,
            pickup_order=pickup_stop.order,
            dropoff_order=dropoff_stop.order,
        )
    )
    fare_amounts = _calculate_fare_amounts(trip=trip, participants=participants)

    return {
        "trip_id": trip.id,
        "pickup_stop_id": pickup_stop.id,
        "dropoff_stop_id": dropoff_stop.id,
        "estimated_amount": _quantize_money(fare_amounts[-1]),
        "total_cost": _quantize_money(_get_total_cost(trip)),
        "current_confirmed_passengers": max(len(participants) - 1, 0),
    }


def _get_total_cost(trip: Trip) -> Decimal:
    try:
        return trip.cost.total_cost
    except TripCost.DoesNotExist:
        raise ValueError(
            "Essa viagem não tem TripCost associado — isso não deveria "
            "acontecer (create_trip sempre cria um junto). Verifique os dados."
        )


def _get_route_cost_context(trip: Trip) -> tuple[list[TripStop], Decimal]:
    route_stops = list(get_route_stops(trip))
    if len(route_stops) < 2:
        return [], Decimal("0")

    if not trip.route_legs or len(trip.route_legs) != len(route_stops) - 1:
        raise ValueError(
            "trip.route_legs não bate com o número de trechos da rota atual — "
            "chame recalculate_route(trip) antes de ratear."
        )

    if not trip.total_distance_km or trip.total_distance_km <= 0:
        raise ValueError("A viagem não tem distância total calculada.")

    return route_stops, Decimal(str(trip.total_distance_km))


def _build_confirmed_fare_participants(trip: Trip) -> list[FareParticipant]:
    confirmed_bookings = (
        Booking.objects.filter(trip=trip, status=Booking.Status.CONFIRMED)
        .select_related("pickup_stop", "dropoff_stop", "passenger")
        .order_by("id")
    )

    return [
        FareParticipant(
            booking_id=booking.id,
            passenger_id=booking.passenger_id,
            pickup_order=booking.pickup_stop.order,
            dropoff_order=booking.dropoff_stop.order,
        )
        for booking in confirmed_bookings
    ]


def _calculate_fare_amounts(
    *,
    trip: Trip,
    participants: list[FareParticipant],
) -> list[Decimal]:
    total_cost = _get_total_cost(trip)
    route_stops, total_distance = _get_route_cost_context(trip)
    if len(route_stops) < 2 or not participants:
        return [Decimal("0.00") for _ in participants]

    fare_amounts = [Decimal("0") for _ in participants]

    for index in range(len(route_stops) - 1):
        segment_start = route_stops[index]
        segment_end = route_stops[index + 1]
        leg_distance_km = Decimal(str(trip.route_legs[index]["distance_km"]))
        segment_cost = total_cost * leg_distance_km / total_distance

        passengers_on_segment = [
            participant_index
            for participant_index, participant in enumerate(participants)
            if participant.pickup_order <= segment_start.order
            and participant.dropoff_order >= segment_end.order
        ]

        payer_count = len(passengers_on_segment) + 1  # motorista participa do rateio
        share = segment_cost / payer_count
        for participant_index in passengers_on_segment:
            fare_amounts[participant_index] += share

    return fare_amounts


def _quantize_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
