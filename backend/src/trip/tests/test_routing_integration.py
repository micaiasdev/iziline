"""
Testes de integração DE VERDADE — batem na API real do Mapbox, sem
nenhum mock. Objetivo: garantir que o formato da requisição que
montamos em MapboxRoutingClient realmente bate com o que a API espera
e retorna algo coerente.

NÃO rodam por padrão (marker `integration`, ver conftest.py na raiz).
Rode com: pytest --run-integration trip/tests/test_routing_integration.py
"""

import pytest
from django.conf import settings

from trip.services.routing import MapboxRoutingClient, RoutingError

pytestmark = pytest.mark.integration


def _skip_if_no_token():
    if not getattr(settings, "MAPBOX_ACCESS_TOKEN", None):
        pytest.skip("MAPBOX_ACCESS_TOKEN não configurado — pulando teste de integração.")


class TestMapboxRoutingClientIntegration:
    def test_returns_valid_route_for_real_coordinates(self):
        _skip_if_no_token()
        client = MapboxRoutingClient()

        # Teresina -> Timon: cidades vizinhas, rota curta = resposta rápida
        # e barata de calcular (evita gastar cota da API à toa).
        coordinates = [
            (-42.802, -5.089),   # Teresina
            (-42.837, -5.095),   # Timon
        ]

        route = client.get_route(coordinates)

        assert route.distance_km > 0
        assert route.duration_min > 0
        assert route.geometry["type"] == "LineString"
        assert len(route.geometry["coordinates"]) >= 2
        # cada coordenada da geometria precisa ser [lng, lat]
        first_point = route.geometry["coordinates"][0]
        assert len(first_point) == 2

    def test_includes_intermediate_waypoint_in_request(self):
        _skip_if_no_token()
        client = MapboxRoutingClient()

        # 3 pontos: origem, 1 parada intermediária, destino — valida que
        # o formato "lng,lat;lng,lat;lng,lat" na URL está correto e que
        # o Mapbox aceita mais de 2 coordenadas.
        coordinates = [
            (-42.802, -5.089),   # Teresina
            (-42.700, -5.150),   # ponto intermediário qualquer
            (-42.837, -5.095),   # Timon
        ]

        route = client.get_route(coordinates)

        assert route.distance_km > 0
        assert route.geometry["type"] == "LineString"

    def test_raises_routing_error_for_single_coordinate(self):
        _skip_if_no_token()
        client = MapboxRoutingClient()

        with pytest.raises(RoutingError):
            client.get_route([(-42.802, -5.089)])

    def test_raises_routing_error_for_invalid_token(self, settings):
        # não precisa de _skip_if_no_token aqui: é justamente o teste do
        # caminho de erro quando o token é inválido/ausente
        settings.MAPBOX_ACCESS_TOKEN = "token-invalido-de-proposito"
        client = MapboxRoutingClient()

        with pytest.raises(RoutingError):
            client.get_route([(-42.802, -5.089), (-42.837, -5.095)])