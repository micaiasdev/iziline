from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError

from chat.models import Message
from chat.selectors import is_trip_participant
from trip.models import Trip


def message_send(*, trip_id, sender, content):
    """Cria e persiste uma mensagem no chat da viagem.

    Levanta Http404 se a viagem não existir.
    Levanta PermissionDenied se o sender não for participante da viagem.
    Levanta ValidationError se a viagem estiver cancelada.
    """
    trip = get_object_or_404(Trip.objects.select_related("driver"), id=trip_id)

    if not is_trip_participant(trip=trip, user=sender):
        raise PermissionDenied("Apenas participantes da viagem podem enviar mensagens.")

    if trip.is_cancelled:
        raise ValidationError({"trip": "Não é possível enviar mensagens em uma viagem cancelada."})

    return Message.objects.create(trip=trip, sender=sender, content=content)