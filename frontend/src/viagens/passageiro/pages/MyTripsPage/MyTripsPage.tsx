import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../../../app/services/apiError";
import { ConfirmModal } from "../../../../components/ConfirmModal/ConfirmModal";
import type { BookingStatus, PassengerBooking } from "../../../../types/trip";
import { cancelBooking, listMyBookings } from "../../service/agendaService";
import "./MyTripsPage.css";

type BookingFilter = "all" | "pending" | "confirmed" | "history";

const tabs: { value: BookingFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "history", label: "Histórico" },
];

const statusLabels: Record<BookingStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function MyTripsPage() {
  const [activeFilter, setActiveFilter] = useState<BookingFilter>("all");
  const [bookings, setBookings] = useState<PassengerBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredBookings = useMemo(
    () => filterBookings(bookings, activeFilter),
    [bookings, activeFilter]
  );

  useEffect(() => {
    let shouldIgnore = false;

    async function loadBookings() {
      setIsLoading(true);
      setError("");

      try {
        const results = await listMyBookings();
        if (!shouldIgnore) {
          setBookings(results);
        }
      } catch (loadError) {
        if (!shouldIgnore) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : "Não foi possível carregar suas reservas."
          );
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      }
    }

    void loadBookings();

    return () => {
      shouldIgnore = true;
    };
  }, []);

  function handleBookingUpdated(updatedBooking: PassengerBooking) {
    setBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === updatedBooking.id
          ? {
              ...booking,
              ...updatedBooking,
              trip_summary: updatedBooking.trip_summary ?? booking.trip_summary,
            }
          : booking
      )
    );
  }

  return (
    <main className="passenger-my-trips-page">
      <section
        className="passenger-my-trips-shell"
        aria-labelledby="passenger-my-trips-title"
      >
        <header className="passenger-my-trips-header">
          <p>Minhas reservas</p>
          <h1 id="passenger-my-trips-title">Acompanhe suas solicitações</h1>
        </header>

        <div
          className="passenger-my-trips-tabs"
          role="tablist"
          aria-label="Filtrar reservas"
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeFilter === tab.value}
              className={
                activeFilter === tab.value
                  ? "passenger-my-trips-tabs__item active"
                  : "passenger-my-trips-tabs__item"
              }
              onClick={() => setActiveFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <span className="passenger-my-trips-error" role="alert">
            {error}
          </span>
        )}

        {isLoading ? (
          <div className="passenger-my-trips-empty">
            <strong>Carregando reservas...</strong>
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="passenger-my-trips-list">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancelled={handleBookingUpdated}
              />
            ))}
          </div>
        ) : (
          <div className="passenger-my-trips-empty">
            <strong>Nenhuma reserva encontrada</strong>
            <p>As reservas aparecerão aqui depois que você solicitar uma vaga.</p>
          </div>
        )}
      </section>
    </main>
  );
}

type BookingCardProps = {
  booking: PassengerBooking;
  onCancelled: (booking: PassengerBooking) => void;
};

function BookingCard({ booking, onCancelled }: BookingCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const trip = booking.trip_summary;
  const routeLabel = trip
    ? `${trip.origin_city.name} → ${trip.destine_city.name}`
    : `Reserva #${booking.id}`;

  async function handleConfirmCancel() {
    setIsCancelling(true);
    setCancelError("");

    try {
      const updatedBooking = await cancelBooking(booking.id);
      onCancelled({
        ...booking,
        ...updatedBooking,
        trip_summary: updatedBooking.trip_summary ?? booking.trip_summary,
      });
      setIsModalOpen(false);
    } catch (error) {
      setCancelError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível cancelar esta reserva. Tente novamente."
      );
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <article className="passenger-booking-card">
      <div className="passenger-booking-card__header">
        <span className={`passenger-booking-status passenger-booking-status--${booking.status}`}>
          {statusLabels[booking.status]}
        </span>
        <span>Reserva #{booking.id}</span>
      </div>

      <div className="passenger-booking-card__route">
        <div>
          <span>Origem</span>
          <strong>{trip ? formatCity(trip.origin_city) : "Resumo indisponível"}</strong>
        </div>
        <div>
          <span>Destino</span>
          <strong>{trip ? formatCity(trip.destine_city) : `Viagem #${booking.trip}`}</strong>
        </div>
      </div>

      <div className="passenger-booking-card__meta">
        <div>
          <span>Saída</span>
          <strong>
            {trip ? formatDateTime(trip.departure_time) : "Aguardando API"}
          </strong>
        </div>
        <div>
          <span>Embarque</span>
          <strong>{booking.pickup_stop.location.name}</strong>
        </div>
        <div>
          <span>Desembarque</span>
          <strong>{booking.dropoff_stop.location.name}</strong>
        </div>
      </div>

      <div className="passenger-booking-card__meta passenger-booking-card__meta--secondary">
        <div>
          <span>Solicitada em</span>
          <strong>{formatDateTime(booking.created_at)}</strong>
        </div>
        <div>
          <span>Confirmação</span>
          <strong>
            {booking.confirmed_at
              ? formatDateTime(booking.confirmed_at)
              : "Ainda sem confirmação"}
          </strong>
        </div>
      </div>

      {!trip && (
        <p className="passenger-booking-card__note">
          O endpoint atual retorna apenas o ID da viagem. O card está preparado
          para exibir o resumo quando o backend passar a enviá-lo.
        </p>
      )}

      {(booking.status === "pending" || booking.status === "confirmed") && (
        <div className="passenger-booking-card__actions">
          {booking.status === "pending" ? (
            <Link
              to={`/chat/reserva/${booking.id}`}
              state={{
                title: "Conversa com o motorista",
                subtitle: routeLabel,
                backTo: "/minhas-viagens",
              }}
              className="passenger-booking-card__chat-link"
            >
              Conversar com o motorista
            </Link>
          ) : (
            <Link
              to={`/chat/viagem/${booking.trip}`}
              state={{
                title: "Chat da viagem",
                subtitle: routeLabel,
                backTo: "/minhas-viagens",
              }}
              className="passenger-booking-card__chat-link"
            >
              Abrir chat da viagem
            </Link>
          )}

          {booking.status === "pending" && (
            <button
              type="button"
              className="passenger-booking-card__cancel-button"
              onClick={() => setIsModalOpen(true)}
            >
              Cancelar reserva
            </button>
          )}

          {cancelError && (
            <span className="passenger-booking-card__cancel-error" role="alert">
              {cancelError}
            </span>
          )}
        </div>
      )}

      {isModalOpen && (
        <ConfirmModal
          title="Cancelar reserva"
          message={`Tem certeza que deseja cancelar esta reserva${
            trip
              ? ` de ${trip.origin_city.name} para ${trip.destine_city.name}`
              : ""
          }?`}
          confirmLabel="Cancelar reserva"
          cancelLabel="Voltar"
          isConfirming={isCancelling}
          onConfirm={handleConfirmCancel}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
    </article>
  );
}

function filterBookings(
  bookings: PassengerBooking[],
  filter: BookingFilter
): PassengerBooking[] {
  if (filter === "all") {
    return bookings;
  }

  if (filter === "history") {
    return bookings.filter((booking) =>
      ["rejected", "cancelled"].includes(booking.status)
    );
  }

  return bookings.filter((booking) => booking.status === filter);
}

function formatCity(city: { name: string; state: string }) {
  return `${city.name} - ${city.state}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}
