"""
api.py

Views no padrão HackSoft styleguide: uma APIView por ação, com
InputSerializer / OutputSerializer / QueryParamsSerializer aninhados
dentro da própria classe. Nenhuma regra de negócio aqui — só shape de
entrada/saída e a chamada pro service/selector correto.
"""

from django.core.exceptions import PermissionDenied
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import selectors
from .models import ProfileDriver, Trip, TripStop, Booking, Location, City, TripCost
from .services import (
  create_trip,
  create_booking_request,
  cancel_booking_request,
  accept_booking_request,
  reject_booking_request,
  start_trip,
  finish_trip,
  update_order,
  new_map_order,
)


def _get_driver_profile(request) -> ProfileDriver:
  try:
    return request.user.driver_profile
  except ProfileDriver.DoesNotExist:
    raise PermissionDenied("Você precisa ter um perfil de motorista pra fazer isso.")


# ---------------------------------------------------------------------------
# Serializers de saída reutilizados em várias views
# ---------------------------------------------------------------------------

class CityOutputSerializer(serializers.ModelSerializer):
  class Meta:
    model = City
    fields = ["id", "name", "state"]


class LocationOutputSerializer(serializers.ModelSerializer):
  city = CityOutputSerializer(read_only=True)

  class Meta:
    model = Location
    fields = ["id", "name", "formatted_address", "latitude", "longitude", "city"]


class TripStopOutputSerializer(serializers.ModelSerializer):
  location = LocationOutputSerializer(read_only=True)

  class Meta:
    model = TripStop
    fields = ["id", "order", "location"]


class TripDetailOutputSerializer(serializers.ModelSerializer):
  origin_city = CityOutputSerializer(read_only=True)
  destine_city = CityOutputSerializer(read_only=True)
  stops = TripStopOutputSerializer(many=True, read_only=True)
  available_seats = serializers.SerializerMethodField()

  class Meta:
    model = Trip
    fields = [
      "id", "driver", "origin_city", "destine_city",
      "departure_time", "available_spots", "available_seats",
      "status", "line_trip", "total_distance_km", "total_duration_min",
      "stops", "started_at", "finished_at", "created_at", "updated_at",
    ]

  def get_available_seats(self, trip: Trip) -> int:
    return selectors.get_available_seats(trip)


class TripListOutputSerializer(serializers.ModelSerializer):
  origin_city = CityOutputSerializer(read_only=True)
  destine_city = CityOutputSerializer(read_only=True)

  class Meta:
    model = Trip
    fields = [
      "id", "origin_city", "destine_city",
      "departure_time", "available_spots", "status",
      "total_distance_km", "total_duration_min",
    ]


class BookingOutputSerializer(serializers.ModelSerializer):
  pickup_stop = TripStopOutputSerializer(read_only=True)
  dropoff_stop = TripStopOutputSerializer(read_only=True)

  class Meta:
    model = Booking
    fields = [
      "id", "trip", "passenger", "pickup_stop", "dropoff_stop",
      "status", "created_at", "confirmed_at",
    ]


class TripRouteOutputSerializer(serializers.ModelSerializer):
  class Meta:
    model = Trip
    fields = [
      "id", "line_trip", "total_distance_km", "total_duration_min",
      "status", "updated_at",
    ]


class TripCostOutputSerializer(serializers.ModelSerializer):
  trip_id = serializers.IntegerField(read_only=True)

  class Meta:
    model = TripCost
    fields = [
      "trip_id",
      "price_per_km",
      "distance_km_snapshot",
      "total_cost",
      "created_at",
    ]


class FareSplitItemOutputSerializer(serializers.Serializer):
  booking_id = serializers.IntegerField()
  passenger_id = serializers.IntegerField()
  amount = serializers.DecimalField(max_digits=10, decimal_places=2)


class TripFareSplitOutputSerializer(serializers.Serializer):
  trip_id = serializers.IntegerField()
  total_cost = serializers.DecimalField(max_digits=10, decimal_places=2)
  split = FareSplitItemOutputSerializer(many=True)
 
# ---------------------------------------------------------------------------
# Busca de viagens (passageiro)
# ---------------------------------------------------------------------------

class TripSearchApi(APIView):
  permission_classes = [AllowAny]

  class QueryParamsSerializer(serializers.Serializer):
    origin_city_id = serializers.IntegerField()
    destine_city_id = serializers.IntegerField()
    date_start = serializers.DateTimeField(required=False)
    date_end = serializers.DateTimeField(required=False)

  OutputSerializer = TripListOutputSerializer

  def get(self, request):
    params = self.QueryParamsSerializer(data=request.query_params)
    params.is_valid(raise_exception=True)
    data = params.validated_data

    trips = selectors.get_trips_opened(
      origin_city_id=data["origin_city_id"],
      destine_city_id=data["destine_city_id"],
      date_start=data.get("date_start"),
      date_end=data.get("date_end"),
      )
    return Response(self.OutputSerializer(trips, many=True).data)


# ---------------------------------------------------------------------------
# Trip (motorista)
# ---------------------------------------------------------------------------

class TripCreateApi(APIView):
    permission_classes = [AllowAny]

    class InputSerializer(serializers.Serializer):
        origin_city_id = serializers.IntegerField()
        destine_city_id = serializers.IntegerField()
        departure_time = serializers.DateTimeField()
        available_spots = serializers.IntegerField()
        origin_location_id = serializers.IntegerField()
        destination_location_id = serializers.IntegerField()
        intermediate_location_ids = serializers.ListField(
            child=serializers.IntegerField(), required=False, default=list
        )

    OutputSerializer = TripDetailOutputSerializer

    def post(self, request):
        payload = self.InputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        driver = _get_driver_profile(request)
        trip = create_trip(driver=driver, **data)
        return Response(self.OutputSerializer(trip).data, status=status.HTTP_201_CREATED)

class MyTripsApi(APIView):

    permission_classes = [AllowAny]
 
    class OutputSerializer(serializers.Serializer):
        role = serializers.CharField()
        trip = TripListOutputSerializer()
 
    def get(self, request):
        results = selectors.get_my_trips(request.user)
        return Response(self.OutputSerializer(results, many=True).data)
 

class TripDetailApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = TripDetailOutputSerializer

    def get(self, request, trip_id: int):
        trip = selectors.get_trip(trip_id)
        return Response(self.OutputSerializer(trip).data)


class TripCostDetailApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = TripCostOutputSerializer

    def get(self, request, trip_id: int):
        trip = selectors.get_trip(trip_id)
        return Response(self.OutputSerializer(trip.cost).data)


class TripFareSplitApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = TripFareSplitOutputSerializer

    def get(self, request, trip_id: int):
        trip = selectors.get_trip(trip_id)
        split = selectors.get_fare_split(trip)
        data = {
            "trip_id": trip.id,
            "total_cost": trip.cost.total_cost,
            "split": split,
        }
        return Response(self.OutputSerializer(data).data)


class TripRouteApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = TripRouteOutputSerializer
 
    def get(self, request, trip_id: int):
        trip = selectors.get_trip(trip_id)
        return Response(self.OutputSerializer(trip).data)

class StopOrderInputSerializer(serializers.Serializer):
    stop_id = serializers.IntegerField()
    order = serializers.IntegerField()

class TripReorderStopsApi(APIView):
    permission_classes = [AllowAny]
    
    class InputSerializer(serializers.Serializer):
        stop_orders = StopOrderInputSerializer(many=True)

    def post(self, request, trip_id: int):
        payload = self.InputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        driver = _get_driver_profile(request)
        stop_orders = [(item["stop_id"], item["order"]) for item in data["stop_orders"]]
        update_order(trip_id=trip_id, driver_profile_id=driver.id, stop_orders=stop_orders)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TripRecalculateRouteApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = TripDetailOutputSerializer

    def post(self, request, trip_id: int):
        driver = _get_driver_profile(request)
        trip = new_map_order(trip_id=trip_id, driver_profile_id=driver.id)
        return Response(self.OutputSerializer(trip).data)


class TripStartApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = TripDetailOutputSerializer

    def post(self, request, trip_id: int):
        driver = _get_driver_profile(request)
        trip = start_trip(trip_id=trip_id, driver_profile_id=driver.id)
        return Response(self.OutputSerializer(trip).data)


class TripFinishApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = TripDetailOutputSerializer

    def post(self, request, trip_id: int):
        driver = _get_driver_profile(request)
        trip = finish_trip(trip_id=trip_id, driver_profile_id=driver.id)
        return Response(self.OutputSerializer(trip).data)


# ==================
# BOOKING PHASES
# ==================

# ---------------------------------------------------------------------------
# Booking request (passageiro)
# ---------------------------------------------------------------------------

class BookingRequestCreateApi(APIView):
    permission_classes = [AllowAny]

    class InputSerializer(serializers.Serializer):
        trip_id = serializers.IntegerField()
        pickup_stop_id = serializers.IntegerField()
        dropoff_stop_id = serializers.IntegerField()

    OutputSerializer = BookingOutputSerializer

    def post(self, request):
        payload = self.InputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        booking = create_booking_request(passenger=request.user, **data)
        return Response(self.OutputSerializer(booking).data, status=status.HTTP_201_CREATED)


class BookingRequestCancelApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = BookingOutputSerializer

    def post(self, request, booking_id: int):
        booking = cancel_booking_request(booking_id=booking_id, passenger=request.user)
        return Response(self.OutputSerializer(booking).data)


class MyBookingsApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = BookingOutputSerializer

    def get(self, request):
        bookings = selectors.get_passenger_bookings(request.user.id)
        return Response(self.OutputSerializer(bookings, many=True).data)


# ---------------------------------------------------------------------------
# Booking request (motorista decidindo)
# ---------------------------------------------------------------------------

class TripBookingRequestListApi(APIView):
    permission_classes = [AllowAny]

    class QueryParamsSerializer(serializers.Serializer):
        status = serializers.CharField(required=False, default=Booking.Status.PENDING)

    OutputSerializer = BookingOutputSerializer

    def get(self, request, trip_id: int):
        params = self.QueryParamsSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        status_filter = params.validated_data["status"]
        status_filter = None if status_filter == "all" else status_filter

        driver = _get_driver_profile(request)
        bookings = selectors.get_trip_booking_requests(
            driver_profile_id=driver.id, trip_id=trip_id, status=status_filter
        )
        return Response(self.OutputSerializer(bookings, many=True).data)


class BookingRequestAcceptApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = BookingOutputSerializer

    def post(self, request, booking_id: int):
        driver = _get_driver_profile(request)
        booking = accept_booking_request(booking_id=booking_id, driver_profile_id=driver.id)
        return Response(self.OutputSerializer(booking).data)


class BookingRequestRejectApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = BookingOutputSerializer

    def post(self, request, booking_id: int):
        driver = _get_driver_profile(request)
        booking = reject_booking_request(booking_id=booking_id, driver_profile_id=driver.id)
        return Response(self.OutputSerializer(booking).data)


# ---------------------------------------------------------------------------
# City / Location (apoio pro cadastro/busca)
# ---------------------------------------------------------------------------

class CitySearchApi(APIView):
    permission_classes = [AllowAny]

    class QueryParamsSerializer(serializers.Serializer):
        q = serializers.CharField(min_length=2)

    class OutputSerializer(serializers.Serializer):
        id = serializers.IntegerField()
        label = serializers.CharField()

    def get(self, request):
        params = self.QueryParamsSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        results = selectors.search_cities_by_name(params.validated_data["q"])
        return Response(self.OutputSerializer(results, many=True).data)


class CityLocationsApi(APIView):
    permission_classes = [AllowAny]
    OutputSerializer = LocationOutputSerializer

    def get(self, request, city_id: int):
        locations = selectors.get_locations_of_city(city_id)
        return Response(self.OutputSerializer(locations, many=True).data)
