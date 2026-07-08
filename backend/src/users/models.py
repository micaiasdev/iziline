"""
models.py

Modelo de usuário customizado (login por e-mail) usado como
`AUTH_USER_MODEL` do projeto. Guarda só identidade — a verificação de
motorista (CNH, veículo) continua no `trip.ProfileDriver`.
"""

from __future__ import annotations

from datetime import date

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models


cpf_validator = RegexValidator(
    regex=r"^\d{11}$",
    message="CPF deve conter exatamente 11 dígitos numéricos.",
)


class UserManager(BaseUserManager):
    """Manager do User customizado — cria usuários usando e-mail como login."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        # Compatibilidade: chamadas legadas no estilo Django padrão
        # (create_user(username=..., password=...)) — usadas por testes do app
        # `trip`, que não alteramos — derivam um e-mail a partir do username.
        username = extra_fields.pop("username", None)
        if not email and username:
            email = f"{username}@example.invalid"

        if not email:
            raise ValueError("O e-mail é obrigatório.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superusuário precisa de is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superusuário precisa de is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    # cpf é obrigatório no cadastro (via serializer/serviço), mas nullable no
    # banco para permitir usuários criados sem CPF (ex.: superusuário ou
    # fixtures de teste). NULLs distintos não violam unique.
    cpf = models.CharField(
        max_length=11, unique=True, null=True, blank=True, validators=[cpf_validator]
    )
    birth_date = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "cpf"]

    def __str__(self) -> str:
        return self.email

    @property
    def age(self) -> int | None:
        """Idade em anos derivada de `birth_date` (None se não informada)."""
        if not self.birth_date:
            return None
        today = date.today()
        return (
            today.year
            - self.birth_date.year
            - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
        )
