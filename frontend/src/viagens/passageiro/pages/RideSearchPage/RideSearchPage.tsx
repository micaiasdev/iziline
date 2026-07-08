import { useEffect, useState } from "react";
import { FormField } from "../../../../components/FormField/FormField";
import { searchRides } from "../../service/rideService";
import type { RideSearchFilters, RideSearchResult } from "../../types/ride";
import "./RideSearchPage.css";

const initialFilters: RideSearchFilters = {
  origin: "",
  destination: "",
  date: "",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function RideSearchPage() {
  const [filters, setFilters] = useState<RideSearchFilters>(initialFilters);
  const [rides, setRides] = useState<RideSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadInitialRides() {
      try {
        const results = await searchRides(initialFilters);

        if (!shouldIgnore) {
          setRides(results);
        }
      } catch {
        if (!shouldIgnore) {
          setSearchError("Não foi possível buscar caronas. Tente novamente.");
        }
      }
    }

    void loadInitialRides();

    return () => {
      shouldIgnore = true;
    };
  }, []);

  function updateFilter<Field extends keyof RideSearchFilters>(
    field: Field,
    value: RideSearchFilters[Field]
  ) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
    setSearchError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setSearchError("");

    try {
      const results = await searchRides(filters);
      setRides(results);
      setHasSearched(true);
    } catch {
      setSearchError("Não foi possível buscar caronas. Tente novamente.");
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
            <FormField
              id="ride-origin"
              label="Origem"
              type="text"
              placeholder="Ex: Teresina"
              value={filters.origin}
              onChange={(event) => updateFilter("origin", event.target.value)}
            />

            <FormField
              id="ride-destination"
              label="Destino"
              type="text"
              placeholder="Ex: Floriano"
              value={filters.destination}
              onChange={(event) =>
                updateFilter("destination", event.target.value)
              }
            />

            <FormField
              id="ride-date"
              label="Data"
              type="date"
              value={filters.date}
              onChange={(event) => updateFilter("date", event.target.value)}
            />
          </div>

          {searchError && (
            <span className="ride-search-form__error" role="alert">
              {searchError}
            </span>
          )}

          <div className="ride-search-form__actions">
            <button className="ride-button ride-button--primary" type="submit">
              {isLoading ? "Buscando..." : "Buscar caronas"}
            </button>
          </div>
        </form>

        <section className="ride-results" aria-label="Resultados de caronas">
          <div className="ride-results__header">
            <h2>{hasSearched ? "Resultados da busca" : "Caronas disponíveis"}</h2>
            <span>{formatResultCount(rides.length)}</span>
          </div>

          {rides.length > 0 ? (
            <div className="ride-results__list">
              {rides.map((ride) => (
                <RideResultCard key={ride.id} ride={ride} />
              ))}
            </div>
          ) : (
            <div className="ride-results__empty">
              <strong>Nenhuma carona encontrada</strong>
              <p>Altere os filtros para encontrar outras opções disponíveis.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function RideResultCard({ ride }: { ride: RideSearchResult }) {
  return (
    <article className="ride-card">
      <div className="ride-card__driver">
        <div>
          <span>Motorista</span>
          <strong>{ride.driverName}</strong>
        </div>
        {ride.carModel && <span>{ride.carModel}</span>}
      </div>

      <div className="ride-card__route">
        <div>
          <span>Origem</span>
          <strong>{ride.origin}</strong>
        </div>
        <div>
          <span>Destino</span>
          <strong>{ride.destination}</strong>
        </div>
      </div>

      <div className="ride-card__meta">
        <div>
          <span>Saída</span>
          <strong>{formatDateTime(ride.departureAt)}</strong>
        </div>
        <div>
          <span>Vagas</span>
          <strong>{formatSeats(ride.seatsAvailable)}</strong>
        </div>
        <div>
          <span>Preço</span>
          <strong>{formatPrice(ride.price)}</strong>
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

function formatResultCount(value: number) {
  return value === 1 ? "1 carona" : `${value} caronas`;
}
