import pytest

from trip.services.routing import get_routing_client, MapboxRoutingClient


class TestGetRoutingClient:
    def test_returns_mapbox_client_by_default(self, settings):
        settings.ROUTING_PROVIDER = "mapbox"
        settings.MAPBOX_ACCESS_TOKEN = "fake-token-for-test"

        client = get_routing_client()

        assert isinstance(client, MapboxRoutingClient)

    def test_raises_for_unknown_provider(self, settings):
        settings.ROUTING_PROVIDER = "algum_provedor_que_nao_existe"

        with pytest.raises(ValueError):
            get_routing_client()