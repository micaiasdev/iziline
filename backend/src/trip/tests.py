from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.http import Http404
from django.urls import reverse
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase

from trip.models import Trip
from trip.selectors import trip_get, trip_list
from trip.serializers import TripCreateSerializer, TripDetailSerializer, TripListSerializer
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


class TripSelectorTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista", password="x")
        self.future = timezone.now() + timedelta(days=2)

    def _make_trip(self, **overrides):
        defaults = dict(
            driver=self.driver,
            origin="Teresina",
            destination="Parnaiba",
            departure_at=self.future,
            seats_available=3,
            price=Decimal("10.00"),
            is_cancelled=False,
        )
        defaults.update(overrides)
        return Trip.objects.create(**defaults)

    def test_list_returns_only_bookable_trips(self):
        valid = self._make_trip()
        self._make_trip(seats_available=0)  # lotada
        self._make_trip(is_cancelled=True)  # cancelada
        self._make_trip(departure_at=timezone.now() - timedelta(days=1))  # passada
        results = list(trip_list())
        self.assertEqual(results, [valid])

    def test_list_filters_by_origin_destination_case_insensitive(self):
        match = self._make_trip(origin="Teresina", destination="Picos")
        self._make_trip(origin="Floriano", destination="Picos")
        results = list(trip_list(origin="teres", destination="pic"))
        self.assertEqual(results, [match])

    def test_list_filters_by_date(self):
        target_day = (timezone.now() + timedelta(days=5)).date()
        match = self._make_trip(departure_at=timezone.now() + timedelta(days=5))
        self._make_trip(departure_at=timezone.now() + timedelta(days=6))
        results = list(trip_list(date=target_day.isoformat()))
        self.assertEqual(results, [match])

    def test_get_returns_trip_by_id(self):
        trip = self._make_trip()
        self.assertEqual(trip_get(trip_id=trip.id), trip)

    def test_get_raises_404_when_missing(self):
        with self.assertRaises(Http404):
            trip_get(trip_id=999999)


class TripSerializerTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(
            username="motorista", password="x", first_name="Ana", last_name="Silva"
        )
        self.trip = Trip.objects.create(
            driver=self.driver,
            origin="Teresina",
            destination="Parnaiba",
            departure_at=timezone.now() + timedelta(days=1),
            seats_available=3,
            price=Decimal("10.00"),
        )

    def test_create_serializer_rejects_missing_fields(self):
        serializer = TripCreateSerializer(data={"origin": "Teresina"})
        self.assertFalse(serializer.is_valid())
        self.assertIn("destination", serializer.errors)

    def test_create_serializer_excludes_price_and_driver(self):
        serializer = TripCreateSerializer()
        self.assertNotIn("price", serializer.fields)
        self.assertNotIn("driver", serializer.fields)

    def test_detail_serializer_includes_driver_name(self):
        data = TripDetailSerializer(self.trip).data
        self.assertEqual(data["driver_name"], "Ana Silva")
        self.assertEqual(data["seats_available"], 3)
        self.assertEqual(data["price"], "10.00")

    def test_detail_driver_name_falls_back_to_username(self):
        self.driver.first_name = ""
        self.driver.last_name = ""
        self.driver.save()
        data = TripDetailSerializer(self.trip).data
        self.assertEqual(data["driver_name"], "motorista")

    def test_list_serializer_includes_core_fields(self):
        data = TripListSerializer(self.trip).data
        for field in ["id", "driver_name", "origin", "destination", "departure_at", "seats_available", "price"]:
            self.assertIn(field, data)

    def test_list_serializer_excludes_detail_only_fields(self):
        data = TripListSerializer(self.trip).data
        self.assertNotIn("is_cancelled", data)
        self.assertNotIn("created_at", data)

    def test_create_serializer_rejects_zero_seats(self):
        serializer = TripCreateSerializer(data={
            "origin": "Teresina",
            "destination": "Parnaiba",
            "departure_at": timezone.now() + timedelta(days=1),
            "seats_available": 0,
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("seats_available", serializer.errors)


class TripEndpointTests(APITestCase):
    def setUp(self):
        self.driver = User.objects.create_user(username="motorista", password="x")
        self.future = timezone.now() + timedelta(days=1)

    # --- POST /api/trips/ ---
    def test_create_requires_authentication(self):
        url = reverse("trip-list-create")
        response = self.client.post(url, {
            "origin": "Teresina",
            "destination": "Parnaiba",
            "departure_at": self.future.isoformat(),
            "seats_available": 2,
        }, format="json")
        self.assertEqual(response.status_code, 401)

    def test_create_returns_201_with_calculated_price(self):
        self.client.force_authenticate(self.driver)
        url = reverse("trip-list-create")
        response = self.client.post(url, {
            "origin": "Teresina",
            "destination": "Parnaiba",
            "departure_at": self.future.isoformat(),
            "seats_available": 2,
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["price"], "33.90")
        self.assertEqual(response.data["driver_name"], "motorista")

    def test_create_rejects_past_departure_with_400(self):
        self.client.force_authenticate(self.driver)
        url = reverse("trip-list-create")
        response = self.client.post(url, {
            "origin": "Teresina",
            "destination": "Parnaiba",
            "departure_at": (timezone.now() - timedelta(hours=1)).isoformat(),
            "seats_available": 2,
        }, format="json")
        self.assertEqual(response.status_code, 400)

    # --- GET /api/trips/ ---
    def test_list_requires_authentication(self):
        url = reverse("trip-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_list_returns_paginated_bookable_trips(self):
        self.client.force_authenticate(self.driver)
        Trip.objects.create(
            driver=self.driver, origin="Teresina", destination="Parnaiba",
            departure_at=self.future, seats_available=3, price=Decimal("10.00"),
        )
        url = reverse("trip-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 1)

    def test_list_filters_by_origin(self):
        self.client.force_authenticate(self.driver)
        Trip.objects.create(
            driver=self.driver, origin="Teresina", destination="Picos",
            departure_at=self.future, seats_available=3, price=Decimal("10.00"),
        )
        Trip.objects.create(
            driver=self.driver, origin="Floriano", destination="Picos",
            departure_at=self.future, seats_available=3, price=Decimal("10.00"),
        )
        url = reverse("trip-list-create")
        response = self.client.get(url, {"origin": "teres"})
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["origin"], "Teresina")

    # --- GET /api/trips/{id}/ ---
    def test_detail_returns_200(self):
        self.client.force_authenticate(self.driver)
        trip = Trip.objects.create(
            driver=self.driver, origin="Teresina", destination="Parnaiba",
            departure_at=self.future, seats_available=3, price=Decimal("10.00"),
        )
        url = reverse("trip-detail", args=[trip.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], trip.id)

    def test_detail_returns_404_when_missing(self):
        self.client.force_authenticate(self.driver)
        url = reverse("trip-detail", args=[999999])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)
