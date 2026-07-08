import { useEffect, useState } from "react";
import { cancelTrip, getUserAgenda } from "../../service/agendaService";
import { ApiError } from "../../../app/services/apiError";
import { ConfirmModal } from "../../../components/ConfirmModal/ConfirmModal";
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

  function handleTripCancelled(updatedTrip: AgendaTrip) {
    setTrips((currentTrips) =>
      currentTrips.map((trip) => (trip.id === updatedTrip.id ? updatedTrip : trip))
    );
  }

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
              <TripCard key={trip.id} trip={trip} onCancelled={handleTripCancelled} />
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

type TripCardProps = {
  trip: AgendaTrip;
  onCancelled: (updatedTrip: AgendaTrip) => void;
};

function TripCard({ trip, onCancelled }: TripCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  async function handleConfirmCancel() {
    setIsCancelling(true);
    setCancelError("");

    try {
      const { is_cancelled } = await cancelTrip(trip.id);
      onCancelled({ ...trip, is_cancelled });
      setIsModalOpen(false);
    } catch (error) {
      setCancelError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível cancelar essa viagem. Tente novamente."
      );
    } finally {
      setIsCancelling(false);
    }
  }

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

      {!trip.is_cancelled && (
        <div className="trip-card__actions">
          <button
            type="button"
            className="trip-card__cancel-button"
            onClick={() => setIsModalOpen(true)}
            disabled={trip.role === "passenger"}
            title={
              trip.role === "passenger"
                ? "Cancelamento de reserva pelo passageiro ainda não está disponível por aqui."
                : undefined
            }
          >
            Cancelar
          </button>

          {cancelError && (
            <span className="trip-card__cancel-error" role="alert">
              {cancelError}
            </span>
          )}
        </div>
      )}

      {isModalOpen && (
        <ConfirmModal
          title="Cancelar viagem"
          message={`Tem certeza que deseja cancelar a viagem de ${trip.origin} para ${trip.destination}? Essa ação não pode ser desfeita.`}
          confirmLabel="Cancelar viagem"
          cancelLabel="Voltar"
          isConfirming={isCancelling}
          onConfirm={handleConfirmCancel}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
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
