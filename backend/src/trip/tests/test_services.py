from datetime import timedelta

import pytest
from django.utils import timezone

from django.core.exceptions import PermissionDenied

from trip.models import Trip, Booking, TripCost, DriverLocation, ProfileDriver
from trip.services import trip as trip_services
from trip.services.trip import TripServiceError

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# create_trip
# ---------------------------------------------------------------------------

class TestCreateTrip:
    def test_creates_trip_with_two_stops_and_calculates_route(
        self, driver_profile, city_origin, city_destination,
        origin_location, destination_location, future_departure_time, settings,
    ):
        settings.PRICE_PER_KM = "1.50"
        trip = trip_services.create_trip(
            driver=driver_profile,
            origin_city_id=city_origin.id,
            destine_city_id=city_destination.id,
            departure_time=future_departure_time,
            available_spots=3,
            origin_location_id=origin_location.id,
            destination_location_id=destination_location.id,
        )

        assert trip.status == Trip.Status.OPEN
        assert trip.stops.count() == 2
        assert list(trip.stops.order_by("order").values_list("order", flat=True)) == [0, 1]
        # vem do FakeRoutingClient (conftest.py), não do Mapbox real
        assert trip.total_distance_km == 42.0
        assert trip.line_trip is not None
        assert TripCost.objects.filter(trip=trip).exists()
        assert trip.cost.price_per_km == pytest.approx(1.5)
        assert trip.cost.distance_km_snapshot == 42.0
        assert trip.cost.total_cost == pytest.approx(63.0)

    def test_includes_intermediate_stops_in_order(
        self, driver_profile, city_origin, city_destination,
        origin_location, destination_location, intermediate_location, future_departure_time,
    ):
        trip = trip_services.create_trip(
            driver=driver_profile,
            origin_city_id=city_origin.id,
            destine_city_id=city_destination.id,
            departure_time=future_departure_time,
            available_spots=3,
            origin_location_id=origin_location.id,
            destination_location_id=destination_location.id,
            intermediate_location_ids=[intermediate_location.id],
        )

        assert trip.stops.count() == 3
        ordered_locations = list(trip.stops.order_by("order").values_list("location_id", flat=True))
        assert ordered_locations == [origin_location.id, intermediate_location.id, destination_location.id]
        assert len(trip.route_legs) == 2

    def test_rejects_departure_time_in_the_past(
        self, driver_profile, city_origin, city_destination,
        origin_location, destination_location,
    ):
        past = timezone.now() - timedelta(days=1)

        with pytest.raises(TripServiceError):
            trip_services.create_trip(
                driver=driver_profile,
                origin_city_id=city_origin.id,
                destine_city_id=city_destination.id,
                departure_time=past,
                available_spots=3,
                origin_location_id=origin_location.id,
                destination_location_id=destination_location.id,
            )

    def test_rejects_zero_available_spots(
        self, driver_profile, city_origin, city_destination,
        origin_location, destination_location, future_departure_time,
    ):
        with pytest.raises(TripServiceError):
            trip_services.create_trip(
                driver=driver_profile,
                origin_city_id=city_origin.id,
                destine_city_id=city_destination.id,
                departure_time=future_departure_time,
                available_spots=0,
                origin_location_id=origin_location.id,
                destination_location_id=destination_location.id,
            )

    def test_rejects_location_that_does_not_belong_to_informed_city(
        self, driver_profile, city_origin, city_destination,
        origin_location, destination_location, future_departure_time,
    ):
        with pytest.raises(TripServiceError):
            trip_services.create_trip(
                driver=driver_profile,
                origin_city_id=city_destination.id,  # errado de propósito
                destine_city_id=city_destination.id,
                departure_time=future_departure_time,
                available_spots=3,
                origin_location_id=origin_location.id,  # pertence à city_origin
                destination_location_id=destination_location.id,
            )


# ---------------------------------------------------------------------------
# create_booking_request
# ---------------------------------------------------------------------------

class TestCreateBookingRequest:
    def _stops(self, trip):
        stops = list(trip.stops.order_by("order"))
        return stops[0], stops[-1]

    def test_creates_pending_booking(self, passenger_user, open_trip):
        pickup, dropoff = self._stops(open_trip)

        booking = trip_services.create_booking_request(
            passenger=passenger_user,
            trip_id=open_trip.id,
            pickup_stop_id=pickup.id,
            dropoff_stop_id=dropoff.id,
        )

        assert booking.status == Booking.Status.PENDING

    def test_rejects_pickup_after_dropoff(self, passenger_user, open_trip):
        pickup, dropoff = self._stops(open_trip)

        with pytest.raises(TripServiceError):
            trip_services.create_booking_request(
                passenger=passenger_user,
                trip_id=open_trip.id,
                pickup_stop_id=dropoff.id,  # invertido de propósito
                dropoff_stop_id=pickup.id,
            )

    def test_rejects_when_trip_is_not_open(self, passenger_user, open_trip):
        pickup, dropoff = self._stops(open_trip)
        open_trip.status = Trip.Status.CANCELLED
        open_trip.save(update_fields=["status"])

        with pytest.raises(TripServiceError):
            trip_services.create_booking_request(
                passenger=passenger_user,
                trip_id=open_trip.id,
                pickup_stop_id=pickup.id,
                dropoff_stop_id=dropoff.id,
            )

    def test_rejects_when_no_seats_available(self, passenger_user, django_user_model, open_trip):
        pickup, dropoff = self._stops(open_trip)
        # open_trip tem available_spots=2 (ver fixture) — esgota as duas
        for i in range(2):
            other_passenger = django_user_model.objects.create_user(username=f"p{i}", password="x")
            booking = trip_services.create_booking_request(
                passenger=other_passenger, trip_id=open_trip.id,
                pickup_stop_id=pickup.id, dropoff_stop_id=dropoff.id,
            )
            trip_services.accept_booking_request(
                booking_id=booking.id, driver_profile_id=open_trip.driver_id
            )

        with pytest.raises(TripServiceError):
            trip_services.create_booking_request(
                passenger=passenger_user, trip_id=open_trip.id,
                pickup_stop_id=pickup.id, dropoff_stop_id=dropoff.id,
            )


# ---------------------------------------------------------------------------
# accept_booking_request / reject_booking_request
# ---------------------------------------------------------------------------

class TestAcceptRejectBookingRequest:
    def _pending_booking(self, passenger, trip):
        stops = list(trip.stops.order_by("order"))
        return trip_services.create_booking_request(
            passenger=passenger, trip_id=trip.id,
            pickup_stop_id=stops[0].id, dropoff_stop_id=stops[-1].id,
        )

    def test_accept_confirms_booking_and_recalculates_route(self, passenger_user, driver_profile, open_trip):
        booking = self._pending_booking(passenger_user, open_trip)

        confirmed = trip_services.accept_booking_request(
            booking_id=booking.id, driver_profile_id=driver_profile.id
        )

        assert confirmed.status == Booking.Status.CONFIRMED
        assert confirmed.confirmed_at is not None

    def test_trip_becomes_full_when_last_seat_is_confirmed(
        self, passenger_user, driver_profile, django_user_model, open_trip
    ):
        # available_spots=2 na fixture — confirma as duas
        stops = list(open_trip.stops.order_by("order"))
        for i, user in enumerate([passenger_user, django_user_model.objects.create_user(username="p2", password="x")]):
            booking = trip_services.create_booking_request(
                passenger=user, trip_id=open_trip.id,
                pickup_stop_id=stops[0].id, dropoff_stop_id=stops[-1].id,
            )
            trip_services.accept_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)

        open_trip.refresh_from_db()
        assert open_trip.status == Trip.Status.FULL

    def test_cannot_accept_twice(self, passenger_user, driver_profile, open_trip):
        booking = self._pending_booking(passenger_user, open_trip)
        trip_services.accept_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)

        with pytest.raises(TripServiceError):
            trip_services.accept_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)

    def test_cannot_accept_after_trip_started(self, passenger_user, driver_profile, open_trip):
        booking = self._pending_booking(passenger_user, open_trip)
        open_trip.status = Trip.Status.IN_PROGRESS
        open_trip.save(update_fields=["status"])

        with pytest.raises(TripServiceError):
            trip_services.accept_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)

    def test_reject_marks_booking_as_rejected(self, passenger_user, driver_profile, open_trip):
        booking = self._pending_booking(passenger_user, open_trip)

        rejected = trip_services.reject_booking_request(
            booking_id=booking.id, driver_profile_id=driver_profile.id
        )

        assert rejected.status == Booking.Status.REJECTED

    def test_cannot_reject_after_trip_started(self, passenger_user, driver_profile, open_trip):
        booking = self._pending_booking(passenger_user, open_trip)
        open_trip.status = Trip.Status.IN_PROGRESS
        open_trip.save(update_fields=["status"])

        with pytest.raises(TripServiceError):
            trip_services.reject_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)

    def test_trip_cost_does_not_change_after_accept_booking(
        self, passenger_user, driver_profile, open_trip
    ):
        booking = self._pending_booking(passenger_user, open_trip)
        original_total_cost = open_trip.cost.total_cost
        original_cost_id = open_trip.cost.id

        trip_services.accept_booking_request(
            booking_id=booking.id, driver_profile_id=driver_profile.id
        )

        open_trip.refresh_from_db()
        assert open_trip.cost.id == original_cost_id
        assert open_trip.cost.total_cost == original_total_cost


# ---------------------------------------------------------------------------
# cancel_booking_request
# ---------------------------------------------------------------------------

class TestCancelBookingRequest:
    def _pending_booking(self, passenger, trip):
        stops = list(trip.stops.order_by("order"))
        return trip_services.create_booking_request(
            passenger=passenger, trip_id=trip.id,
            pickup_stop_id=stops[0].id, dropoff_stop_id=stops[-1].id,
        )

    def test_cancels_pending_booking(self, passenger_user, open_trip):
        booking = self._pending_booking(passenger_user, open_trip)

        cancelled = trip_services.cancel_booking_request(
            booking_id=booking.id, passenger=passenger_user
        )

        assert cancelled.status == Booking.Status.CANCELLED

    def test_cannot_cancel_after_confirmed(self, passenger_user, driver_profile, open_trip):
        booking = self._pending_booking(passenger_user, open_trip)
        trip_services.accept_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)

        with pytest.raises(TripServiceError):
            trip_services.cancel_booking_request(booking_id=booking.id, passenger=passenger_user)


class TestTripCost:
    def test_create_trip_cost_rejects_duplicate_cost(self, open_trip):
        with pytest.raises(TripServiceError):
            trip_services.create_trip_cost(open_trip)

    def test_trip_cost_does_not_change_after_recalculate_route(
        self, driver_profile, open_trip
    ):
        original_total_cost = open_trip.cost.total_cost
        original_cost_id = open_trip.cost.id

        trip_services.new_map_order(trip_id=open_trip.id, driver_profile_id=driver_profile.id)

        open_trip.refresh_from_db()
        assert open_trip.cost.id == original_cost_id
        assert open_trip.cost.total_cost == original_total_cost


class TestTripLifecycle:
    def test_start_trip_sets_in_progress_and_started_at(
        self, passenger_user, driver_profile, open_trip
    ):
        stops = list(open_trip.stops.order_by("order"))
        booking = trip_services.create_booking_request(
            passenger=passenger_user,
            trip_id=open_trip.id,
            pickup_stop_id=stops[0].id,
            dropoff_stop_id=stops[-1].id,
        )
        trip_services.accept_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)
        open_trip.departure_time = timezone.now() + timedelta(minutes=30)
        open_trip.save(update_fields=["departure_time"])

        started = trip_services.start_trip(trip_id=open_trip.id, driver_profile_id=driver_profile.id)

        assert started.status == Trip.Status.IN_PROGRESS
        assert started.started_at is not None

    def test_start_trip_accepts_full_trip(
        self, passenger_user, driver_profile, django_user_model, open_trip
    ):
        stops = list(open_trip.stops.order_by("order"))
        for user in [passenger_user, django_user_model.objects.create_user(username="p3", password="x")]:
            booking = trip_services.create_booking_request(
                passenger=user,
                trip_id=open_trip.id,
                pickup_stop_id=stops[0].id,
                dropoff_stop_id=stops[-1].id,
            )
            trip_services.accept_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)
        open_trip.refresh_from_db()
        open_trip.departure_time = timezone.now()
        open_trip.save(update_fields=["departure_time"])

        started = trip_services.start_trip(trip_id=open_trip.id, driver_profile_id=driver_profile.id)

        assert started.status == Trip.Status.IN_PROGRESS

    def test_start_trip_rejects_without_confirmed_booking(self, driver_profile, open_trip):
        open_trip.departure_time = timezone.now()
        open_trip.save(update_fields=["departure_time"])

        with pytest.raises(TripServiceError):
            trip_services.start_trip(trip_id=open_trip.id, driver_profile_id=driver_profile.id)

    def test_start_trip_rejects_outside_time_window(
        self, passenger_user, driver_profile, open_trip
    ):
        stops = list(open_trip.stops.order_by("order"))
        booking = trip_services.create_booking_request(
            passenger=passenger_user,
            trip_id=open_trip.id,
            pickup_stop_id=stops[0].id,
            dropoff_stop_id=stops[-1].id,
        )
        trip_services.accept_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)

        with pytest.raises(TripServiceError):
            trip_services.start_trip(trip_id=open_trip.id, driver_profile_id=driver_profile.id)

    def test_finish_trip_sets_finished_and_finished_at(
        self, passenger_user, driver_profile, open_trip
    ):
        stops = list(open_trip.stops.order_by("order"))
        booking = trip_services.create_booking_request(
            passenger=passenger_user,
            trip_id=open_trip.id,
            pickup_stop_id=stops[0].id,
            dropoff_stop_id=stops[-1].id,
        )
        trip_services.accept_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)
        open_trip.departure_time = timezone.now()
        open_trip.save(update_fields=["departure_time"])
        trip_services.start_trip(trip_id=open_trip.id, driver_profile_id=driver_profile.id)

        finished = trip_services.finish_trip(trip_id=open_trip.id, driver_profile_id=driver_profile.id)

        assert finished.status == Trip.Status.FINISHED
        assert finished.finished_at is not None

    def test_finish_trip_rejects_when_not_in_progress(self, driver_profile, open_trip):
        with pytest.raises(TripServiceError):
            trip_services.finish_trip(trip_id=open_trip.id, driver_profile_id=driver_profile.id)

    def test_reorder_rejects_after_trip_started(self, driver_profile, open_trip):
        stops = list(open_trip.stops.order_by("order"))
        open_trip.status = Trip.Status.IN_PROGRESS
        open_trip.save(update_fields=["status"])

        with pytest.raises(TripServiceError):
            trip_services.update_order(
                trip_id=open_trip.id,
                driver_profile_id=driver_profile.id,
                stop_orders=[(stops[0].id, 0), (stops[-1].id, 1)],
            )


class TestDriverLocation:
    def _start_trip(self, *, passenger_user, driver_profile, trip):
        stops = list(trip.stops.order_by("order"))
        booking = trip_services.create_booking_request(
            passenger=passenger_user,
            trip_id=trip.id,
            pickup_stop_id=stops[0].id,
            dropoff_stop_id=stops[-1].id,
        )
        trip_services.accept_booking_request(booking_id=booking.id, driver_profile_id=driver_profile.id)
        trip.departure_time = timezone.now()
        trip.save(update_fields=["departure_time"])
        trip_services.start_trip(trip_id=trip.id, driver_profile_id=driver_profile.id)

    def test_creates_driver_location(self, passenger_user, driver_profile, open_trip):
        self._start_trip(passenger_user=passenger_user, driver_profile=driver_profile, trip=open_trip)

        location = trip_services.upsert_driver_location(
            trip_id=open_trip.id,
            driver_profile_id=driver_profile.id,
            latitude=-5.089,
            longitude=-42.801,
        )

        assert location.trip_id == open_trip.id
        assert location.latitude == -5.089
        assert location.longitude == -42.801
        assert DriverLocation.objects.filter(trip=open_trip).exists()

    def test_updates_existing_driver_location(self, passenger_user, driver_profile, open_trip):
        self._start_trip(passenger_user=passenger_user, driver_profile=driver_profile, trip=open_trip)
        first = trip_services.upsert_driver_location(
            trip_id=open_trip.id,
            driver_profile_id=driver_profile.id,
            latitude=-5.089,
            longitude=-42.801,
        )

        updated = trip_services.upsert_driver_location(
            trip_id=open_trip.id,
            driver_profile_id=driver_profile.id,
            latitude=-5.1,
            longitude=-42.7,
        )

        assert updated.id == first.id
        assert updated.latitude == -5.1
        assert updated.longitude == -42.7

    def test_rejects_location_update_when_trip_not_in_progress(self, driver_profile, open_trip):
        with pytest.raises(TripServiceError):
            trip_services.upsert_driver_location(
                trip_id=open_trip.id,
                driver_profile_id=driver_profile.id,
                latitude=-5.089,
                longitude=-42.801,
            )

    def test_rejects_location_update_from_non_owner(
        self, passenger_user, driver_profile, open_trip, driver_user
    ):
        self._start_trip(passenger_user=passenger_user, driver_profile=driver_profile, trip=open_trip)
        other_driver_user = driver_user.__class__.objects.create_user(username="motorista2", password="x")
        other_driver_profile = ProfileDriver.objects.create(user=other_driver_user)

        with pytest.raises(PermissionDenied):
            trip_services.upsert_driver_location(
                trip_id=open_trip.id,
                driver_profile_id=other_driver_profile.id,
                latitude=-5.089,
                longitude=-42.801,
            )
