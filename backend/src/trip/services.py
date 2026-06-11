import unicodedata
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from trip.models import Trip


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
    if seats_available < 1:
        raise ValidationError({"seats_available": "Deve haver ao menos 1 vaga."})
    key = frozenset({_normalize_city(origin), _normalize_city(destination)})
    distance_km = _KNOWN_DISTANCES_KM.get(key, _DEFAULT_DISTANCE_KM)
    total_cost = Decimal(distance_km) * _COST_PER_KM
    fare = total_cost / Decimal(seats_available + 1)
    return fare.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


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


def trip_cancel(*, trip_id, user):
    """Cancela uma viagem e todas as reservas ativas associadas.
 
    Apenas o motorista da viagem pode cancelar.
    Viagens já canceladas não podem ser canceladas novamente.
    """
    with transaction.atomic():
        try:
            trip = Trip.objects.select_for_update().get(id=trip_id)
        except Trip.DoesNotExist:
            from django.http import Http404
            raise Http404
 
        if trip.driver_id != user.id:
            raise PermissionDenied("Apenas o motorista pode cancelar esta viagem.")
 
        if trip.is_cancelled:
            raise ValidationError({"trip": "Esta viagem já está cancelada."})
 
        trip.is_cancelled = True
        trip.save(update_fields=["is_cancelled", "updated_at"])
 
        # Cancela em cascata todas as reservas ativas desta viagem
        trip.bookings.filter(is_cancelled=False).update(is_cancelled=True)
 
        return trip
 