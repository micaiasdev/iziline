import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("trip", "0003_trip_started_at_trip_finished_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="DriverLocation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("latitude", models.FloatField()),
                ("longitude", models.FloatField()),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("trip", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="driver_location", to="trip.trip")),
            ],
        ),
    ]
