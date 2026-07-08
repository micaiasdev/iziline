from datetime import timedelta

import pytest
from django.utils import timezone

from trip import selectors
from trip.services import trip as trip_services

pytestmark = pytest.mark.django_db


class TestGetAvailableSeats:
    def test_equals_available_spots_when_no_bookings_confirmed(self, open_trip):
        assert selectors.get_available_seats(open_trip) == 2

    def test_decreases_as_bookings_are_confirmed(self, passenger_user, driver_profile, open_trip):
        stops = list(open_trip.stops.order_by("order"))
        booking = trip_services.create_booking_request(
            passenger=passenger_user, trip_id=open_trip.id,
            pickup_stop_id=stops[0].id, dropoff_stop_id=stops[-1].id,
        )
        trip_services.accept_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)

        open_trip.refresh_from_db()
        assert selectors.get_available_seats(open_trip) == 1

    def test_pending_bookings_do_not_count(self, passenger_user, open_trip):
        stops = list(open_trip.stops.order_by("order"))
        trip_services.create_booking_request(
            passenger=passenger_user, trip_id=open_trip.id,
            pickup_stop_id=stops[0].id, dropoff_stop_id=stops[-1].id,
        )
        # não aceitou — continua PENDING
        assert selectors.get_available_seats(open_trip) == 2


class TestGetTripsOpened:
    def test_finds_trip_matching_origin_and_destination(self, open_trip, city_origin, city_destination):
        results = list(selectors.get_trips_opened(
            origin_city_id=city_origin.id, destine_city_id=city_destination.id,
        ))
        assert open_trip in results

    def test_does_not_find_trip_with_swapped_cities(self, open_trip, city_origin, city_destination):
        results = list(selectors.get_trips_opened(
            origin_city_id=city_destination.id, destine_city_id=city_origin.id,
        ))
        assert open_trip not in results

    def test_respects_date_range(self, open_trip, city_origin, city_destination):
        far_future_start = timezone.now() + timedelta(days=30)
        far_future_end = timezone.now() + timedelta(days=60)

        results = list(selectors.get_trips_opened(
            origin_city_id=city_origin.id, destine_city_id=city_destination.id,
            date_start=far_future_start, date_end=far_future_end,
        ))
        # open_trip parte amanhã (fixture future_departure_time), fora dessa janela
        assert open_trip not in results


class TestGetFareSplit:
    def test_returns_empty_list_when_no_confirmed_bookings(self, open_trip):
        assert selectors.get_fare_split(open_trip) == []

    def test_splits_cost_for_confirmed_passengers(self, django_user_model, driver_profile, open_trip):
        stops = list(open_trip.stops.order_by("order"))
        passenger_one = django_user_model.objects.create_user(username="split1", password="x")
        passenger_two = django_user_model.objects.create_user(username="split2", password="x")

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

        open_trip.refresh_from_db()
        split = selectors.get_fare_split(open_trip)

        assert len(split) == 2
        assert {item["booking_id"] for item in split} == {booking_one.id, booking_two.id}
        assert {str(item["amount"]) for item in split} == {"21.00"}

    def test_raises_when_route_legs_are_inconsistent(self, passenger_user, driver_profile, open_trip):
        stops = list(open_trip.stops.order_by("order"))
        booking = trip_services.create_booking_request(
            passenger=passenger_user,
            trip_id=open_trip.id,
            pickup_stop_id=stops[0].id,
            dropoff_stop_id=stops[-1].id,
        )
        trip_services.accept_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)

        open_trip.refresh_from_db()
        open_trip.route_legs = []
        open_trip.save(update_fields=["route_legs"])

        with pytest.raises(ValueError):
            selectors.get_fare_split(open_trip)
