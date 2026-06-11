from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/trips/', include('trip.urls')),
    path('api/bookings/', include('booking.urls')),
]
