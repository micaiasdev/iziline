from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from trip.models import Trip
from booking.models import Booking


def booking_create(*, trip_id, passenger):
    with transaction.atomic():
        trip = get_object_or_404(Trip.objects.select_for_update(), id=trip_id)

        if trip.is_cancelled:
            raise ValidationError({"trip": "Esta viagem foi cancelada."})
        if trip.departure_at <= timezone.now():
            raise ValidationError({"trip": "Não é possível reservar uma viagem passada."})
        if trip.driver_id == passenger.id:
            raise ValidationError({"trip": "O motorista não pode reservar a própria viagem."})
        if Booking.objects.filter(trip=trip, passenger=passenger, is_cancelled=False).exists():
            raise ValidationError({"trip": "Você já tem uma reserva ativa nesta viagem."})
        if trip.seats_available < 1:
            raise ValidationError({"trip": "Não há vagas disponíveis."})

        trip.seats_available -= 1
        trip.save(update_fields=["seats_available", "updated_at"])
        return Booking.objects.create(trip=trip, passenger=passenger)


def booking_cancel(*, booking_id, user):
    """Cancela uma reserva ativa e devolve a vaga à viagem.

    Apenas o próprio passageiro pode cancelar sua reserva.
    Reservas já canceladas não podem ser canceladas novamente.
    Não é possível cancelar reservas de viagens já partidas.
    """
    with transaction.atomic():
        booking = get_object_or_404(
            Booking.objects.select_related("trip").select_for_update(),
            id=booking_id,
        )

        if booking.passenger_id != user.id:
            raise PermissionDenied("Apenas o passageiro pode cancelar sua própria reserva.")

        if booking.is_cancelled:
            raise ValidationError({"booking": "Esta reserva já está cancelada."})

        if booking.trip.departure_at <= timezone.now():
            raise ValidationError({"booking": "Não é possível cancelar uma reserva de viagem já partida."})

        booking.is_cancelled = True
        booking.save(update_fields=["is_cancelled", "updated_at"])

        # Devolve a vaga à viagem
        Trip.objects.filter(id=booking.trip_id).update(
            seats_available=booking.trip.seats_available + 1
        )

        return booking