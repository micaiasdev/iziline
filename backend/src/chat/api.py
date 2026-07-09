from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import selectors, services
from .models import Message


class MessageOutputSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "sender_id", "sender_name", "content", "sent_at"]

    def get_sender_name(self, message: Message) -> str:
        return message.sender.full_name or message.sender.email


class MessageQueryParamsSerializer(serializers.Serializer):
    after = serializers.IntegerField(required=False, min_value=1)


class MessageInputSerializer(serializers.Serializer):
    content = serializers.CharField()

    def validate_content(self, value: str) -> str:
        content = value.strip()
        if not content:
            raise serializers.ValidationError("A mensagem não pode ser vazia.")
        return content


class BookingMessageListCreateApi(APIView):
    permission_classes = [IsAuthenticated]
    QueryParamsSerializer = MessageQueryParamsSerializer
    InputSerializer = MessageInputSerializer
    OutputSerializer = MessageOutputSerializer

    def get(self, request, booking_id: int):
        params = self.QueryParamsSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)

        messages = selectors.message_list_for_booking(
            booking_id=booking_id,
            user=request.user,
            after_id=params.validated_data.get("after"),
        )
        return Response(self.OutputSerializer(messages, many=True).data)

    def post(self, request, booking_id: int):
        payload = self.InputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        message = services.message_send_for_booking(
            booking_id=booking_id,
            sender=request.user,
            content=payload.validated_data["content"],
        )
        return Response(self.OutputSerializer(message).data, status=status.HTTP_201_CREATED)


class TripMessageListCreateApi(APIView):
    permission_classes = [IsAuthenticated]
    QueryParamsSerializer = MessageQueryParamsSerializer
    InputSerializer = MessageInputSerializer
    OutputSerializer = MessageOutputSerializer

    def get(self, request, trip_id: int):
        params = self.QueryParamsSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)

        messages = selectors.message_list_for_trip(
            trip_id=trip_id,
            user=request.user,
            after_id=params.validated_data.get("after"),
        )
        return Response(self.OutputSerializer(messages, many=True).data)

    def post(self, request, trip_id: int):
        payload = self.InputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        message = services.message_send_for_trip(
            trip_id=trip_id,
            sender=request.user,
            content=payload.validated_data["content"],
        )
        return Response(self.OutputSerializer(message).data, status=status.HTTP_201_CREATED)
