from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from chat.models import Message
from trip.models import Booking, City, Location, ProfileDriver, Trip, TripStop
from trip.services.trip import create_booking_request


pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def driver_user():
    return get_user_model().objects.create_user(username="chat-driver", password="x")


@pytest.fixture
def passenger_user():
    return get_user_model().objects.create_user(username="chat-passenger", password="x")


@pytest.fixture
def stranger_user():
    return get_user_model().objects.create_user(username="chat-stranger", password="x")


@pytest.fixture
def driver_profile(driver_user):
    return ProfileDriver.objects.create(user=driver_user, is_verified=True)


@pytest.fixture
def trip(driver_profile):
    origin_city = City.objects.create(name="Teresina", state="PI", mapbox_place_id="chat.place.teresina")
    dest_city = City.objects.create(name="Fortaleza", state="CE", mapbox_place_id="chat.place.fortaleza")
    origin_location = Location.objects.create(
        name="Origem",
        formatted_address="Endereco origem",
        city=origin_city,
        latitude=-5.089,
        longitude=-42.801,
    )
    dest_location = Location.objects.create(
        name="Destino",
        formatted_address="Endereco destino",
        city=dest_city,
        latitude=-3.717,
        longitude=-38.543,
    )
    trip = Trip.objects.create(
        driver=driver_profile,
        origin_city=origin_city,
        destine_city=dest_city,
        available_spots=2,
        departure_time=timezone.now() + timedelta(days=1),
        status=Trip.Status.OPEN,
        line_trip={"type": "LineString", "coordinates": [[-42.801, -5.089], [-38.543, -3.717]]},
        total_distance_km=42.0,
        total_duration_min=60.0,
        route_legs=[{"distance_km": 42.0, "duration_min": 60.0}],
    )
    TripStop.objects.create(trip=trip, location=origin_location, order=0)
    TripStop.objects.create(trip=trip, location=dest_location, order=1)
    return trip


@pytest.fixture
def pending_booking(trip, passenger_user):
    stops = list(trip.stops.order_by("order"))
    return create_booking_request(
        passenger=passenger_user,
        trip_id=trip.id,
        pickup_stop_id=stops[0].id,
        dropoff_stop_id=stops[-1].id,
    )


@pytest.fixture
def confirmed_booking(pending_booking):
    pending_booking.status = Booking.Status.CONFIRMED
    pending_booking.confirmed_at = timezone.now()
    pending_booking.save(update_fields=["status", "confirmed_at"])
    return pending_booking


class TestReservationChatApi:
    def test_pending_booking_passenger_can_list_and_send_messages(
        self, api_client, passenger_user, pending_booking
    ):
        api_client.force_authenticate(user=passenger_user)

        send_response = api_client.post(
            f"/api/bookings/{pending_booking.id}/messages/",
            {"content": "  Oi motorista  "},
            format="json",
        )
        list_response = api_client.get(f"/api/bookings/{pending_booking.id}/messages/")

        assert send_response.status_code == 201
        assert send_response.data["content"] == "Oi motorista"
        assert send_response.data["sender_id"] == passenger_user.id
        assert list_response.status_code == 200
        assert len(list_response.data) == 1

    def test_pending_booking_driver_can_list_messages(
        self, api_client, driver_user, pending_booking
    ):
        Message.objects.create(booking=pending_booking, sender=pending_booking.passenger, content="Mensagem")
        api_client.force_authenticate(user=driver_user)

        response = api_client.get(f"/api/bookings/{pending_booking.id}/messages/")

        assert response.status_code == 200
        assert response.data[0]["content"] == "Mensagem"

    def test_booking_chat_denies_unrelated_user(
        self, api_client, stranger_user, pending_booking
    ):
        api_client.force_authenticate(user=stranger_user)

        response = api_client.get(f"/api/bookings/{pending_booking.id}/messages/")

        assert response.status_code == 403

    def test_booking_chat_becomes_unavailable_after_confirmation(
        self, api_client, passenger_user, confirmed_booking
    ):
        api_client.force_authenticate(user=passenger_user)

        response = api_client.get(f"/api/bookings/{confirmed_booking.id}/messages/")

        assert response.status_code == 400


class TestTripChatApi:
    def test_confirmed_passenger_can_list_and_send_trip_messages(
        self, api_client, passenger_user, trip, confirmed_booking
    ):
        api_client.force_authenticate(user=passenger_user)

        send_response = api_client.post(
            f"/api/trips/{trip.id}/messages/",
            {"content": "Partiu"},
            format="json",
        )
        list_response = api_client.get(f"/api/trips/{trip.id}/messages/")

        assert send_response.status_code == 201
        assert send_response.data["sender_id"] == passenger_user.id
        assert list_response.status_code == 200
        assert list_response.data[0]["content"] == "Partiu"

    def test_trip_chat_denies_passenger_with_only_pending_booking(
        self, api_client, passenger_user, trip, pending_booking
    ):
        api_client.force_authenticate(user=passenger_user)

        response = api_client.get(f"/api/trips/{trip.id}/messages/")

        assert response.status_code == 403

    def test_trip_chat_allows_driver(self, api_client, driver_user, trip):
        Message.objects.create(trip=trip, sender=driver_user, content="Boas-vindas")
        api_client.force_authenticate(user=driver_user)

        response = api_client.get(f"/api/trips/{trip.id}/messages/")

        assert response.status_code == 200
        assert response.data[0]["content"] == "Boas-vindas"

    def test_trip_chat_supports_incremental_polling_with_after(
        self, api_client, driver_user, trip
    ):
        first = Message.objects.create(trip=trip, sender=driver_user, content="Primeira")
        Message.objects.create(trip=trip, sender=driver_user, content="Segunda")
        api_client.force_authenticate(user=driver_user)

        response = api_client.get(f"/api/trips/{trip.id}/messages/?after={first.id}")

        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["content"] == "Segunda"

    def test_send_rejects_blank_content(self, api_client, driver_user, trip):
        api_client.force_authenticate(user=driver_user)

        response = api_client.post(
            f"/api/trips/{trip.id}/messages/",
            {"content": "   "},
            format="json",
        )

        assert response.status_code == 400
