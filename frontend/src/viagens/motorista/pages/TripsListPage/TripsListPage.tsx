import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMyTrips } from "../../service/driverTripsService";
import type { MyTripItem, TripListItem, TripStatus } from "../../../../types/trip";
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function formatCurrency(value: string | null | undefined) {
  if (!value) {
    return "\u2014";
  }

  const amount = Number(value);
  return Number.isNaN(amount) ? value : currencyFormatter.format(amount);
}

function cityLabel(city: { name: string; state: string }) {
  return `${city.name}-${city.state}`;
}

export function TripsListPage() {
  const [items, setItems] = useState<MyTripItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let shouldIgnore = false;

    async function loadTrips() {
      setIsLoading(true);
      setLoadError("");

      try {
        const result = await listMyTrips();
        if (!shouldIgnore) {
          setItems(
            [...result].sort((a, b) =>
              a.trip.departure_time.localeCompare(b.trip.departure_time)
            )
          );
        }
      } catch {
        if (!shouldIgnore) {
          setItems([]);
          setLoadError("N\u00e3o foi poss\u00edvel carregar suas viagens. Tente novamente.");
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
            <strong>{"Carregando viagens\u2026"}</strong>
          </div>
        ) : items.length > 0 ? (
          <div className="trips-list">
            {items.map((item) =>
              item.role === "driver" ? (
                <DriverTripCard key={`${item.role}-${item.trip.id}`} trip={item.trip} />
              ) : (
                <PassengerTripCard key={`${item.role}-${item.trip.id}`} trip={item.trip} />
              )
            )}
          </div>
        ) : (
          <div className="trips-list-empty">
            <strong>Nenhuma viagem por aqui ainda</strong>
            <p>
              Cadastre uma carona como motorista ou reserve uma vaga{" \u2014 "}suas
              viagens confirmadas aparecem aqui.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function DriverTripCard({ trip }: { trip: TripListItem }) {
  return (
    <Link to={`/viagens/${trip.id}`} className="trip-summary-card">
      <div className="trip-summary-card__header">
        <strong>
          {cityLabel(trip.origin_city)}{" \u2192 "}{cityLabel(trip.destine_city)}
        </strong>
        <span className="trip-summary-card__role trip-summary-card__role--driver">
          Motorista
        </span>
      </div>

      <TripSummaryMeta trip={trip} />
    </Link>
  );
}

function PassengerTripCard({ trip }: { trip: TripListItem }) {
  const routeLabel = `${trip.origin_city.name} \u2192 ${trip.destine_city.name}`;

  return (
    <article className="trip-summary-card trip-summary-card--passenger">
      <div className="trip-summary-card__header">
        <strong>
          {cityLabel(trip.origin_city)}{" \u2192 "}{cityLabel(trip.destine_city)}
        </strong>
        <span className="trip-summary-card__role trip-summary-card__role--passenger">
          Passageiro
        </span>
      </div>

      <TripSummaryMeta trip={trip} />

      <div className="trip-summary-card__actions">
        {trip.status === "in_progress" && (
          <Link
            to={`/viagem/${trip.id}/andamento`}
            state={{ role: "passenger", backTo: "/viagens" }}
            className="trip-summary-card__track-link"
          >
            Acompanhar no mapa
          </Link>
        )}
        <Link
          to={`/chat/viagem/${trip.id}`}
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

function TripSummaryMeta({ trip }: { trip: TripListItem }) {
  return (
    <div className="trip-summary-card__meta">
      <span className={`trip-summary-card__status trip-summary-card__status--${trip.status}`}>
        {statusLabel[trip.status]}
      </span>
      <span>{"Sa\u00edda em "}{formatDateTime(trip.departure_time)}</span>
      <span>{trip.available_spots} vagas ofertadas</span>
      <span>Custo total {formatCurrency(trip.cost?.total_cost)}</span>
    </div>
  );
}
