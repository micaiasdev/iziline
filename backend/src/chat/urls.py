from django.urls import path

from . import api

app_name = "chat"

urlpatterns = [
    path("bookings/<int:booking_id>/messages/", api.BookingMessageListCreateApi.as_view(), name="booking-messages"),
    path("trips/<int:trip_id>/messages/", api.TripMessageListCreateApi.as_view(), name="trip-messages"),
]
