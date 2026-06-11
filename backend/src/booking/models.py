from django.conf import settings
from django.db import models
from django.db.models import Q, UniqueConstraint


class Booking(models.Model):
    trip = models.ForeignKey('trip.Trip', on_delete=models.CASCADE, related_name='bookings')
    passenger = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings'
    )
    is_cancelled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            UniqueConstraint(
                fields=['trip', 'passenger'],
                condition=Q(is_cancelled=False),
                name='unique_active_booking_per_passenger_per_trip',
            )
        ]

    def __str__(self) -> str:
        return f"Booking {self.id} — passenger {self.passenger_id} on trip {self.trip_id}"
