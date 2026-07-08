import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getTripDetail,
  type DriverTripSummary,
} from "../../service/driverTripsService";
import { TripRouteList } from "../../../components/TripRoute/TripRoute";
import { tripStopsToRoutePoints } from "../../../components/TripRoute/tripRoutePoints";
import type { TripStatus } from "../../../types/trip";
import "./TripDetailPage.css";

const statusLabel: Record<TripStatus, string> = {
  open: "Aberta",
  full: "Lotada",
  in_progress: "Em andamento",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

export function TripDetailPage() {
  const { tripId: tripIdParam } = useParams();
  const tripId = Number(tripIdParam);

  const [trip, setTrip] = useState<DriverTripSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let shouldIgnore = false;

    async function loadTrip() {
      setIsLoading(true);
      setLoadError("");

      try {
        const result = await getTripDetail(tripId);
        if (!shouldIgnore) {
          setTrip(result);
        }
      } catch {
        if (!shouldIgnore) {
          setLoadError("Não foi possível carregar esta viagem. Tente novamente.");
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

  return (
    <main className="trip-detail-page">
      <section className="trip-detail-shell" aria-labelledby="trip-detail-title">
        <Link to="/viagens" className="trip-detail-back">
          ← Suas viagens
        </Link>

        {isLoading && (
          <div className="trip-detail-empty">
            <strong>Carregando viagem…</strong>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="trip-detail-empty">
            <strong>{loadError}</strong>
          </div>
        )}

        {!isLoading && !loadError && trip && (
          <article className="trip-card" aria-labelledby="trip-detail-title">
            <header className="trip-card__header">
              <h1 id="trip-detail-title">
                {trip.origin_city.name}-{trip.origin_city.state} →{" "}
                {trip.destine_city.name}-{trip.destine_city.state}
              </h1>
              <span
                className={`trip-detail-status trip-detail-status--${trip.status}`}
              >
                {statusLabel[trip.status]}
              </span>
            </header>

            <TripRouteList points={tripStopsToRoutePoints(trip.stops)} />

            <div className="trip-card__meta">
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
                <span>Distância</span>
                <strong>{trip.total_distance_km.toLocaleString("pt-BR")} km</strong>
              </div>
              <div>
                <span>Duração</span>
                <strong>{Math.round(trip.total_duration_min)} min</strong>
              </div>
            </div>

            <div className="trip-card__actions">
              <Link
                to={`/viagens/${trip.id}/solicitacoes`}
                className="button button--primary"
              >
                {trip.pendingRequestsCount > 0
                  ? `Ver solicitações (${trip.pendingRequestsCount} pendente${trip.pendingRequestsCount === 1 ? "" : "s"})`
                  : "Ver solicitações de reserva"}
              </Link>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
