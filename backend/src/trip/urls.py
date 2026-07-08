from django.urls import path

from . import api

app_name = "trip"

urlpatterns = [
    # Busca (passageiro)
    path("trips/search/", api.TripSearchApi.as_view(), name="search-trips"),

    # Trip 
    path("trips/", api.TripCreateApi.as_view(), name="create-trip"),
    path("trips/<int:trip_id>/", api.TripDetailApi.as_view(), name="trip-detail"),
    path("trips/<int:trip_id>/cost/", api.TripCostDetailApi.as_view(), name="trip-cost-detail"),
    path("trips/<int:trip_id>/fare-split/", api.TripFareSplitApi.as_view(), name="trip-fare-split"),
    path("trips/<int:trip_id>/start/", api.TripStartApi.as_view(), name="start-trip"),
    path("trips/<int:trip_id>/finish/", api.TripFinishApi.as_view(), name="finish-trip"),
    path("trips/<int:trip_id>/location/", api.TripDriverLocationApi.as_view(), name="trip-driver-location"),
    path("trips/<int:trip_id>/reorder/", api.TripReorderStopsApi.as_view(), name="reorder-trip-stops"),
    path("trips/<int:trip_id>/recalculate-route/", api.TripRecalculateRouteApi.as_view(), name="recalculate-route"),
    path("trips/<int:trip_id>/booking-requests/", api.TripBookingRequestListApi.as_view(), name="trip-booking-requests"),

    # Booking request (passageiro)
    path("bookings/", api.BookingRequestCreateApi.as_view(), name="create-booking-request"),
    path("bookings/mine/", api.MyBookingsApi.as_view(), name="my-bookings"),
    path("bookings/<int:booking_id>/cancel/", api.BookingRequestCancelApi.as_view(), name="cancel-booking-request"),

    # Booking request (motorista decidindo)
    path("bookings/<int:booking_id>/accept/", api.BookingRequestAcceptApi.as_view(), name="accept-booking-request"),
    path("bookings/<int:booking_id>/reject/", api.BookingRequestRejectApi.as_view(), name="reject-booking-request"),

    # Apoio (autocomplete)
    path("cities/search/", api.CitySearchApi.as_view(), name="search-cities"),
    path("cities/<int:city_id>/locations/", api.CityLocationsApi.as_view(), name="city-locations"),
]
