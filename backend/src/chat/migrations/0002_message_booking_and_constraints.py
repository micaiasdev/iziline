from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("trip", "0003_trip_started_at_trip_finished_at"),
        ("chat", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="booking",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="messages",
                to="trip.booking",
            ),
        ),
        migrations.AlterField(
            model_name="message",
            name="trip",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="messages",
                to="trip.trip",
            ),
        ),
        migrations.AddConstraint(
            model_name="message",
            constraint=models.CheckConstraint(
                condition=(
                    (models.Q(trip__isnull=False, booking__isnull=True))
                    | (models.Q(trip__isnull=True, booking__isnull=False))
                ),
                name="chat_message_exactly_one_context",
            ),
        ),
    ]
