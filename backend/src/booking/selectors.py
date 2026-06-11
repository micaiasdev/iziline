from django.db.models import Case, CharField, Q, Value, When
from django.utils import timezone

from trip.models import Trip


def user_agenda(*, user, when="upcoming"):
    now = timezone.now()
    qs = (
        Trip.objects.select_related("driver")
        .filter(Q(driver=user) | Q(bookings__passenger=user, bookings__is_cancelled=False))
        .annotate(
            role=Case(
                When(driver_id=user.id, then=Value("driver")),
                default=Value("passenger"),
                output_field=CharField(),
            )
        )
        .distinct()
    )
    if when == "past":
        qs = qs.filter(departure_at__lt=now)
    else:
        qs = qs.filter(departure_at__gte=now)
    return qs.order_by("departure_at")
