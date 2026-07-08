from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("trip", "0002_trip_route_legs_tripcost"),
    ]

    operations = [
        migrations.AddField(
            model_name="trip",
            name="finished_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="trip",
            name="started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
