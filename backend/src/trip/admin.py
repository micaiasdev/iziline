from django.contrib import admin
from django.db.models import Count
from unfold.admin import ModelAdmin, TabularInline
from .models import ProfileDriver, City, Location, Trip, TripStop, Booking


# ---------------------------------------------------------------------------
# City + Location (o pedido principal: cadastrar cidade e as locations dela
# na mesma tela, via inline)
# ---------------------------------------------------------------------------

class LocationInline(TabularInline):
    """
    Formulário aninhado: aparece dentro da própria página de edição da
    City, permitindo adicionar/editar várias Locations sem sair da tela.
    """
    model = Location
    extra = 1  # quantas linhas em branco já vêm prontas pra preencher
    fields = ["name", "formatted_address", "latitude", "longitude"]


@admin.register(City)
class CityAdmin(ModelAdmin):
    list_display = ["name", "state", "mapbox_place_id", "locations_count"]
    search_fields = ["name", "state"]
    inlines = [LocationInline]

    def get_queryset(self, request):
      qs = super().get_queryset(request)
      return qs.annotate(loc_count=Count('locations'))

    def locations_count(self, obj: City) -> int:
      return obj.locations.count()
    locations_count.short_description = "Locations cadastradas"


@admin.register(Location)
class LocationAdmin(ModelAdmin):
    """
    Registro separado também — útil pra buscar/editar uma location
    específica sem precisar abrir a cidade inteira.
    """
    list_display = ["name", "city", "latitude", "longitude", "created_at"]
    list_filter = ["city"]
    search_fields = ["name", "formatted_address"]
    autocomplete_fields = ["city"]  


# ---------------------------------------------------------------------------
# Resto dos models — registro simples, útil pra inspecionar dados
# enquanto o frontend não está pronto
# ---------------------------------------------------------------------------

@admin.register(ProfileDriver)
class ProfileDriverAdmin(ModelAdmin):
    list_display = ["user", "is_verified", "created_at"]
    list_filter = ["is_verified"]
    search_fields = ["user__username"]


class TripStopInline(TabularInline):
    model = TripStop
    extra = 1
    fields = ["location", "order"]
    autocomplete_fields = ["location"]


@admin.register(Trip)
class TripAdmin(ModelAdmin):
    list_display = [
        "id", "driver", "origin_city", "destine_city",
        "departure_time", "status", "available_spots",
    ]
    list_filter = ["status", "origin_city", "destine_city"]
    search_fields = ["id"]
    autocomplete_fields = ["driver", "origin_city", "destine_city"]
    inlines = [TripStopInline]
    readonly_fields = ["line_trip", "total_distance_km", "total_duration_min", "created_at", "updated_at"]


@admin.register(TripStop)
class TripStopAdmin(ModelAdmin):
    """
    Registrado separadamente (além de aparecer como inline em TripAdmin)
    porque autocomplete_fields no BookingAdmin exige que o model de
    destino tenha um ModelAdmin próprio com search_fields — senão o
    manage.py check falha com admin.E039.
    """
    list_display = ["trip", "order", "location"]
    search_fields = ["trip__id", "location__name"]
    autocomplete_fields = ["trip", "location"]


@admin.register(Booking)
class BookingAdmin(ModelAdmin):
    list_display = ["id", "trip", "passenger", "status", "created_at", "confirmed_at"]
    list_filter = ["status"]
    search_fields = ["trip__id", "passenger__username"]
    autocomplete_fields = ["trip", "passenger", "pickup_stop", "dropoff_stop"]