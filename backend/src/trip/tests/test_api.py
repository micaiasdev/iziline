import pytest
from rest_framework.test import APIClient

from trip.services import trip as trip_services


pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


class TestTripCostApi:
    def test_returns_trip_cost_snapshot(self, api_client, open_trip):
        response = api_client.get(f"/api/trips/{open_trip.id}/cost/")

        assert response.status_code == 200
        assert response.data["trip_id"] == open_trip.id
        assert response.data["distance_km_snapshot"] == 42.0
        assert response.data["total_cost"] == "42.00"

    def test_returns_404_when_trip_does_not_exist(self, api_client):
        response = api_client.get("/api/trips/999999/cost/")

        assert response.status_code == 404


class TestTripFareSplitApi:
    def test_returns_empty_split_when_no_confirmed_bookings(self, api_client, open_trip):
        response = api_client.get(f"/api/trips/{open_trip.id}/fare-split/")

        assert response.status_code == 200
        assert response.data["trip_id"] == open_trip.id
        assert response.data["total_cost"] == "42.00"
        assert response.data["split"] == []

    def test_returns_current_split_for_confirmed_passengers(
        self, api_client, django_user_model, driver_profile, open_trip
    ):
        stops = list(open_trip.stops.order_by("order"))
        passenger_one = django_user_model.objects.create_user(username="api-split-1", password="x")
        passenger_two = django_user_model.objects.create_user(username="api-split-2", password="x")

        booking_one = trip_services.create_booking_request(
            passenger=passenger_one,
            trip_id=open_trip.id,
            pickup_stop_id=stops[0].id,
            dropoff_stop_id=stops[-1].id,
        )
        booking_two = trip_services.create_booking_request(
            passenger=passenger_two,
            trip_id=open_trip.id,
            pickup_stop_id=stops[0].id,
            dropoff_stop_id=stops[-1].id,
        )

        trip_services.accept_booking_request(booking_id=booking_one.id, driver_profile_id=driver_profile.id)
        trip_services.accept_booking_request(booking_id=booking_two.id, driver_profile_id=driver_profile.id)

        response = api_client.get(f"/api/trips/{open_trip.id}/fare-split/")

        assert response.status_code == 200
        assert response.data["trip_id"] == open_trip.id
        assert response.data["total_cost"] == "42.00"
        assert len(response.data["split"]) == 2
        assert {item["booking_id"] for item in response.data["split"]} == {
            booking_one.id,
            booking_two.id,
        }
        assert {item["amount"] for item in response.data["split"]} == {"21.00"}
