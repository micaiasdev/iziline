from django.shortcuts import get_object_or_404

from booking.models import Booking
from chat.models import Message
from trip.models import Trip


def is_trip_participant(*, trip, user):
    """Retorna True se o user é motorista ou passageiro ativo da viagem."""
    if trip.driver_id == user.id:
        return True
    return Booking.objects.filter(
        trip=trip,
        passenger=user,
        is_cancelled=False,
    ).exists()


def message_list(*, trip_id, user):
    """Retorna as mensagens de uma viagem em ordem cronológica.

    Levanta Http404 se a viagem não existir.
    Levanta PermissionDenied se o user não for participante da viagem.
    """
    from rest_framework.exceptions import PermissionDenied

    trip = get_object_or_404(Trip.objects.select_related("driver"), id=trip_id)

    if not is_trip_participant(trip=trip, user=user):
        raise PermissionDenied("Apenas participantes da viagem podem ler as mensagens.")

    return (
        Message.objects.filter(trip=trip)
        .select_related("sender")
        .order_by("sent_at")
    )