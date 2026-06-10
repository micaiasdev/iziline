from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APITestCase

from trip.models import Trip
from booking.models import Booking

User = get_user_model()


class BookingModelTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista", password="x")
        self.passenger = User.objects.create_user(username="passageiro", password="x")
        self.trip = Trip.objects.create(
            driver=self.driver, origin="Teresina", destination="Parnaiba",
            departure_at=timezone.now() + timedelta(days=1),
            seats_available=3, price=Decimal("10.00"),
        )

    def test_creates_booking(self):
        booking = Booking.objects.create(trip=self.trip, passenger=self.passenger)
        self.assertFalse(booking.is_cancelled)
        self.assertEqual(booking.trip, self.trip)
        self.assertEqual(booking.passenger, self.passenger)

    def test_active_duplicate_violates_constraint(self):
        Booking.objects.create(trip=self.trip, passenger=self.passenger)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Booking.objects.create(trip=self.trip, passenger=self.passenger)

    def test_allows_new_booking_after_cancellation(self):
        first = Booking.objects.create(trip=self.trip, passenger=self.passenger)
        first.is_cancelled = True
        first.save()
        Booking.objects.create(trip=self.trip, passenger=self.passenger)
        self.assertEqual(
            Booking.objects.filter(trip=self.trip, passenger=self.passenger, is_cancelled=False).count(),
            1,
        )
