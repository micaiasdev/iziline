from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError

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
