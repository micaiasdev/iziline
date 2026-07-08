from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import api

app_name = "users"

urlpatterns = [
    # Autenticação
    path("auth/register/", api.RegisterApi.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # Perfil
    path("users/me/", api.MeApi.as_view(), name="me"),
]
