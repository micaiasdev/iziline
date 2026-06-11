from django.urls import path

from booking.apis import BookingCancelApi, BookingCreateApi, UserAgendaApi

urlpatterns = [
    path("", BookingCreateApi.as_view(), name="booking-create"),
    path("<int:booking_id>/cancel/", BookingCancelApi.as_view(), name="booking-cancel"),
    path("my-trips/", UserAgendaApi.as_view(), name="user-agenda"),
]