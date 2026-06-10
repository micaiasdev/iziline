from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'trip', 'passenger', 'is_cancelled', 'created_at')
    list_filter = ('is_cancelled', 'created_at')
    search_fields = ('trip__origin', 'trip__destination', 'passenger__username')
