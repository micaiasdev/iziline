import pytest
from django.core.exceptions import ValidationError

from users.models import User
from users.services import user_create


@pytest.fixture
def valid_data():
    return dict(
        email="ana@example.com",
        password="senha12345",
        full_name="Ana Silva",
        cpf="12345678901",
        phone="86999990000",
    )


def test_user_create_hashes_password(db, valid_data):
    user = user_create(**valid_data)

    assert user.pk is not None
    assert user.email == "ana@example.com"
    assert user.password != "senha12345"
    assert user.check_password("senha12345")


def test_user_create_duplicate_email_raises(db, valid_data):
    user_create(**valid_data)

    dup = {**valid_data, "cpf": "99999999999"}
    with pytest.raises(ValidationError):
        user_create(**dup)


def test_user_create_duplicate_cpf_raises(db, valid_data):
    user_create(**valid_data)

    dup = {**valid_data, "email": "outra@example.com"}
    with pytest.raises(ValidationError):
        user_create(**dup)


def test_user_create_invalid_cpf_raises(db, valid_data):
    with pytest.raises(ValidationError):
        user_create(**{**valid_data, "cpf": "123"})


def test_age_property_from_birth_date(db, valid_data):
    from datetime import date

    user = user_create(**{**valid_data, "birth_date": date(2000, 1, 1)})
    assert user.age == date.today().year - 2000 - (
        (date.today().month, date.today().day) < (1, 1)
    )
