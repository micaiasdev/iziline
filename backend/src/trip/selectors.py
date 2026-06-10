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
