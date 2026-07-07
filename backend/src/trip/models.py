from django.db import models
from django.conf import settings
from django.db.models import Q

class ProfileDriver(models.Model):
     
	user = models.OneToOneField(settings.AUTH_USER_MODEL,
																on_delete=models.CASCADE,
																related_name='driver_profile'
														  )
	is_verified = models.BooleanField(
				default=False,
				help_text="verificações futuras (CNH, veículo etc.)",
				)
     
	created_at = models.DateTimeField(auto_now_add=True)


class City(models.Model):
	name = models.CharField(max_length=48)
	state = models.CharField(max_length=2)
	mapbox_place_id = models.CharField(max_length=100, unique=True, db_index=True) 

class Location(models.Model):
	name = models.CharField(max_length=128)
	formatted_address = models.CharField(max_length=256 )
	city = models.ForeignKey('trip.City', on_delete=models.CASCADE, related_name='locations')
	latitude = models.FloatField()
	longitude = models.FloatField()
	created_at = models.DateTimeField(auto_now_add=True)


class Trip(models.Model):

	driver = models.ForeignKey("trip.ProfileDriver", verbose_name=("Viagem"), on_delete=models.SET_NULL, null=True, related_name='trips')
	origin_city = models.ForeignKey('trip.City', null=True, on_delete=models.SET_NULL, related_name='+')
	destine_city = models.ForeignKey('trip.City', null=True, on_delete=models.SET_NULL, related_name='+')
	available_spots = models.IntegerField()

	#Recalculadas a cada nova tripstop confirmada no booking 
	line_trip = models.JSONField(null=True, blank=True)
	total_distance_km = models.FloatField(blank=True, null=True)
	total_duration_min = models.FloatField(blank=True, null=True)
	departure_time = models.DateTimeField(db_index=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)
	
	#Estágios de uma trip 
	class Status(models.TextChoices):
		OPEN = "open", "Aceitando passageiros"
		FULL = "full", "Sem vagas disponíveis"
		IN_PROGRESS = "in_progress", "Já iniciada"
		FINISHED = "finished", "Finalizada"
		CANCELLED = "cancelled", "Cancelada"

	status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
 

class TripStop(models.Model):
	trip = models.ForeignKey('trip.Trip', on_delete=models.CASCADE,
													related_name='stops')
	location = models.ForeignKey('trip.Location', on_delete=models.SET_NULL, null=True)
	order = models.IntegerField(
	)
	#TODO a questão de uma trip stop fixa, 0 ou 1, as fixas seriam a do começo da viagem
	class Meta:
		unique_together = ['trip', 'location']
		

class Booking(models.Model):

	trip = models.ForeignKey(Trip, related_name="bookings", on_delete=models.CASCADE)
	passenger = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="bookings", on_delete=models.CASCADE,)
	pickup_stop = models.ForeignKey(TripStop, related_name="pickup_bookings", on_delete=models.PROTECT)
	dropoff_stop = models.ForeignKey(TripStop, related_name="dropoff_bookings", on_delete=models.PROTECT)
	
	class Status(models.TextChoices):
		PENDING = "pending", "Aguardando motorista"
		CONFIRMED = "confirmed", "Confirmada"
		REJECTED = "rejected", "Recusada"
		CANCELLED = "cancelled", "Cancelada pelo passageiro"
	status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

	created_at = models.DateTimeField(auto_now_add=True)
	confirmed_at = models.DateTimeField(null=True, blank=True)