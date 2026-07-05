"""
Camada de integração com serviços externos de roteamento.
Ninguém fora deste arquivo deve importar MapboxRoutingClient diretamente.
O resto do app (services.py, views, etc.) só conhece get_routing_client().
Trocar de provedor no futuro (ex: adicionar OSRM) = adicionar uma classe
aqui + uma linha na factory, sem mudar mais nada no projeto.
"""
from __future__ import annotations
import logging
from dataclasses import dataclass
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class RoutingError(Exception):
    """Erro ao consultar o serviço de rotas (rede, resposta inválida, sem rota etc.)."""

@dataclass
class RouteResult:
    distance_km: float
    duration_min: float
    geometry: dict  # GeoJSON, vai direto pro Trip.line_trip


class BaseRoutingClient:
    """Contrato que todo provedor de rota deve seguir."""

    def get_route(self, coordinates: list[tuple[float, float]]) -> RouteResult:
        """
        coordinates: [(lng, lat), (lng, lat), ...] na ordem da viagem
        (origem -> paradas -> destino). Retorna RouteResult ou levanta
        RoutingError.
        """
        raise NotImplementedError


class MapboxRoutingClient(BaseRoutingClient):
    """
    Usa a Mapbox Directions API.
    Docs: https://docs.mapbox.com/api/navigation/directions/
    """

    BASE_URL = "https://api.mapbox.com/directions/v5/mapbox/driving"

    def __init__(self, access_token: str | None = None, timeout: int = 10):
        self.access_token = access_token or settings.MAPBOX_ACCESS_TOKEN
        self.timeout = timeout

    def get_route(self, coordinates: list[tuple[float, float]]) -> RouteResult:
        if len(coordinates) < 2:
            raise RoutingError("É preciso pelo menos origem e destino.")

        coords_str = ";".join(f"{lng},{lat}" for lng, lat in coordinates)
        url = f"{self.BASE_URL}/{coords_str}"

        params = {
            "access_token": self.access_token,
            "geometries": "geojson",
            "overview": "full",
        }

        try:
            resp = requests.get(url, params=params, timeout=self.timeout)
            resp.raise_for_status()
        except requests.RequestException as exc:
            logger.exception("Falha ao consultar Mapbox Directions")
            raise RoutingError("Não foi possível calcular a rota agora.") from exc

        data = resp.json()

        if data.get("code") != "Ok" or not data.get("routes"):
            raise RoutingError(f"Rota não encontrada: {data.get('message', data.get('code'))}")

        route = data["routes"][0]

        return RouteResult(
            distance_km=round(route["distance"] / 1000, 2),
            duration_min=round(route["duration"] / 60, 1),
            geometry=route["geometry"],
        )


def get_routing_client() -> BaseRoutingClient:
    """
    Factory: decide qual provedor usar com base em settings.ROUTING_PROVIDER.
    Todo o resto do projeto chama só esta função — nunca importa uma classe
    de provedor diretamente.
    """
    provider = getattr(settings, "ROUTING_PROVIDER", "mapbox")

    if provider == "mapbox":
        return MapboxRoutingClient()

    raise ValueError(f"ROUTING_PROVIDER desconhecido: {provider}")