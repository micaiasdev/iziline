import pytest
from rest_framework.test import APIClient

from users.models import User
from users.services import user_create
from trip.models import ProfileDriver


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def register_payload():
    return {
        "email": "novo@example.com",
        "password": "senha12345",
        "full_name": "Novo Usuário",
        "cpf": "12345678901",
        "phone": "86999990000",
    }


def test_register_creates_user(db, client, register_payload):
    resp = client.post("/api/auth/register/", register_payload, format="json")

    assert resp.status_code == 201
    assert resp.data["email"] == "novo@example.com"
    assert "password" not in resp.data
    user = User.objects.get(email="novo@example.com")
    assert ProfileDriver.objects.filter(user=user, is_verified=True).exists()


def test_register_duplicate_email_returns_400(db, client, register_payload):
    client.post("/api/auth/register/", register_payload, format="json")

    dup = {**register_payload, "cpf": "99999999999"}
    resp = client.post("/api/auth/register/", dup, format="json")

    assert resp.status_code == 400
    assert not User.objects.filter(cpf="99999999999").exists()


def test_register_invalid_cpf_returns_400(db, client, register_payload):
    resp = client.post(
        "/api/auth/register/", {**register_payload, "cpf": "123"}, format="json"
    )
    assert resp.status_code == 400


def test_login_returns_tokens(db, client, register_payload):
    user_create(
        email=register_payload["email"],
        password=register_payload["password"],
        full_name=register_payload["full_name"],
        cpf=register_payload["cpf"],
    )

    resp = client.post(
        "/api/auth/login/",
        {"email": register_payload["email"], "password": register_payload["password"]},
        format="json",
    )

    assert resp.status_code == 200
    assert "access" in resp.data
    assert "refresh" in resp.data


def test_me_requires_authentication(db, client):
    resp = client.get("/api/users/me/")
    assert resp.status_code == 401


def test_me_returns_profile_when_authenticated(db, client, register_payload):
    user = user_create(
        email=register_payload["email"],
        password=register_payload["password"],
        full_name=register_payload["full_name"],
        cpf=register_payload["cpf"],
    )

    client.force_authenticate(user=user)
    resp = client.get("/api/users/me/")

    assert resp.status_code == 200
    assert resp.data["email"] == register_payload["email"]
