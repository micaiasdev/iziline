from django.conf import settings
from django.db import models


class Trip(models.Model):
	
	driver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trips')
	origin = models.CharField(max_length=255)
	destination = models.CharField(max_length=255)
	departure_at = models.DateTimeField()
	seats_available = models.PositiveIntegerField(default=1)
	price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
	is_cancelled = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-departure_at']

	def __str__(self) -> str:
		return f"Trip {self.id} — {self.origin} → {self.destination} @ {self.departure_at.isoformat()}"
