from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from trip.selectors import trip_get, trip_list
from trip.serializers import (
    TripCreateSerializer,
    TripDetailSerializer,
    TripListFilterSerializer,
    TripListSerializer,
)
from trip.services import trip_create


class TripPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class TripListCreateApi(APIView):
    def get(self, request):
        filters = TripListFilterSerializer(data=request.query_params)
        filters.is_valid(raise_exception=True)
        trips = trip_list(**filters.validated_data)
        paginator = TripPagination()
        page = paginator.paginate_queryset(trips, request)
        serializer = TripListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = TripCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trip = trip_create(driver=request.user, **serializer.validated_data)
        return Response(TripDetailSerializer(trip).data, status=status.HTTP_201_CREATED)


class TripDetailApi(APIView):
    def get(self, request, trip_id):
        trip = trip_get(trip_id=trip_id)
        return Response(TripDetailSerializer(trip).data)
