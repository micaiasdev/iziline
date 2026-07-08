from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
<<<<<<< HEAD
    path('api/trips/', include('trip.urls'))
=======
    path('api/', include('users.urls')),
    path('api/', include('trip.urls')),
>>>>>>> origin/dev
]
