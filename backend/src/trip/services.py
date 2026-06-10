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
    if seats_available < 1:
        raise ValueError(f"seats_available deve ser >= 1, recebido {seats_available}")
    key = frozenset({_normalize_city(origin), _normalize_city(destination)})
    distance_km = _KNOWN_DISTANCES_KM.get(key, _DEFAULT_DISTANCE_KM)
    total_cost = Decimal(distance_km) * _COST_PER_KM
    fare = total_cost / Decimal(seats_available + 1)
    return fare.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


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
