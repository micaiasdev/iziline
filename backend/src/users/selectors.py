"""
selectors.py

Funções de LEITURA sobre o domínio de usuários.
"""

from __future__ import annotations

from .models import User

__all__ = ["user_get"]


def user_get(*, user_id: int) -> User | None:
    return User.objects.filter(id=user_id).first()
