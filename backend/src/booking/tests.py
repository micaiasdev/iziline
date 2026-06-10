from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.http import Http404
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase

from trip.models import Trip
from booking.models import Booking
from booking.services import booking_create

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


class BookingCreateServiceTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista2", password="x")
        self.passenger = User.objects.create_user(username="passageiro2", password="x")
        self.trip = Trip.objects.create(
            driver=self.driver, origin="Teresina", destination="Parnaiba",
            departure_at=timezone.now() + timedelta(days=1),
            seats_available=3, price=Decimal("10.00"),
        )

    def test_creates_booking_and_decrements_seats(self):
        booking = booking_create(trip_id=self.trip.id, passenger=self.passenger)
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.seats_available, 2)
        self.assertEqual(booking.passenger, self.passenger)
        self.assertFalse(booking.is_cancelled)

    def test_nonexistent_trip_raises_404(self):
        with self.assertRaises(Http404):
            booking_create(trip_id=999999, passenger=self.passenger)

    def test_cannot_book_cancelled_trip(self):
        self.trip.is_cancelled = True
        self.trip.save()
        with self.assertRaises(ValidationError):
            booking_create(trip_id=self.trip.id, passenger=self.passenger)

    def test_cannot_book_past_trip(self):
        past = Trip.objects.create(
            driver=self.driver, origin="A", destination="B",
            departure_at=timezone.now() - timedelta(days=1),
            seats_available=3, price=Decimal("10.00"),
        )
        with self.assertRaises(ValidationError):
            booking_create(trip_id=past.id, passenger=self.passenger)

    def test_driver_cannot_book_own_trip(self):
        with self.assertRaises(ValidationError):
            booking_create(trip_id=self.trip.id, passenger=self.driver)

    def test_cannot_book_twice(self):
        booking_create(trip_id=self.trip.id, passenger=self.passenger)
        with self.assertRaises(ValidationError):
            booking_create(trip_id=self.trip.id, passenger=self.passenger)

    def test_cannot_book_when_full(self):
        self.trip.seats_available = 0
        self.trip.save()
        with self.assertRaises(ValidationError):
            booking_create(trip_id=self.trip.id, passenger=self.passenger)
