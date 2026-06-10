from django.urls import path

from booking.apis import BookingCreateApi, UserAgendaApi

urlpatterns = [
    path("", BookingCreateApi.as_view(), name="booking-create"),
    path("my-trips/", UserAgendaApi.as_view(), name="user-agenda"),
]
