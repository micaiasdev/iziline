import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../../../app/services/apiError";
import type { TripDetail, TripStatus, TripStop } from "../../../../types/trip";
import { createBooking } from "../../service/bookingService";
import { getTripDetail } from "../../service/rideService";
import "./TripDetailPage.css";

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const distanceFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const statusLabels: Record<TripStatus, string> = {
  open: "Aberta",
  full: "Lotada",
  in_progress: "Em andamento",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

export function TripDetailPage() {
  const navigate = useNavigate();
  const { tripId: tripIdParam } = useParams();
  const tripId = Number(tripIdParam);

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pickupStopId, setPickupStopId] = useState<number | "">("");
  const [dropoffStopId, setDropoffStopId] = useState<number | "">("");
  const [bookingError, setBookingError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderedStops = useMemo(
    () => (trip ? [...trip.stops].sort((a, b) => a.order - b.order) : []),
    [trip]
  );

  const pickupStop = orderedStops.find((stop) => stop.id === pickupStopId);
  const dropoffStop = orderedStops.find((stop) => stop.id === dropoffStopId);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadTrip() {
      if (!Number.isFinite(tripId)) {
        setLoadError("Viagem não encontrada.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError("");
      setBookingError("");

      try {
        const result = await getTripDetail(tripId);
        if (!shouldIgnore) {
          const stops = [...result.stops].sort((a, b) => a.order - b.order);
          setTrip({ ...result, stops });
          setPickupStopId(stops[0]?.id ?? "");
          setDropoffStopId(stops[stops.length - 1]?.id ?? "");
        }
      } catch (error) {
        if (!shouldIgnore) {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : "Não foi possível carregar os detalhes da viagem."
          );
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      }
    }

    void loadTrip();

    return () => {
      shouldIgnore = true;
    };
  }, [tripId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateBooking(trip, pickupStop, dropoffStop);
    if (validationError) {
      setBookingError(validationError);
      return;
    }

    if (!trip || !pickupStop || !dropoffStop) {
      return;
    }

    setIsSubmitting(true);
    setBookingError("");

    try {
      await createBooking({
        tripId: trip.id,
        pickupStopId: pickupStop.id,
        dropoffStopId: dropoffStop.id,
      });
      navigate("/minhas-viagens");
    } catch (error) {
      setBookingError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível solicitar sua reserva. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="passenger-trip-detail-page">
      <section
        className="passenger-trip-detail-shell"
        aria-labelledby="passenger-trip-detail-title"
      >
        <Link to="/caronas" className="passenger-trip-detail-back">
          ← Voltar para busca
        </Link>

        {isLoading && (
          <div className="passenger-trip-detail-empty">
            <strong>Carregando viagem...</strong>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="passenger-trip-detail-empty">
            <strong>{loadError}</strong>
            <Link to="/caronas" className="button button--primary">
              Buscar outras caronas
            </Link>
          </div>
        )}

        {!isLoading && !loadError && trip && (
          <>
            <header className="passenger-trip-detail-header">
              <p>Detalhe da viagem</p>
              <h1 id="passenger-trip-detail-title">
                {trip.origin_city.name} para {trip.destine_city.name}
              </h1>
            </header>

            <div className="passenger-trip-detail-layout">
              <article className="passenger-trip-card">
                <div className="passenger-trip-card__header">
                  <span
                    className={`passenger-trip-status passenger-trip-status--${trip.status}`}
                  >
                    {statusLabels[trip.status]}
                  </span>
                  <span>{formatDistance(trip.total_distance_km)}</span>
                </div>

                <div className="passenger-trip-route">
                  <div>
                    <span>Origem</span>
                    <strong>
                      {trip.origin_city.name} - {trip.origin_city.state}
                    </strong>
                  </div>
                  <div>
                    <span>Destino</span>
                    <strong>
                      {trip.destine_city.name} - {trip.destine_city.state}
                    </strong>
                  </div>
                </div>

                <div className="passenger-trip-meta">
                  <div>
                    <span>Saída</span>
                    <strong>{formatDateTime(trip.departure_time)}</strong>
                  </div>
                  <div>
                    <span>Vagas</span>
                    <strong>
                      {trip.available_seats} de {trip.available_spots} livres
                    </strong>
                  </div>
                  <div>
                    <span>Duração</span>
                    <strong>{formatDuration(trip.total_duration_min)}</strong>
                  </div>
                </div>

                {trip.status !== "open" && (
                  <p className="passenger-trip-warning">
                    Esta viagem não está aberta para novas reservas.
                  </p>
                )}

                {trip.status === "open" && trip.available_seats <= 0 && (
                  <p className="passenger-trip-warning">
                    Esta viagem não tem vagas disponíveis.
                  </p>
                )}

                <form className="passenger-booking-form" onSubmit={handleSubmit}>
                  <div className="passenger-booking-form__grid">
                    <label className="passenger-trip-field">
                      <span>Embarque</span>
                      <select
                        value={pickupStopId}
                        onChange={(event) =>
                          setPickupStopId(Number(event.target.value))
                        }
                      >
                        {orderedStops.map((stop) => (
                          <option key={stop.id} value={stop.id}>
                            {formatStopOption(stop)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="passenger-trip-field">
                      <span>Desembarque</span>
                      <select
                        value={dropoffStopId}
                        onChange={(event) =>
                          setDropoffStopId(Number(event.target.value))
                        }
                      >
                        {orderedStops.map((stop) => (
                          <option key={stop.id} value={stop.id}>
                            {formatStopOption(stop)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <p className="passenger-booking-form__hint">
                    O embarque precisa vir antes do desembarque no trajeto.
                  </p>

                  {bookingError && (
                    <span className="passenger-booking-form__error" role="alert">
                      {bookingError}
                    </span>
                  )}

                  <div className="passenger-booking-form__actions">
                    <Link
                      className="passenger-trip-button passenger-trip-button--secondary"
                      to="/caronas"
                    >
                      Voltar
                    </Link>
                    <button
                      className="passenger-trip-button passenger-trip-button--primary"
                      type="submit"
                      disabled={
                        isSubmitting ||
                        trip.status !== "open" ||
                        trip.available_seats <= 0
                      }
                    >
                      {isSubmitting ? "Reservando..." : "Solicitar reserva"}
                    </button>
                  </div>
                </form>
              </article>

              <aside
                className="passenger-trip-side"
                aria-label="Trajeto da viagem"
              >
                <TripRouteMap trip={trip} />
                <TripStops stops={orderedStops} />
              </aside>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function TripRouteMap({ trip }: { trip: TripDetail }) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstCoordinate = trip.line_trip?.coordinates[0];

    if (!mapRef.current || !firstCoordinate) {
      return;
    }

    const [firstLongitude, firstLatitude] = firstCoordinate;
    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
    }).setView([firstLatitude, firstLongitude], 8);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const routeLayer = L.geoJSON(trip.line_trip, {
      style: {
        color: "#4f8f8c",
        weight: 5,
        opacity: 0.88,
      },
    }).addTo(map);

    trip.stops.forEach((stop) => {
      L.circleMarker([stop.location.latitude, stop.location.longitude], {
        radius: 6,
        color: "#3f7774",
        fillColor: "#ffffff",
        fillOpacity: 1,
        weight: 2,
      })
        .bindPopup(stop.location.name)
        .addTo(map);
    });

    const bounds = routeLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24] });
    }

    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
    };
  }, [trip]);

  return (
    <div className="passenger-trip-map" ref={mapRef}>
      {(!trip.line_trip || trip.line_trip.coordinates.length === 0) && (
        <span>Mapa indisponível para esta viagem.</span>
      )}
    </div>
  );
}

function TripStops({ stops }: { stops: TripStop[] }) {
  return (
    <div className="passenger-trip-stops">
      <h2>Paradas</h2>
      <ol>
        {stops.map((stop) => (
          <li key={stop.id}>
            <span>{stop.order + 1}</span>
            <div>
              <strong>{stop.location.name}</strong>
              <small>
                {stop.location.city.name} - {stop.location.city.state}
              </small>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function validateBooking(
  trip: TripDetail | null,
  pickupStop: TripStop | undefined,
  dropoffStop: TripStop | undefined
): string {
  if (!trip) {
    return "Viagem não encontrada.";
  }

  if (trip.status !== "open") {
    return "Esta viagem não está aberta para reservas.";
  }

  if (trip.available_spots <= 0 || trip.available_seats <= 0) {
    return "Esta viagem não tem vagas disponíveis.";
  }

  if (!pickupStop || !dropoffStop) {
    return "Selecione embarque e desembarque.";
  }

  if (pickupStop.order >= dropoffStop.order) {
    return "O embarque deve vir antes do desembarque.";
  }

  return "";
}

function formatStopOption(stop: TripStop) {
  return `${stop.order + 1}. ${stop.location.name} (${stop.location.city.name})`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function formatDistance(value: number) {
  return `${distanceFormatter.format(value)} km`;
}

function formatDuration(totalMinutes: number) {
  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}
