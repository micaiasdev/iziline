"""
api.py

Views no padrão HackSoft styleguide: uma APIView por ação, com
InputSerializer / OutputSerializer aninhados na própria classe. Login e
refresh de token são delegados às views do Simple JWT (ver urls.py).
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services


class UserOutputSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name = serializers.CharField()
    cpf = serializers.CharField()
    birth_date = serializers.DateField(allow_null=True)
    age = serializers.IntegerField(allow_null=True)
    phone = serializers.CharField(allow_blank=True)


class RegisterApi(APIView):
    """POST /api/auth/register/ — cadastro público de usuário."""

    permission_classes = [AllowAny]
    authentication_classes = []

    class InputSerializer(serializers.Serializer):
        email = serializers.EmailField()
        password = serializers.CharField(write_only=True, min_length=8)
        full_name = serializers.CharField(max_length=150)
        cpf = serializers.CharField(max_length=11)
        birth_date = serializers.DateField(required=False, allow_null=True)
        phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = services.user_create(**serializer.validated_data)
        except DjangoValidationError as exc:
            # full_clean/save do service usa django.core ValidationError; o
            # handler da DRF não a converte sozinho, então traduzimos aqui.
            raise DRFValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)

        return Response(UserOutputSerializer(user).data, status=status.HTTP_201_CREATED)


class MeApi(APIView):
    """GET/PATCH /api/users/me/ — perfil do usuário autenticado."""

    permission_classes = [IsAuthenticated]

    class UpdateSerializer(serializers.Serializer):
        full_name = serializers.CharField(max_length=150, required=False)
        phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
        birth_date = serializers.DateField(required=False, allow_null=True)

    def get(self, request):
        return Response(UserOutputSerializer(request.user).data)

    def patch(self, request):
        serializer = self.UpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            user = services.user_update(user=request.user, data=serializer.validated_data)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)

        return Response(UserOutputSerializer(user).data)
