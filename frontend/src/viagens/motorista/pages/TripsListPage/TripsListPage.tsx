import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listDriverTrips, type DriverTripSummary } from "../../service/driverTripsService";
import { listMyBookings } from "../../../passageiro/service/agendaService";
import type { PassengerBooking, TripStatus } from "../../../../types/trip";
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

// Lista única da aba "Viagens": as viagens que o usuário dirige e as reservas
// que ele fez como passageiro e já foram confirmadas.
type ViagemItem =
  | { kind: "driver"; id: string; sortKey: string; trip: DriverTripSummary }
  | { kind: "passenger"; id: string; sortKey: string; booking: PassengerBooking };

export function TripsListPage() {
  const [items, setItems] = useState<ViagemItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let shouldIgnore = false;

    async function loadTrips() {
      setIsLoading(true);
      setLoadError("");

      // As duas fontes são carregadas de forma independente: as viagens do
      // motorista ainda não têm endpoint no backend real (listDriverTrips
      // lança), então uma falha aqui não pode esconder as reservas confirmadas.
      const [driverResult, bookingsResult] = await Promise.allSettled([
        listDriverTrips(),
        listMyBookings(),
      ]);

      if (shouldIgnore) {
        return;
      }

      const nextItems: ViagemItem[] = [];

      if (driverResult.status === "fulfilled") {
        for (const trip of driverResult.value) {
          nextItems.push({
            kind: "driver",
            id: `driver-${trip.id}`,
            sortKey: trip.departure_time,
            trip,
          });
        }
      }

      if (bookingsResult.status === "fulfilled") {
        for (const booking of bookingsResult.value) {
          if (booking.status !== "confirmed") {
            continue;
          }
          nextItems.push({
            kind: "passenger",
            id: `passenger-${booking.id}`,
            sortKey: booking.trip_summary?.departure_time ?? booking.created_at,
            booking,
          });
        }
      }

      nextItems.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      setItems(nextItems);

      // Só sinaliza erro se ambas as fontes falharem (nada a exibir).
      if (
        driverResult.status === "rejected" &&
        bookingsResult.status === "rejected"
      ) {
        setLoadError("Não foi possível carregar suas viagens. Tente novamente.");
      }

      setIsLoading(false);
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
        ) : items.length > 0 ? (
          <div className="trips-list">
            {items.map((item) =>
              item.kind === "driver" ? (
                <DriverTripCard key={item.id} trip={item.trip} />
              ) : (
                <PassengerBookingCard key={item.id} booking={item.booking} />
              )
            )}
          </div>
        ) : (
          <div className="trips-list-empty">
            <strong>Nenhuma viagem por aqui ainda</strong>
            <p>
              Cadastre uma carona como motorista ou reserve uma vaga — suas
              viagens confirmadas aparecem aqui.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function DriverTripCard({ trip }: { trip: DriverTripSummary }) {
  return (
    <Link to={`/viagens/${trip.id}`} className="trip-summary-card">
      <div className="trip-summary-card__header">
        <strong>
          {cityLabel(trip.origin_city)} → {cityLabel(trip.destine_city)}
        </strong>
        <span className="trip-summary-card__role trip-summary-card__role--driver">
          Motorista
        </span>
      </div>

      <div className="trip-summary-card__meta">
        <span className={`trip-summary-card__status trip-summary-card__status--${trip.status}`}>
          {statusLabel[trip.status]}
        </span>
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
  );
}

function PassengerBookingCard({ booking }: { booking: PassengerBooking }) {
  const trip = booking.trip_summary;
  const routeLabel = trip
    ? `${trip.origin_city.name} → ${trip.destine_city.name}`
    : `Viagem #${booking.trip}`;

  return (
    <article className="trip-summary-card trip-summary-card--passenger">
      <div className="trip-summary-card__header">
        <strong>
          {trip
            ? `${cityLabel(trip.origin_city)} → ${cityLabel(trip.destine_city)}`
            : `Viagem #${booking.trip}`}
        </strong>
        <span className="trip-summary-card__role trip-summary-card__role--passenger">
          Passageiro
        </span>
      </div>

      <div className="trip-summary-card__meta">
        {trip && (
          <span className={`trip-summary-card__status trip-summary-card__status--${trip.status}`}>
            {statusLabel[trip.status]}
          </span>
        )}
        {trip && <span>Saída em {formatDateTime(trip.departure_time)}</span>}
        <span>
          Embarque: {booking.pickup_stop.location.name} →{" "}
          {booking.dropoff_stop.location.name}
        </span>
      </div>

      <div className="trip-summary-card__actions">
        {trip?.status === "in_progress" && (
          <Link
            to={`/viagem/${booking.trip}/andamento`}
            state={{ role: "passenger", backTo: "/viagens" }}
            className="trip-summary-card__track-link"
          >
            Acompanhar no mapa
          </Link>
        )}
        <Link
          to={`/chat/viagem/${booking.trip}`}
          state={{
            title: "Chat da viagem",
            subtitle: routeLabel,
            backTo: "/viagens",
          }}
          className="trip-summary-card__chat-link"
        >
          Abrir chat da viagem
        </Link>
      </div>
    </article>
  );
}
