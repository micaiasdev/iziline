from __future__ import annotations

from django.core.exceptions import PermissionDenied

from core.exceptions import ApplicationError
from chat.models import Message
from trip.models import Booking, Trip


def message_list_for_booking(*, booking_id: int, user, after_id: int | None = None):
    booking = Booking.objects.select_related("trip__driver__user", "passenger").get(pk=booking_id)
    _assert_booking_chat_access(booking=booking, user=user)

    qs = Message.objects.filter(booking=booking).select_related("sender").order_by("sent_at", "id")
    if after_id is not None:
        qs = qs.filter(id__gt=after_id)
    return qs


def message_list_for_trip(*, trip_id: int, user, after_id: int | None = None):
    trip = Trip.objects.select_related("driver__user").get(pk=trip_id)
    _assert_trip_chat_access(trip=trip, user=user)

    qs = Message.objects.filter(trip=trip).select_related("sender").order_by("sent_at", "id")
    if after_id is not None:
        qs = qs.filter(id__gt=after_id)
    return qs


def _assert_booking_chat_access(*, booking: Booking, user) -> None:
    if booking.status != Booking.Status.PENDING:
        raise ApplicationError(
            "O chat da reserva só fica disponível enquanto a solicitação estiver pendente."
        )

    if booking.passenger_id == user.id:
        return

    trip_driver_user_id = booking.trip.driver.user_id if booking.trip.driver_id else None
    if trip_driver_user_id == user.id:
        return

    raise PermissionDenied("Apenas o passageiro e o motorista dessa reserva podem acessar esse chat.")


def _assert_trip_chat_access(*, trip: Trip, user) -> None:
    if trip.driver_id and trip.driver.user_id == user.id:
        return

    is_confirmed_passenger = Booking.objects.filter(
        trip=trip,
        passenger_id=user.id,
        status=Booking.Status.CONFIRMED,
    ).exists()
    if is_confirmed_passenger:
        return

    raise PermissionDenied("Apenas participantes confirmados da viagem podem acessar esse chat.")
