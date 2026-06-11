from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from trip.apis import TripPagination

from booking.selectors import user_agenda
from booking.serializers import (
    AgendaFilterSerializer,
    AgendaTripSerializer,
    BookingCreateSerializer,
    BookingDetailSerializer,
)
from booking.services import booking_cancel, booking_create


class BookingCreateApi(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = booking_create(
            trip_id=serializer.validated_data["trip"], passenger=request.user
        )
        return Response(
            BookingDetailSerializer(booking).data, status=status.HTTP_201_CREATED
        )


class BookingCancelApi(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, booking_id):
        booking = booking_cancel(booking_id=booking_id, user=request.user)
        return Response(BookingDetailSerializer(booking).data)


class UserAgendaApi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        filters = AgendaFilterSerializer(data=request.query_params)
        filters.is_valid(raise_exception=True)
        trips = user_agenda(user=request.user, when=filters.validated_data["when"])
        paginator = TripPagination()
        page = paginator.paginate_queryset(trips, request)
        serializer = AgendaTripSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)