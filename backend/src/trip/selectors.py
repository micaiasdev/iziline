"""
selectors.py

Funções de LEITURA sobre o domínio de viagens. Nenhuma função aqui grava
nada no banco — só monta queries e devolve dados.
"""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import PermissionDenied
from django.db.models import QuerySet
from django.utils import timezone

from .models import Trip, TripStop, Booking, City, Location, TripCost, ProfileDriver


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

    return qs.select_related("origin_city", "destine_city", "driver").order_by("departure_time")


def get_trip(trip_id: int) -> Trip:
    return Trip.objects.select_related("driver", "origin_city", "destine_city").get(pk=trip_id)


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
    """Stops que devem estar na geometria agora: extremos + intermediários com booking confirmado."""
    origin_stop, destination_stop = get_endpoint_stops(trip)
    stop_ids = get_confirmed_stop_ids(trip)

    if origin_stop:
        stop_ids.add(origin_stop.id)
    if destination_stop:
        stop_ids.add(destination_stop.id)

    return trip.stops.filter(id__in=stop_ids).select_related("location").order_by("order")


def get_confirmed_seats_count(trip: Trip) -> int:
    """Cada Booking confirmado ocupa exatamente 1 vaga."""
    return Booking.objects.filter(trip=trip, status=Booking.Status.CONFIRMED).count()


def get_available_seats(trip: Trip) -> int:
    return trip.available_spots - get_confirmed_seats_count(trip)


# ---------------------------------------------------------------------------
# Rateamento de custo
# ---------------------------------------------------------------------------

def get_fare_split(trip: Trip) -> list[dict]:
    """
    Divide trip.cost.total_cost (TripCost, fixado na criação da viagem —
    ver services.create_trip_cost) entre os passageiros CONFIRMADOS,
    proporcionalmente à distância de cada trecho da rota e a quantos
    passageiros ocupavam aquele trecho especificamente — não é "total
    dividido por N".

    Algoritmo, por trecho (par de paradas consecutivas na rota atual):
    1. custo_do_trecho = total_cost * (distância_do_trecho / distância_total)
    2. passageiros_no_trecho = confirmados cujo pickup.order <= início do
       trecho E dropoff.order >= fim do trecho (ou seja, estavam "a bordo"
       durante esse trecho inteiro)
    3. custo_do_trecho é dividido igualmente entre eles
    4. se NINGUÉM está no trecho (ex: motorista saindo de casa antes do
       primeiro embarque), esse custo não é rateado — fica implícito
       como custo do motorista, não de nenhum passageiro
    5. o total de cada passageiro é a soma do que ele deve em cada
       trecho que ocupou

    Requer trip.route_legs consistente com a rota atual (chame
    recalculate_route() antes se a rota mudou desde o último cálculo) —
    trip.cost.total_cost em si NÃO muda, só a forma como é dividido pode
    mudar se os stops confirmados mudarem.

    Retorna: [{"booking_id": .., "passenger_id": .., "amount": Decimal}, ...]
    """
    try:
        total_cost = trip.cost.total_cost
    except TripCost.DoesNotExist:
        raise ValueError(
            "Essa viagem não tem TripCost associado — isso não deveria "
            "acontecer (create_trip sempre cria um junto). Verifique os dados."
        )

    route_stops = list(get_route_stops(trip))
    if len(route_stops) < 2:
        return []

    if not trip.route_legs or len(trip.route_legs) != len(route_stops) - 1:
        raise ValueError(
            "trip.route_legs não bate com o número de trechos da rota atual — "
            "chame recalculate_route(trip) antes de ratear."
        )

    if not trip.total_distance_km or trip.total_distance_km <= 0:
        raise ValueError("A viagem não tem distância total calculada.")

    total_distance = Decimal(str(trip.total_distance_km))

    confirmed_bookings = list(
        Booking.objects.filter(trip=trip, status=Booking.Status.CONFIRMED)
        .select_related("pickup_stop", "dropoff_stop", "passenger")
    )
    fare_by_booking = {booking.id: Decimal("0") for booking in confirmed_bookings}

    for index in range(len(route_stops) - 1):
        segment_start = route_stops[index]
        segment_end = route_stops[index + 1]
        leg_distance_km = Decimal(str(trip.route_legs[index]["distance_km"]))

        segment_cost = total_cost * leg_distance_km / total_distance

        passengers_on_segment = [
            booking for booking in confirmed_bookings
            if booking.pickup_stop.order <= segment_start.order
            and booking.dropoff_stop.order >= segment_end.order
        ]

        if not passengers_on_segment:
            continue  # ninguém nesse trecho — custo fica implícito com o motorista

        share = segment_cost / len(passengers_on_segment)
        for booking in passengers_on_segment:
            fare_by_booking[booking.id] += share

    return [
        {
            "booking_id": booking.id,
            "passenger_id": booking.passenger_id,
            "amount": fare_by_booking[booking.id].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        }
        for booking in confirmed_bookings
    ]