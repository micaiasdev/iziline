from django.urls import path

from trip.apis import TripDetailApi, TripListCreateApi

urlpatterns = [
    path("", TripListCreateApi.as_view(), name="trip-list-create"),
    path("<int:trip_id>/", TripDetailApi.as_view(), name="trip-detail"),
]
