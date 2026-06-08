from django.contrib import admin

from .models import Trip


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ('id', 'driver', 'origin', 'destination', 'departure_at', 'seats_available', 'is_cancelled')
    list_filter = ('is_cancelled', 'departure_at')
    search_fields = ('origin', 'destination', 'driver__username', 'driver__email')
from django.contrib import admin

# Register your models here.
