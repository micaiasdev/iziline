from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase

from trip.models import Trip
from trip.services import calculate_fare, trip_create

User = get_user_model()


class CalculateFareTests(APITestCase):
    def test_known_route_divides_cost_by_passengers_plus_driver(self):
        # Teresina -> Parnaiba = 339 km; custo = 339 * 0.30 = 101.70
        # 2 vagas + motorista = 3 pessoas; 101.70 / 3 = 33.90
        fare = calculate_fare(origin="Teresina", destination="Parnaiba", seats_available=2)
        self.assertEqual(fare, Decimal("33.90"))

    def test_is_case_and_accent_insensitive(self):
        fare_plain = calculate_fare(origin="teresina", destination="parnaiba", seats_available=2)
        fare_accent = calculate_fare(origin="TERESINA", destination="Parnaíba", seats_available=2)
        self.assertEqual(fare_plain, fare_accent)

    def test_unknown_route_uses_default_distance(self):
        # Distancia default = 100 km; custo = 30.00; 1 vaga + motorista = 2; 30.00 / 2 = 15.00
        fare = calculate_fare(origin="Cidade X", destination="Cidade Y", seats_available=1)
        self.assertEqual(fare, Decimal("15.00"))

    def test_result_has_two_decimal_places(self):
        fare = calculate_fare(origin="Teresina", destination="Picos", seats_available=2)
        self.assertEqual(fare.as_tuple().exponent, -2)

    def test_rejects_invalid_seats(self):
        with self.assertRaises(ValidationError):
            calculate_fare(origin="Teresina", destination="Parnaiba", seats_available=0)


class TripCreateServiceTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista", password="x")

    def test_creates_trip_with_calculated_price(self):
        departure = timezone.now() + timedelta(days=1)
        trip = trip_create(
            driver=self.driver,
            origin="Teresina",
            destination="Parnaiba",
            departure_at=departure,
            seats_available=2,
        )
        self.assertIsInstance(trip, Trip)
        self.assertEqual(trip.driver, self.driver)
        self.assertEqual(trip.price, Decimal("33.90"))
        self.assertEqual(Trip.objects.count(), 1)

    def test_rejects_past_departure(self):
        past = timezone.now() - timedelta(hours=1)
        with self.assertRaises(ValidationError):
            trip_create(
                driver=self.driver,
                origin="Teresina",
                destination="Parnaiba",
                departure_at=past,
                seats_available=2,
            )
        self.assertEqual(Trip.objects.count(), 0)

    def test_rejects_zero_seats(self):
        departure = timezone.now() + timedelta(days=1)
        with self.assertRaises(ValidationError):
            trip_create(
                driver=self.driver,
                origin="Teresina",
                destination="Parnaiba",
                departure_at=departure,
                seats_available=0,
            )
        self.assertEqual(Trip.objects.count(), 0)
