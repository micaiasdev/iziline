import { useEffect, useState } from "react";
import { getUserAgenda } from "../../service/agendaService";
import type { AgendaTrip, AgendaWhen } from "../../../types/agenda";
import "./MyTripsPage.css";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const tabs: { value: AgendaWhen; label: string }[] = [
  { value: "upcoming", label: "Próximas Viagens" },
  { value: "past", label: "Histórico" },
];

export function MyTripsPage() {
  const [when, setWhen] = useState<AgendaWhen>("upcoming");
  const [trips, setTrips] = useState<AgendaTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let shouldIgnore = false;

    async function loadAgenda() {
      setIsLoading(true);
      setError("");

      try {
        const results = await getUserAgenda(when);

        if (!shouldIgnore) {
          setTrips(results);
        }
      } catch {
        if (!shouldIgnore) {
          setError("Não foi possível carregar suas viagens. Tente novamente.");
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      }
    }

    void loadAgenda();

    return () => {
      shouldIgnore = true;
    };
  }, [when]);

  return (
    <main className="my-trips-page">
      <section className="my-trips-shell" aria-labelledby="my-trips-title">
        <header className="my-trips-header">
          <p>Minhas viagens</p>
          <h1 id="my-trips-title">Acompanhe sua agenda</h1>
        </header>

        <div className="my-trips-tabs" role="tablist" aria-label="Filtrar viagens">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={when === tab.value}
              className={
                when === tab.value
                  ? "my-trips-tabs__item active"
                  : "my-trips-tabs__item"
              }
              onClick={() => setWhen(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <span className="my-trips-error" role="alert">
            {error}
          </span>
        )}

        {isLoading ? (
          <div className="my-trips-empty">
            <strong>Carregando viagens...</strong>
          </div>
        ) : trips.length > 0 ? (
          <div className="my-trips-list">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="my-trips-empty">
            <strong>Nenhuma viagem encontrada</strong>
            <p>
              {when === "upcoming"
                ? "Você ainda não tem viagens futuras."
                : "Você ainda não tem viagens no histórico."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function TripCard({ trip }: { trip: AgendaTrip }) {
  return (
    <article className="trip-card">
      <div className="trip-card__header">
        <span
          className={
            trip.role === "driver"
              ? "trip-card__role trip-card__role--driver"
              : "trip-card__role trip-card__role--passenger"
          }
        >
          {trip.role === "driver" ? "Motorista" : "Passageiro"}
        </span>
        {trip.is_cancelled && (
          <span className="trip-card__status">Cancelada</span>
        )}
      </div>

      <div className="trip-card__route">
        <div>
          <span>Origem</span>
          <strong>{trip.origin}</strong>
        </div>
        <div>
          <span>Destino</span>
          <strong>{trip.destination}</strong>
        </div>
      </div>

      <div className="trip-card__meta">
        <div>
          <span>Saída</span>
          <strong>{formatDateTime(trip.departure_at)}</strong>
        </div>
        <div>
          <span>Vagas</span>
          <strong>{formatSeats(trip.seats_available)}</strong>
        </div>
        <div>
          <span>Preço</span>
          <strong>{formatPrice(trip.price)}</strong>
        </div>
      </div>
    </article>
  );
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatPrice(value: string) {
  return currencyFormatter.format(Number(value));
}

function formatSeats(value: number) {
  return value === 1 ? "1 vaga" : `${value} vagas`;
}
