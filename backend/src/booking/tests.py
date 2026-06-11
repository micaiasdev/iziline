from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.http import Http404
from django.urls import reverse
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APITestCase

from trip.models import Trip
from booking.models import Booking
from booking.services import booking_cancel, booking_create
from booking.selectors import user_agenda
from booking.serializers import (
    AgendaFilterSerializer,
    AgendaTripSerializer,
    BookingCreateSerializer,
    BookingDetailSerializer,
)

User = get_user_model()


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def make_trip(driver, departure_at=None, **overrides):
    defaults = dict(
        origin="Teresina",
        destination="Parnaiba",
        departure_at=departure_at or timezone.now() + timedelta(days=1),
        seats_available=3,
        price=Decimal("10.00"),
    )
    defaults.update(overrides)
    return Trip.objects.create(driver=driver, **defaults)


# ──────────────────────────────────────────────
# Testes existentes (inalterados)
# ──────────────────────────────────────────────

class BookingModelTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista", password="x")
        self.passenger = User.objects.create_user(username="passageiro", password="x")
        self.trip = make_trip(self.driver)

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
        self.trip = make_trip(self.driver)

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
        past = make_trip(self.driver, departure_at=timezone.now() - timedelta(days=1))
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


# ──────────────────────────────────────────────
# Novos testes — booking_cancel (Issue #30)
# ──────────────────────────────────────────────

class BookingCancelServiceTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista_bc", password="x")
        self.passenger = User.objects.create_user(username="passageiro_bc", password="x")
        self.other = User.objects.create_user(username="outro_bc", password="x")
        self.trip = make_trip(self.driver, seats_available=3)
        self.booking = Booking.objects.create(trip=self.trip, passenger=self.passenger)

    def test_passenger_can_cancel_booking(self):
        booking = booking_cancel(booking_id=self.booking.id, user=self.passenger)
        self.assertTrue(booking.is_cancelled)
        self.booking.refresh_from_db()
        self.assertTrue(self.booking.is_cancelled)

    def test_cancel_restores_seat_to_trip(self):
        self.trip.seats_available = 2
        self.trip.save()

        booking_cancel(booking_id=self.booking.id, user=self.passenger)

        self.trip.refresh_from_db()
        self.assertEqual(self.trip.seats_available, 3)

    def test_non_passenger_cannot_cancel(self):
        with self.assertRaises(PermissionDenied):
            booking_cancel(booking_id=self.booking.id, user=self.other)
        self.booking.refresh_from_db()
        self.assertFalse(self.booking.is_cancelled)

    def test_driver_cannot_cancel_passenger_booking(self):
        with self.assertRaises(PermissionDenied):
            booking_cancel(booking_id=self.booking.id, user=self.driver)

    def test_cannot_cancel_already_cancelled_booking(self):
        self.booking.is_cancelled = True
        self.booking.save()
        with self.assertRaises(ValidationError):
            booking_cancel(booking_id=self.booking.id, user=self.passenger)

    def test_cannot_cancel_booking_of_departed_trip(self):
        past_trip = make_trip(self.driver, departure_at=timezone.now() - timedelta(hours=1))
        past_booking = Booking.objects.create(trip=past_trip, passenger=self.passenger)
        with self.assertRaises(ValidationError):
            booking_cancel(booking_id=past_booking.id, user=self.passenger)

    def test_nonexistent_booking_raises_404(self):
        with self.assertRaises(Http404):
            booking_cancel(booking_id=999999, user=self.passenger)


class BookingCancelEndpointTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista_bce", password="x")
        self.passenger = User.objects.create_user(username="passageiro_bce", password="x")
        self.other = User.objects.create_user(username="outro_bce", password="x")
        self.trip = make_trip(self.driver, seats_available=3)
        self.booking = Booking.objects.create(trip=self.trip, passenger=self.passenger)

    def _url(self, booking_id=None):
        return reverse("booking-cancel", args=[booking_id or self.booking.id])

    def test_cancel_requires_authentication(self):
        response = self.client.patch(self._url())
        self.assertEqual(response.status_code, 401)

    def test_passenger_cancel_returns_200(self):
        self.client.force_authenticate(self.passenger)
        response = self.client.patch(self._url())
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_cancelled"])

    def test_cancel_restores_seat(self):
        self.trip.seats_available = 2
        self.trip.save()

        self.client.force_authenticate(self.passenger)
        self.client.patch(self._url())

        self.trip.refresh_from_db()
        self.assertEqual(self.trip.seats_available, 3)

    def test_other_user_returns_403(self):
        self.client.force_authenticate(self.other)
        response = self.client.patch(self._url())
        self.assertEqual(response.status_code, 403)

    def test_already_cancelled_returns_400(self):
        self.booking.is_cancelled = True
        self.booking.save()
        self.client.force_authenticate(self.passenger)
        response = self.client.patch(self._url())
        self.assertEqual(response.status_code, 400)

    def test_nonexistent_booking_returns_404(self):
        self.client.force_authenticate(self.passenger)
        response = self.client.patch(self._url(booking_id=999999))
        self.assertEqual(response.status_code, 404)

    def test_departed_trip_returns_400(self):
        past_trip = make_trip(self.driver, departure_at=timezone.now() - timedelta(hours=1))
        past_booking = Booking.objects.create(trip=past_trip, passenger=self.passenger)
        self.client.force_authenticate(self.passenger)
        response = self.client.patch(self._url(booking_id=past_booking.id))
        self.assertEqual(response.status_code, 400)


# ──────────────────────────────────────────────
# Testes existentes (inalterados)
# ──────────────────────────────────────────────

class UserAgendaSelectorTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista3", password="x")
        self.me = User.objects.create_user(username="eu3", password="x")
        self.future = timezone.now() + timedelta(days=2)

    def _trip(self, driver, **overrides):
        return make_trip(driver, departure_at=self.future, **overrides)

    def test_includes_driver_and_passenger_roles(self):
        mine_as_driver = self._trip(self.me)
        others = self._trip(self.driver)
        Booking.objects.create(trip=others, passenger=self.me)
        results = list(user_agenda(user=self.me, when="upcoming"))
        roles = {t.id: t.role for t in results}
        self.assertEqual(roles[mine_as_driver.id], "driver")
        self.assertEqual(roles[others.id], "passenger")
        self.assertEqual(len(results), 2)

    def test_excludes_cancelled_bookings(self):
        others = self._trip(self.driver)
        booking = Booking.objects.create(trip=others, passenger=self.me)
        booking.is_cancelled = True
        booking.save()
        results = [t.id for t in user_agenda(user=self.me, when="upcoming")]
        self.assertNotIn(others.id, results)

    def test_no_duplicate_trips_when_multiple_bookings(self):
        mine = self._trip(self.me)
        other_passenger = User.objects.create_user(username="outro3", password="x")
        Booking.objects.create(trip=mine, passenger=other_passenger)
        results = [t.id for t in user_agenda(user=self.me, when="upcoming")]
        self.assertEqual(results.count(mine.id), 1)

    def test_split_upcoming_and_past(self):
        past = self._trip(self.me, departure_at=timezone.now() - timedelta(days=1))
        upcoming = self._trip(self.me)
        past_ids = [t.id for t in user_agenda(user=self.me, when="past")]
        upcoming_ids = [t.id for t in user_agenda(user=self.me, when="upcoming")]
        self.assertIn(past.id, past_ids)
        self.assertNotIn(upcoming.id, past_ids)
        self.assertIn(upcoming.id, upcoming_ids)
        self.assertNotIn(past.id, upcoming_ids)


class BookingSerializerTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista4", password="x")
        self.passenger = User.objects.create_user(
            username="passageiro4", password="x", first_name="Ana", last_name="Silva"
        )
        self.trip = make_trip(self.driver)

    def test_create_serializer_requires_trip(self):
        serializer = BookingCreateSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("trip", serializer.errors)

    def test_detail_serializer_shape(self):
        booking = Booking.objects.create(trip=self.trip, passenger=self.passenger)
        data = BookingDetailSerializer(booking).data
        self.assertEqual(data["trip"], self.trip.id)
        self.assertEqual(data["passenger_name"], "Ana Silva")
        self.assertFalse(data["is_cancelled"])

    def test_agenda_trip_serializer_includes_role(self):
        self.trip.role = "driver"
        data = AgendaTripSerializer(self.trip).data
        self.assertEqual(data["role"], "driver")
        self.assertIn("driver_name", data)
        self.assertNotIn("created_at", data)

    def test_agenda_filter_rejects_invalid_when(self):
        serializer = AgendaFilterSerializer(data={"when": "nope"})
        self.assertFalse(serializer.is_valid())

    def test_agenda_filter_defaults_to_upcoming(self):
        serializer = AgendaFilterSerializer(data={})
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["when"], "upcoming")


class BookingEndpointTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista5", password="x")
        self.passenger = User.objects.create_user(username="passageiro5", password="x")
        self.trip = make_trip(self.driver)

    def test_create_requires_authentication(self):
        response = self.client.post(
            reverse("booking-create"), {"trip": self.trip.id}, format="json"
        )
        self.assertEqual(response.status_code, 401)

    def test_create_returns_201_and_decrements_seats(self):
        self.client.force_authenticate(self.passenger)
        response = self.client.post(
            reverse("booking-create"), {"trip": self.trip.id}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.seats_available, 2)
        self.assertFalse(response.data["is_cancelled"])

    def test_create_own_trip_returns_400(self):
        self.client.force_authenticate(self.driver)
        response = self.client.post(
            reverse("booking-create"), {"trip": self.trip.id}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_create_nonexistent_trip_returns_404(self):
        self.client.force_authenticate(self.passenger)
        response = self.client.post(
            reverse("booking-create"), {"trip": 999999}, format="json"
        )
        self.assertEqual(response.status_code, 404)

    def test_agenda_requires_authentication(self):
        response = self.client.get(reverse("user-agenda"))
        self.assertEqual(response.status_code, 401)

    def test_agenda_returns_paginated(self):
        self.client.force_authenticate(self.passenger)
        Trip.objects.create(
            driver=self.passenger, origin="A", destination="B",
            departure_at=timezone.now() + timedelta(days=1),
            seats_available=3, price=Decimal("10.00"),
        )
        response = self.client.get(reverse("user-agenda"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["role"], "driver")

    def test_agenda_invalid_when_returns_400(self):
        self.client.force_authenticate(self.passenger)
        response = self.client.get(reverse("user-agenda"), {"when": "garbage"})
        self.assertEqual(response.status_code, 400)