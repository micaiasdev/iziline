import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getTripDetail,
  getTripFareOverview,
  type DriverTripSummary,
} from "../../service/driverTripsService";
import { TripRouteList } from "../../../../components/TripRoute/TripRoute";
import { tripStopsToRoutePoints } from "../../../../components/TripRoute/tripRoutePoints";
import { startTrip } from "../../../../trip-live/service/tripLiveService";
import { ApiError } from "../../../../app/services/apiError";
import type { TripFareOverview, TripStatus } from "../../../../types/trip";
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount) ? currencyFormatter.format(amount) : "Indisponível";
}

export function TripDetailPage() {
  const { tripId: tripIdParam } = useParams();
  const tripId = Number(tripIdParam);
  const navigate = useNavigate();

  const [trip, setTrip] = useState<DriverTripSummary | null>(null);
  const [fareOverview, setFareOverview] = useState<TripFareOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState("");

  function goLive() {
    navigate(`/viagem/${tripId}/andamento`, {
      state: { role: "driver", backTo: `/viagens/${tripId}` },
    });
  }

  async function handleStart() {
    setIsStarting(true);
    setStartError("");
    try {
      await startTrip(tripId);
      goLive();
    } catch (error) {
      setStartError(
        error instanceof ApiError ? error.message : "Não foi possível iniciar a viagem."
      );
      setIsStarting(false);
    }
  }

  useEffect(() => {
    let shouldIgnore = false;

    async function loadTrip() {
      setIsLoading(true);
      setLoadError("");
      setFareOverview(null);

      try {
        const [result, fareResult] = await Promise.all([
          getTripDetail(tripId),
          getTripFareOverview(tripId),
        ]);
        if (!shouldIgnore) {
          setTrip(result);
          setFareOverview(fareResult);
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

            <section className="trip-cost-panel" aria-label="Custo da viagem">
              <div>
                <span>Custo total</span>
                <strong>{formatCurrency(trip.cost?.total_cost)}</strong>
              </div>
              <div>
                <span>Coberto por passageiros</span>
                <strong>{formatCurrency(fareOverview?.covered_amount)}</strong>
              </div>
              <div>
                <span>Com o motorista</span>
                <strong>{formatCurrency(fareOverview?.driver_amount)}</strong>
              </div>
              <p>
                {fareOverview
                  ? `${fareOverview.confirmed_passengers} passageiro(s) confirmado(s) no rateio atual.`
                  : "Rateio ainda indisponível."}
              </p>
            </section>

            <div className="trip-card__actions">
              {trip.status === "in_progress" && (
                <button type="button" className="button button--primary" onClick={goLive}>
                  Acompanhar no mapa
                </button>
              )}
              {(trip.status === "open" || trip.status === "full") && (
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleStart}
                  disabled={isStarting}
                >
                  {isStarting ? "Iniciando…" : "Iniciar viagem"}
                </button>
              )}
              <Link
                to={`/viagens/${trip.id}/solicitacoes`}
                className="button button--secondary"
              >
                {trip.pendingRequestsCount > 0
                  ? `Solicitações (${trip.pendingRequestsCount})`
                  : "Solicitações de reserva"}
              </Link>
              <Link
                to={`/chat/viagem/${trip.id}`}
                state={{
                  title: "Chat da viagem",
                  subtitle: `${trip.origin_city.name} → ${trip.destine_city.name}`,
                  backTo: `/viagens/${trip.id}`,
                }}
                className="button button--secondary"
              >
                Chat da viagem
              </Link>
            </div>

            {startError && (
              <p className="trip-detail-start-error" role="alert">
                {startError}
              </p>
            )}
          </article>
        )}
      </section>
    </main>
  );
}
