
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler
 
 
class ApplicationError(Exception):
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
 
    if response is None and isinstance(exc, ApplicationError):
        data = {"detail": exc.message}
        if exc.extra:
            data["extra"] = exc.extra
        return Response(data, status=400)
 
    return response
 