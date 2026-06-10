from rest_framework import serializers

from trip.models import Trip


class TripCreateSerializer(serializers.Serializer):
    origin = serializers.CharField(max_length=255)
    destination = serializers.CharField(max_length=255)
    departure_at = serializers.DateTimeField()
    seats_available = serializers.IntegerField(min_value=1)


class _TripOutputBase(serializers.ModelSerializer):
    driver_name = serializers.SerializerMethodField()

    def get_driver_name(self, obj):
        full_name = obj.driver.get_full_name()
        return full_name or obj.driver.get_username()


class TripDetailSerializer(_TripOutputBase):
    class Meta:
        model = Trip
        fields = [
            "id",
            "driver_name",
            "origin",
            "destination",
            "departure_at",
            "seats_available",
            "price",
            "is_cancelled",
            "created_at",
        ]


class TripListSerializer(_TripOutputBase):
    class Meta:
        model = Trip
        fields = [
            "id",
            "driver_name",
            "origin",
            "destination",
            "departure_at",
            "seats_available",
            "price",
        ]
