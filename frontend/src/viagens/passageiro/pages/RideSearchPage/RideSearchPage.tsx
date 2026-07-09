import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../../../app/services/apiError";
import { CitySearch } from "../../../../components/CitySearch/CitySearch";
import { FormField } from "../../../../components/FormField/FormField";
import type { CitySearchResult, TripListItem } from "../../../../types/trip";
import { searchTrips } from "../../service/rideService";
import type { RideSearchErrors, RideSearchFilters } from "../../types/ride";
import "./RideSearchPage.css";

const initialFilters: RideSearchFilters = {
  originCity: null,
  destineCity: null,
  dateStart: "",
  dateEnd: "",
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const distanceFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function RideSearchPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RideSearchFilters>(initialFilters);
  const [errors, setErrors] = useState<RideSearchErrors>({});
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  function updateCity(
    field: "originCity" | "destineCity",
    city: CitySearchResult | null
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: city,
    }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setSearchError("");
  }

  function updateDate(field: "dateStart" | "dateEnd", value: string) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setSearchError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateFilters(filters);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    setSearchError("");

    try {
      const results = await searchTrips(filters);
      setTrips(results);
      setHasSearched(true);
    } catch (error) {
      setSearchError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível buscar viagens. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="ride-search-page">
      <section className="ride-search-shell" aria-labelledby="ride-search-title">
        <header className="ride-search-header">
          <p>Buscar caronas</p>
          <h1 id="ride-search-title">Encontre uma viagem disponível</h1>
        </header>

        <form className="ride-search-form" onSubmit={handleSubmit}>
          <div className="ride-search-form__grid">
            <CitySearch
              label="Origem"
              placeholder="Digite a cidade de saída"
              selectedCity={filters.originCity}
              error={errors.originCity}
              onSelect={(city) => updateCity("originCity", city)}
            />

            <CitySearch
              label="Destino"
              placeholder="Digite a cidade de chegada"
              selectedCity={filters.destineCity}
              error={errors.destineCity}
              onSelect={(city) => updateCity("destineCity", city)}
            />

            <FormField
              id="ride-date-start"
              label="Data inicial"
              type="date"
              value={filters.dateStart}
              error={errors.dateStart}
              onChange={(event) => updateDate("dateStart", event.target.value)}
            />

            <FormField
              id="ride-date-end"
              label="Data final"
              type="date"
              value={filters.dateEnd}
              error={errors.dateEnd}
              onChange={(event) => updateDate("dateEnd", event.target.value)}
            />
          </div>

          {searchError && (
            <span className="ride-search-form__error" role="alert">
              {searchError}
            </span>
          )}

          <div className="ride-search-form__actions">
            <button
              className="ride-button ride-button--primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Buscando..." : "Buscar caronas"}
            </button>
          </div>
        </form>

        <section className="ride-results" aria-label="Resultados de caronas">
          <div className="ride-results__header">
            <h2>{hasSearched ? "Resultados da busca" : "Pronto para buscar"}</h2>
            <span>{formatResultCount(trips.length)}</span>
          </div>

          {isLoading ? (
            <div className="ride-results__empty">
              <strong>Buscando viagens...</strong>
            </div>
          ) : trips.length > 0 ? (
            <div className="ride-results__list">
              {trips.map((trip) => (
                <RideResultCard
                  key={trip.id}
                  trip={trip}
                  onSelect={() => navigate(`/caronas/${trip.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="ride-results__empty">
              <strong>
                {hasSearched
                  ? "Nenhuma carona encontrada"
                  : "Informe origem e destino para começar"}
              </strong>
              <p>
                {hasSearched
                  ? "Altere os filtros para encontrar outras opções disponíveis."
                  : "A busca usa cidades selecionadas para bater com o contrato da API."}
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function RideResultCard({
  trip,
  onSelect,
}: {
  trip: TripListItem;
  onSelect: () => void;
}) {
  return (
    <button
      className="ride-card"
      type="button"
      onClick={onSelect}
      aria-label={`Ver detalhes da viagem de ${trip.origin_city.name} para ${trip.destine_city.name}`}
    >
      <div className="ride-card__header">
        <span className="ride-card__status">Disponível</span>
        <span>{formatDistance(trip.total_distance_km)}</span>
      </div>

      <div className="ride-card__route">
        <div>
          <span>Origem</span>
          <strong>
            {trip.origin_city.name} - {trip.origin_city.state}
          </strong>
        </div>
        <div>
          <span>Destino</span>
          <strong>
            {trip.destine_city.name} - {trip.destine_city.state}
          </strong>
        </div>
      </div>

      <div className="ride-card__meta">
        <div>
          <span>Saída</span>
          <strong>{formatDateTime(trip.departure_time)}</strong>
        </div>
        <div>
          <span>Vagas</span>
          <strong>{formatSeats(trip.available_spots)}</strong>
        </div>
        <div>
          <span>Duração</span>
          <strong>{formatDuration(trip.total_duration_min)}</strong>
        </div>
        <div>
          <span>Custo total</span>
          <strong>{formatCurrency(trip.cost?.total_cost)}</strong>
        </div>
      </div>
    </button>
  );
}

function validateFilters(filters: RideSearchFilters): RideSearchErrors {
  const nextErrors: RideSearchErrors = {};

  if (!filters.originCity) {
    nextErrors.originCity = "Selecione uma cidade de origem.";
  }

  if (!filters.destineCity) {
    nextErrors.destineCity = "Selecione uma cidade de destino.";
  }

  if (
    filters.originCity &&
    filters.destineCity &&
    filters.originCity.id === filters.destineCity.id
  ) {
    nextErrors.destineCity = "O destino deve ser diferente da origem.";
  }

  if (filters.dateEnd && !filters.dateStart) {
    nextErrors.dateStart = "Informe uma data inicial para usar data final.";
  }

  if (
    filters.dateStart &&
    filters.dateEnd &&
    new Date(filters.dateStart) > new Date(filters.dateEnd)
  ) {
    nextErrors.dateEnd = "A data final deve ser posterior à data inicial.";
  }

  return nextErrors;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function formatDistance(value: number) {
  return `${distanceFormatter.format(value)} km`;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount) ? currencyFormatter.format(amount) : "Indisponível";
}

function formatDuration(totalMinutes: number) {
  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}

function formatSeats(value: number) {
  return value === 1 ? "1 vaga" : `${value} vagas`;
}

function formatResultCount(value: number) {
  return value === 1 ? "1 viagem" : `${value} viagens`;
}
