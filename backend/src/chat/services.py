from __future__ import annotations

from django.db import transaction

from chat.models import Message
from chat.selectors import _assert_booking_chat_access, _assert_trip_chat_access
from trip.models import Booking, Trip


@transaction.atomic
def message_send_for_booking(*, booking_id: int, sender, content: str) -> Message:
    booking = Booking.objects.select_related("trip__driver__user", "passenger").get(pk=booking_id)
    _assert_booking_chat_access(booking=booking, user=sender)

    return Message.objects.create(
        booking=booking,
        sender=sender,
        content=content,
    )


@transaction.atomic
def message_send_for_trip(*, trip_id: int, sender, content: str) -> Message:
    trip = Trip.objects.select_related("driver__user").get(pk=trip_id)
    _assert_trip_chat_access(trip=trip, user=sender)

    return Message.objects.create(
        trip=trip,
        sender=sender,
        content=content,
    )
