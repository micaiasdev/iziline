from rest_framework import serializers

from trip.models import Trip
from booking.models import Booking


class BookingCreateSerializer(serializers.Serializer):
    # IntegerField (not PrimaryKeyRelatedField) so a nonexistent trip becomes 404
    # via get_object_or_404 in the service, not 400 from serializer validation.
    trip = serializers.IntegerField()


class BookingDetailSerializer(serializers.ModelSerializer):
    passenger_name = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = ["id", "trip", "passenger_name", "is_cancelled", "created_at"]
        read_only_fields = ["id", "trip", "passenger_name", "is_cancelled", "created_at"]

    def get_passenger_name(self, obj):
        return obj.passenger.get_full_name() or obj.passenger.get_username()


class AgendaTripSerializer(serializers.ModelSerializer):
    driver_name = serializers.SerializerMethodField()
    role = serializers.CharField(read_only=True)

    class Meta:
        model = Trip
        fields = [
            "id", "driver_name", "origin", "destination", "departure_at",
            "seats_available", "price", "is_cancelled", "role",
        ]
        read_only_fields = [
            "id", "driver_name", "origin", "destination", "departure_at",
            "seats_available", "price", "is_cancelled", "role",
        ]

    def get_driver_name(self, obj):
        return obj.driver.get_full_name() or obj.driver.get_username()


class AgendaFilterSerializer(serializers.Serializer):
    when = serializers.ChoiceField(
        choices=["upcoming", "past"], required=False, default="upcoming"
    )
