import { useEffect, useState } from "react";
import {
  acceptRequest,
  listBookingRequests,
  rejectRequest,
} from "../../service/tripRequestsService";
import { ApiError } from "../../../app/services/apiError";
import type { Booking, BookingStatus, TripStop } from "../../../types/trip";
import "./TripRequestsPage.css";

type StatusFilter = BookingStatus | "all";

const tabs: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Pendentes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "rejected", label: "Recusadas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "all", label: "Todas" },
];

const statusLabel: Record<BookingStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

const emptyMessageByTab: Record<StatusFilter, string> = {
  pending: "Nenhuma solicitação pendente.",
  confirmed: "Nenhuma reserva confirmada ainda.",
  rejected: "Nenhuma solicitação recusada.",
  cancelled: "Nenhuma solicitação cancelada.",
  all: "Nenhuma solicitação para esta viagem.",
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function stopLabel(stop: TripStop) {
  return `${stop.location.name} · ${stop.location.city.name}-${stop.location.city.state}`;
}

type ActionState = "idle" | "accepting" | "rejecting";

export function TripRequestsPage({ tripId }: { tripId: number }) {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionState, setActionState] = useState<Record<number, ActionState>>({});
  const [actionError, setActionError] = useState<Record<number, string>>({});

  useEffect(() => {
    let shouldIgnore = false;

    async function loadRequests() {
      setIsLoading(true);
      setLoadError("");

      try {
        const results = await listBookingRequests(tripId, status);
        if (!shouldIgnore) {
          setBookings(results);
        }
      } catch {
        if (!shouldIgnore) {
          setLoadError("Não foi possível carregar as solicitações. Tente novamente.");
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      shouldIgnore = true;
    };
  }, [tripId, status]);

  async function handleDecision(booking: Booking, decision: "accept" | "reject") {
    const passengerLabel = `Passageiro #${booking.passenger}`;
    const question =
      decision === "accept"
        ? `Aceitar a reserva de ${passengerLabel}?`
        : `Recusar a reserva de ${passengerLabel}?`;

    if (!window.confirm(question)) {
      return;
    }

    setActionState((current) => ({
      ...current,
      [booking.id]: decision === "accept" ? "accepting" : "rejecting",
    }));
    setActionError((current) => {
      const next = { ...current };
      delete next[booking.id];
      return next;
    });

    try {
      if (decision === "accept") {
        await acceptRequest(booking.id);
      } else {
        await rejectRequest(booking.id);
      }

      const refreshed = await listBookingRequests(tripId, status);
      setBookings(refreshed);
    } catch (error) {
      setActionError((current) => ({
        ...current,
        [booking.id]:
          error instanceof ApiError
            ? error.message
            : decision === "accept"
              ? "Não foi possível aceitar essa solicitação."
              : "Não foi possível recusar essa solicitação.",
      }));
    } finally {
      setActionState((current) => {
        const next = { ...current };
        delete next[booking.id];
        return next;
      });
    }
  }

  return (
    <main className="trip-requests-page">
      <section className="trip-requests-shell" aria-labelledby="trip-requests-title">
        <header className="trip-requests-header">
          <p>Solicitações de reserva</p>
          <h1 id="trip-requests-title">Viagem #{tripId}</h1>
        </header>

        <div className="trip-requests-tabs" role="tablist" aria-label="Filtrar por status">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              className={
                status === tab.value
                  ? "trip-requests-tabs__item active"
                  : "trip-requests-tabs__item"
              }
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loadError && (
          <span className="trip-requests-error" role="alert">
            {loadError}
          </span>
        )}

        {isLoading ? (
          <div className="trip-requests-empty">
            <strong>Carregando solicitações…</strong>
          </div>
        ) : bookings.length > 0 ? (
          <div className="trip-requests-list">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                actionState={actionState[booking.id] ?? "idle"}
                error={actionError[booking.id]}
                onAccept={() => handleDecision(booking, "accept")}
                onReject={() => handleDecision(booking, "reject")}
              />
            ))}
          </div>
        ) : (
          <div className="trip-requests-empty">
            <strong>{emptyMessageByTab[status]}</strong>
          </div>
        )}
      </section>
    </main>
  );
}

function BookingCard({
  booking,
  actionState,
  error,
  onAccept,
  onReject,
}: {
  booking: Booking;
  actionState: ActionState;
  error?: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isBusy = actionState !== "idle";

  return (
    <article className="booking-card">
      <div className="booking-card__header">
        <strong>Passageiro #{booking.passenger}</strong>
        <span className={`booking-card__status booking-card__status--${booking.status}`}>
          {statusLabel[booking.status]}
        </span>
      </div>

      <div className="booking-card__route">
        <div>
          <span>Embarque</span>
          <strong>{stopLabel(booking.pickup_stop)}</strong>
        </div>
        <div>
          <span>Desembarque</span>
          <strong>{stopLabel(booking.dropoff_stop)}</strong>
        </div>
      </div>

      <div className="booking-card__meta">
        <span>Solicitado em {formatDateTime(booking.created_at)}</span>
        {booking.confirmed_at && (
          <span>Confirmado em {formatDateTime(booking.confirmed_at)}</span>
        )}
      </div>

      {error && (
        <span className="booking-card__error" role="alert">
          {error}
        </span>
      )}

      {booking.status === "pending" && (
        <div className="booking-card__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={onReject}
            disabled={isBusy}
          >
            {actionState === "rejecting" ? "Recusando…" : "Recusar"}
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={onAccept}
            disabled={isBusy}
          >
            {actionState === "accepting" ? "Aceitando…" : "Aceitar"}
          </button>
        </div>
      )}
    </article>
  );
}
