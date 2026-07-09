from django.conf import settings
from django.db import models


class Message(models.Model):
    trip = models.ForeignKey(
        'trip.Trip',
        on_delete=models.CASCADE,
        related_name='messages',
        null=True,
        blank=True,
    )
    booking = models.ForeignKey(
        'trip.Booking',
        on_delete=models.CASCADE,
        related_name='messages',
        null=True,
        blank=True,
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_messages',
    )
    content = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sent_at']  # cronológico — mais antigas primeiro
        constraints = [
            models.CheckConstraint(
                condition=(
                    (
                        models.Q(trip__isnull=False)
                        & models.Q(booking__isnull=True)
                    )
                    | (
                        models.Q(trip__isnull=True)
                        & models.Q(booking__isnull=False)
                    )
                ),
                name='chat_message_exactly_one_context',
            ),
        ]

    def __str__(self) -> str:
        if self.booking_id is not None:
            target = f"booking {self.booking_id}"
        else:
            target = f"trip {self.trip_id}"
        return f"Message {self.id} — {self.sender_id} -> {target} @ {self.sent_at.isoformat()}"
