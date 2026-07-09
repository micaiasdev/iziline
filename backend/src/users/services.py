"""
services.py

Funções de ESCRITA sobre o domínio de usuários — regra de negócio de
cadastro/atualização mora aqui.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from .models import User
from trip.models import ProfileDriver

__all__ = ["user_create", "user_update"]


@transaction.atomic
def user_create(
    *,
    email: str,
    password: str,
    full_name: str,
    cpf: str,
    birth_date=None,
    phone: str = "",
) -> User:
    """Cria um usuário e já habilita seu perfil de motorista no MVP."""
    user = User(
        email=email,
        full_name=full_name,
        cpf=cpf,
        birth_date=birth_date,
        phone=phone,
    )
    user.set_password(password)

    # full_clean roda os validators de campo (ex.: formato de CPF, e-mail).
    user.full_clean()

    try:
        user.save()
    except IntegrityError as exc:
        # e-mail/CPF duplicado (unique=True) chega aqui como IntegrityError.
        raise ValidationError("E-mail ou CPF já cadastrado.") from exc

    ProfileDriver.objects.create(user=user, is_verified=True)

    return user


def user_update(*, user: User, data: dict) -> User:
    """Atualiza campos permitidos do próprio perfil."""
    allowed = {"full_name", "phone", "birth_date"}
    changed = []

    for field in allowed:
        if field in data:
            setattr(user, field, data[field])
            changed.append(field)

    if changed:
        user.full_clean()
        user.save(update_fields=changed)

    return user
