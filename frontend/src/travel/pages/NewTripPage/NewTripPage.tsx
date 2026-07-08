import { useEffect, useRef, useState } from "react";
import { FormField } from "../../../components/FormField/FormField";
import { CitySearch } from "../../../components/CitySearch/CitySearch";
import { getCityLocations } from "../../service/cityService";
import { createTrip } from "../../service/serviceApi";
import { ApiError } from "../../service/apiError";
import type {
  CitySearchResult,
  CreateTripInput,
  Location,
  TripDetail,
  TripStop,
} from "../../../types/trip";
import izilineLogo from "../../../assets/iziline.png";
import "./NewTripPage.css";

const minAvailableSpots = 1;
const maxAvailableSpots = 8;

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

type Stage = "form" | "review" | "completed";

type CityPointValue = {
  city: CitySearchResult | null;
  location: Location | null;
};

type StopField = CityPointValue & { key: string };

const emptyPoint: CityPointValue = { city: null, location: null };

type FormErrors = {
  origin?: string;
  destination?: string;
  date?: string;
  time?: string;
  departure?: string;
};

type RoutePoint = {
  role: "Origem" | "Parada" | "Destino";
  cityLabel: string;
  addressLabel: string;
};

function formatSpots(value: number) {
  return value === 1 ? "1 vaga" : `${value} vagas`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function cityPointLabel(point: CityPointValue): RoutePoint["cityLabel"] {
  return point.city?.label ?? "";
}

// Combobox de cidade + select de ponto de embarque/desembarque.
// Refaz a busca de pontos sempre que a cidade selecionada muda.
function CityPointField({
  cityLabel,
  pointLabel,
  value,
  error,
  onChange,
}: {
  cityLabel: string;
  pointLabel: string;
  value: CityPointValue;
  error?: string;
  onChange: (value: CityPointValue) => void;
}) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const cityId = value.city?.id;

  useEffect(() => {
    if (!cityId) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setIsLoadingLocations(true);
      }
    });

    getCityLocations(cityId)
      .then((found) => {
        if (!cancelled) {
          setLocations(found);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocations([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingLocations(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cityId]);

  function handleLocationChange(locationId: string) {
    const found = locations.find((location) => location.id === Number(locationId));
    onChange({ ...value, location: found ?? null });
  }

  const hasNoLocations = Boolean(value.city) && !isLoadingLocations && locations.length === 0;

  return (
    <div className="city-point-field">
      <CitySearch
        label={cityLabel}
        selectedCity={value.city}
        onSelect={(city) => onChange({ city, location: null })}
      />

      <div className="city-point-field__location">
        <label htmlFor={`${cityLabel}-point`}>{pointLabel}</label>
        <select
          id={`${cityLabel}-point`}
          value={value.location?.id ?? ""}
          disabled={!value.city || isLoadingLocations || locations.length === 0}
          aria-invalid={Boolean(error)}
          onChange={(event) => handleLocationChange(event.target.value)}
        >
          <option value="" disabled>
            {isLoadingLocations
              ? "Carregando pontos…"
              : hasNoLocations
                ? "Nenhum ponto cadastrado nessa cidade"
                : "Selecione um ponto"}
          </option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      {error && <span className="city-point-field__error">{error}</span>}
    </div>
  );
}

// Trajeto ordenado (origem → paradas → destino) com conector vertical.
function TripRouteList({ points }: { points: RoutePoint[] }) {
  return (
    <ol className="trip-route-list">
      {points.map((point, index) => (
        <li className="trip-route-list__item" key={`${point.role}-${index}`}>
          <div className="trip-route-list__marker" aria-hidden="true">
            <span className="trip-route-list__dot" />
            {index < points.length - 1 && (
              <span className="trip-route-list__line" />
            )}
          </div>
          <div className="trip-route-list__content">
            <span className="trip-route-list__role">{point.role}</span>
            <strong>{point.cityLabel}</strong>
            <span className="trip-route-list__address">{point.addressLabel}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function stopsToRoutePoints(
  origin: CityPointValue,
  stops: StopField[],
  destination: CityPointValue
): RoutePoint[] {
  return [
    {
      role: "Origem",
      cityLabel: cityPointLabel(origin),
      addressLabel: origin.location?.name ?? "",
    },
    ...stops.map((stop) => ({
      role: "Parada" as const,
      cityLabel: cityPointLabel(stop),
      addressLabel: stop.location?.name ?? "",
    })),
    {
      role: "Destino",
      cityLabel: cityPointLabel(destination),
      addressLabel: destination.location?.name ?? "",
    },
  ];
}

function tripStopsToRoutePoints(stops: TripStop[]): RoutePoint[] {
  return stops.map((stop, index) => ({
    role:
      index === 0 ? "Origem" : index === stops.length - 1 ? "Destino" : "Parada",
    cityLabel: `${stop.location.city.name}-${stop.location.city.state}`,
    addressLabel: stop.location.name,
  }));
}

export function NewTripPage({
  onTripCreated,
  onViewRequests,
}: {
  onTripCreated: (tripId: number) => void;
  onViewRequests: (tripId: number) => void;
}) {
  const stopKeyCounter = useRef(0);

  const [stage, setStage] = useState<Stage>("form");
  const [origin, setOrigin] = useState<CityPointValue>(emptyPoint);
  const [destination, setDestination] = useState<CityPointValue>(emptyPoint);
  const [stops, setStops] = useState<StopField[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [availableSpots, setAvailableSpots] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [stopErrors, setStopErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [createdTrip, setCreatedTrip] = useState<TripDetail | null>(null);

  function addStop() {
    stopKeyCounter.current += 1;
    setStops((current) => [
      ...current,
      { key: `stop-${stopKeyCounter.current}`, ...emptyPoint },
    ]);
  }

  function updateStop(key: string, value: CityPointValue) {
    setStops((current) =>
      current.map((stop) => (stop.key === key ? { ...stop, ...value } : stop))
    );
    setStopErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function removeStop(key: string) {
    setStops((current) => current.filter((stop) => stop.key !== key));
    setStopErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function moveStop(key: string, direction: -1 | 1) {
    setStops((current) => {
      const index = current.findIndex((stop) => stop.key === key);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function decreaseSpots() {
    setAvailableSpots((current) => Math.max(minAvailableSpots, current - 1));
  }

  function increaseSpots() {
    setAvailableSpots((current) => Math.min(maxAvailableSpots, current + 1));
  }

  function validateForm(): boolean {
    const nextErrors: FormErrors = {};
    const nextStopErrors: Record<string, string> = {};

    if (!origin.city) {
      nextErrors.origin = "Escolha a cidade de origem.";
    } else if (!origin.location) {
      nextErrors.origin = "Escolha o ponto de embarque.";
    }

    if (!destination.city) {
      nextErrors.destination = "Escolha a cidade de destino.";
    } else if (!destination.location) {
      nextErrors.destination = "Escolha o ponto de desembarque.";
    }

    for (const stop of stops) {
      if (!stop.city || !stop.location) {
        nextStopErrors[stop.key] = "Escolha a cidade e o ponto desta parada.";
      }
    }

    if (!date) {
      nextErrors.date = "Preencha a data da viagem.";
    }

    if (!time) {
      nextErrors.time = "Preencha o horário de saída.";
    }

    if (date && time) {
      const departureDate = new Date(`${date}T${time}`);
      if (Number.isNaN(departureDate.getTime()) || departureDate <= new Date()) {
        nextErrors.departure = "A data e o horário precisam ser futuros.";
      }
    }

    setErrors(nextErrors);
    setStopErrors(nextStopErrors);
    return Object.keys(nextErrors).length === 0 && Object.keys(nextStopErrors).length === 0;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validateForm()) {
      setStage("review");
    }
  }

  function handleBackToForm() {
    setSubmissionError("");
    setStage("form");
  }

  async function handleConfirm() {
    if (!origin.city || !origin.location || !destination.city || !destination.location) {
      return;
    }

    const input: CreateTripInput = {
      originCityId: origin.city.id,
      originLocationId: origin.location.id,
      destineCityId: destination.city.id,
      destinationLocationId: destination.location.id,
      intermediateLocationIds: stops
        .map((stop) => stop.location?.id)
        .filter((id): id is number => typeof id === "number"),
      date,
      time,
      availableSpots,
    };

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const trip = await createTrip(input);
      setCreatedTrip(trip);
      setStage("completed");
      onTripCreated(trip.id);
    } catch (error) {
      setSubmissionError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível publicar a viagem. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCreateAnother() {
    setOrigin(emptyPoint);
    setDestination(emptyPoint);
    setStops([]);
    setDate("");
    setTime("");
    setAvailableSpots(1);
    setErrors({});
    setStopErrors({});
    setSubmissionError("");
    setCreatedTrip(null);
    setStage("form");
  }

  function handleCancel() {
    handleCreateAnother();
  }

  if (stage === "review") {
    return (
      <main className="new-trip-page">
        <section className="new-trip-shell" aria-labelledby="review-title">
          <img className="new-trip-page__logo" src={izilineLogo} alt="Iziline" />

          <article className="trip-card" aria-labelledby="review-title">
            <header className="trip-card__header">
              <h1 id="review-title">Confira antes de publicar</h1>
              <p>Revise a rota e os dados da viagem.</p>
            </header>

            <TripRouteList points={stopsToRoutePoints(origin, stops, destination)} />

            <div className="trip-card__meta">
              <div>
                <span>Saída</span>
                <strong>{formatDateTime(`${date}T${time}`)}</strong>
              </div>
              <div>
                <span>Vagas</span>
                <strong>{formatSpots(availableSpots)}</strong>
              </div>
            </div>

            {submissionError && (
              <span className="trip-card__error" role="alert">
                {submissionError}
              </span>
            )}

            <div className="trip-card__actions">
              <button
                className="button button--secondary"
                type="button"
                onClick={handleBackToForm}
                disabled={isSubmitting}
              >
                Voltar
              </button>
              <button
                className="button button--primary"
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Publicando…" : "Publicar viagem"}
              </button>
            </div>
          </article>
        </section>
      </main>
    );
  }

  if (stage === "completed" && createdTrip) {
    return (
      <main className="new-trip-page">
        <section className="new-trip-shell" aria-labelledby="completed-title">
          <img className="new-trip-page__logo" src={izilineLogo} alt="Iziline" />

          <article className="trip-card" aria-labelledby="completed-title">
            <div className="trip-card__badge" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3.5 8.5l3 3 6-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <header className="trip-card__header">
              <h1 id="completed-title">Viagem publicada</h1>
              <p>Sua carona já está visível para os passageiros da rota.</p>
            </header>

            <TripRouteList points={tripStopsToRoutePoints(createdTrip.stops)} />

            <div className="trip-card__meta">
              <div>
                <span>Saída</span>
                <strong>{formatDateTime(createdTrip.departure_time)}</strong>
              </div>
              <div>
                <span>Vagas</span>
                <strong>{formatSpots(createdTrip.available_spots)}</strong>
              </div>
            </div>

            <div className="trip-card__actions trip-card__actions--stacked">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => onViewRequests(createdTrip.id)}
              >
                Ver solicitações de reserva
              </button>
              <button
                className="button button--primary"
                type="button"
                onClick={handleCreateAnother}
              >
                Cadastrar outra viagem
              </button>
            </div>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="new-trip-page">
      <section className="new-trip-shell" aria-labelledby="new-trip-title">
        <img className="new-trip-page__logo" src={izilineLogo} alt="Iziline" />

        <form className="new-trip-form" onSubmit={handleSubmit} noValidate>
          <header className="new-trip-form__header">
            <h1 id="new-trip-title">Cadastrar nova viagem</h1>
          </header>

          <div className="new-trip-form__section">
            <CityPointField
              cityLabel="Cidade de origem"
              pointLabel="Ponto de embarque"
              value={origin}
              error={errors.origin}
              onChange={setOrigin}
            />
          </div>

          {stops.length > 0 && (
            <div className="new-trip-form__section new-trip-form__stops">
              <span className="new-trip-form__stops-label">Paradas no caminho</span>
              {stops.map((stop, index) => (
                <div className="stop-row" key={stop.key}>
                  <CityPointField
                    cityLabel={`Cidade da parada ${index + 1}`}
                    pointLabel="Ponto da parada"
                    value={stop}
                    error={stopErrors[stop.key]}
                    onChange={(value) => updateStop(stop.key, value)}
                  />
                  <div className="stop-row__actions">
                    <button
                      type="button"
                      onClick={() => moveStop(stop.key, -1)}
                      disabled={index === 0}
                      aria-label={`Mover parada ${index + 1} para cima`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStop(stop.key, 1)}
                      disabled={index === stops.length - 1}
                      aria-label={`Mover parada ${index + 1} para baixo`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="stop-row__remove"
                      onClick={() => removeStop(stop.key)}
                      aria-label={`Remover parada ${index + 1}`}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button type="button" className="add-stop-button" onClick={addStop}>
            + Adicionar parada (opcional)
          </button>

          <div className="new-trip-form__section">
            <CityPointField
              cityLabel="Cidade de destino"
              pointLabel="Ponto de desembarque"
              value={destination}
              error={errors.destination}
              onChange={setDestination}
            />
          </div>

          <fieldset className="new-trip-form__grid">
            <legend className="new-trip-form__legend">Data e horário de saída</legend>

            <FormField
              id="date"
              label="Data"
              type="date"
              value={date}
              error={errors.date}
              onChange={(event) => setDate(event.target.value)}
            />

            <FormField
              id="time"
              label="Horário"
              type="time"
              value={time}
              error={errors.time}
              onChange={(event) => setTime(event.target.value)}
            />
          </fieldset>

          {errors.departure && (
            <span className="new-trip-form__error" role="alert">
              {errors.departure}
            </span>
          )}

          <div className="seats-field">
            <div>
              <label htmlFor="availableSpots">Vagas disponíveis</label>
              <p>Escolha quantas pessoas podem viajar com você.</p>
            </div>

            <div className="seats-control">
              <button type="button" onClick={decreaseSpots} aria-label="Diminuir vagas">
                −
              </button>
              <input
                id="availableSpots"
                type="number"
                min={minAvailableSpots}
                max={maxAvailableSpots}
                value={availableSpots}
                onChange={(event) =>
                  setAvailableSpots(
                    Math.min(
                      maxAvailableSpots,
                      Math.max(minAvailableSpots, Number(event.target.value) || minAvailableSpots)
                    )
                  )
                }
              />
              <button type="button" onClick={increaseSpots} aria-label="Aumentar vagas">
                +
              </button>
            </div>
          </div>

          <div className="new-trip-form__actions">
            <button className="button button--secondary" type="button" onClick={handleCancel}>
              Cancelar
            </button>
            <button className="button button--primary" type="submit">
              Continuar
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
