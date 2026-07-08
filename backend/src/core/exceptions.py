"""
core/exceptions.py

Ponto único de tradução "erro de domínio -> resposta HTTP". Plugado via
settings.py:

    REST_FRAMEWORK = {
        "EXCEPTION_HANDLER": "core.exceptions.exception_handler",
    }

Se um dia trocarmos de DRF pra outro framework (Django Ninja, etc.), só
este arquivo muda — nenhuma view/service precisa saber como um erro vira
HTTP. Todo erro de regra de negócio do projeto (TripServiceError e
qualquer outro que vier depois, de outras apps) deve herdar de
ApplicationError, pra cair automaticamente aqui.
"""

from django.core.exceptions import ObjectDoesNotExist
from rest_framework import exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class ApplicationError(Exception):
    """
    Erro de regra de negócio (não de infraestrutura/bug). Base genérica
    pra qualquer app do projeto — ex: TripServiceError(trip/services/trip.py)
    herda daqui.
    """

    def __init__(self, message: str, extra: dict | None = None):
        super().__init__(message)
        self.message = message
        self.extra = extra or {}


def exception_handler(exc, context):
    # Model.DoesNotExist (Trip.DoesNotExist, Booking.DoesNotExist, etc.)
    # não é um Http404 nem uma exceção da DRF — sem isso, um .get(pk=...)
    # que falha viraria 500 em vez de 404.
    if isinstance(exc, ObjectDoesNotExist):
        exc = exceptions.NotFound()

    # Http404 e django.core.exceptions.PermissionDenied já são convertidos
    # pra NotFound/PermissionDenied da DRF DENTRO do drf_exception_handler
    # abaixo — não precisamos duplicar essa conversão aqui.
    response = drf_exception_handler(exc, context)

    # ApplicationError pode estar definida em qualquer lugar (core.exceptions,
    # trip.services.trip, etc.) — procuramos pelo nome da classe e interface,
    # não pela identidade exata.
    if response is None and hasattr(exc, 'message') and hasattr(exc, 'extra'):
        data = {"detail": str(exc.message)}
        if exc.extra:
            data["extra"] = exc.extra
        return Response(data, status=400)

    return response