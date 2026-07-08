import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listDriverTrips, type DriverTripSummary } from "../../service/driverTripsService";
import type { TripStatus } from "../../../../types/trip";
import "./TripsListPage.css";

const statusLabel: Record<TripStatus, string> = {
  open: "Aberta",
  full: "Lotada",
  in_progress: "Em andamento",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function cityLabel(city: { name: string; state: string }) {
  return `${city.name}-${city.state}`;
}

export function TripsListPage() {
  const [trips, setTrips] = useState<DriverTripSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let shouldIgnore = false;

    async function loadTrips() {
      setIsLoading(true);
      setLoadError("");

      try {
        const results = await listDriverTrips();
        if (!shouldIgnore) {
          setTrips(results);
        }
      } catch {
        if (!shouldIgnore) {
          setLoadError("Não foi possível carregar suas viagens. Tente novamente.");
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      }
    }

    void loadTrips();

    return () => {
      shouldIgnore = true;
    };
  }, []);

  return (
    <main className="trips-list-page">
      <section className="trips-list-shell" aria-labelledby="trips-list-title">
        <header className="trips-list-header">
          <h1 id="trips-list-title">Suas viagens</h1>
          <Link to="/viagens/nova" className="button button--primary">
            Cadastrar viagem
          </Link>
        </header>

        {loadError && (
          <span className="trips-list-error" role="alert">
            {loadError}
          </span>
        )}

        {isLoading ? (
          <div className="trips-list-empty">
            <strong>Carregando viagens…</strong>
          </div>
        ) : trips.length > 0 ? (
          <div className="trips-list">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                to={`/viagens/${trip.id}`}
                className="trip-summary-card"
              >
                <div className="trip-summary-card__header">
                  <strong>
                    {cityLabel(trip.origin_city)} → {cityLabel(trip.destine_city)}
                  </strong>
                  <span className={`trip-summary-card__status trip-summary-card__status--${trip.status}`}>
                    {statusLabel[trip.status]}
                  </span>
                </div>

                <div className="trip-summary-card__meta">
                  <span>Saída em {formatDateTime(trip.departure_time)}</span>
                  <span>
                    {trip.available_seats} de {trip.available_spots} vagas livres
                  </span>
                </div>

                {trip.pendingRequestsCount > 0 && (
                  <span className="trip-summary-card__badge">
                    {trip.pendingRequestsCount === 1
                      ? "1 solicitação pendente"
                      : `${trip.pendingRequestsCount} solicitações pendentes`}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="trips-list-empty">
            <strong>Você ainda não cadastrou viagens</strong>
            <p>Publique sua primeira carona e ela aparece aqui.</p>
            <Link to="/viagens/nova" className="button button--primary">
              Cadastrar viagem
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
