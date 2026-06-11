import { useMemo, useState } from "react";
import izilineLogo from "../../../assets/iziline.png";
import type { NewTripFormData, TripPointsFormData } from "../../../types/trip";
import "./TripPointsPage.css";

const addressSuggestions = [
  "Terminal Rodoviário Lucídio Portella, Teresina",
  "Avenida Frei Serafim, Centro, Teresina",
  "Shopping Rio Poty, Teresina",
  "Universidade Federal do Piauí, Teresina",
  "Avenida Presidente Kennedy, Teresina",
  "Terminal Rodoviário de Floriano",
  "Avenida Eurípedes de Aguiar, Floriano",
  "Centro Comercial de Floriano",
  "Hospital Regional Tibério Nunes, Floriano",
  "Universidade Estadual do Piauí, Floriano",
];

const currentLocationLabel = "Usar minha localização atual";

type TripPointsPageProps = {
  tripData: NewTripFormData;
  onBack: () => void;
};

type AddressSearchProps = {
  id: keyof TripPointsFormData;
  label: string;
  placeholder: string;
  value: string;
  allowCurrentLocation?: boolean;
  onChange: (field: keyof TripPointsFormData, value: string) => void;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function AddressSearch({
  id,
  label,
  placeholder,
  value,
  allowCurrentLocation = false,
  onChange,
}: AddressSearchProps) {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState("");

  const filteredSuggestions = useMemo(() => {
    const search = normalizeText(value.trim());

    if (
      !isSuggestionsOpen ||
      search.length < 2 ||
      value === currentLocationLabel ||
      value === selectedSuggestion
    ) {
      return [];
    }

    return addressSuggestions
      .filter((address) => normalizeText(address).includes(search))
      .slice(0, 4);
  }, [isSuggestionsOpen, selectedSuggestion, value]);

  function handleInputChange(nextValue: string) {
    setSelectedSuggestion("");
    setIsSuggestionsOpen(true);
    onChange(id, nextValue);
  }

  function selectSuggestion(suggestion: string) {
    setSelectedSuggestion(suggestion);
    setIsSuggestionsOpen(false);
    onChange(id, suggestion);
  }

  function useCurrentLocation() {
    setSelectedSuggestion(currentLocationLabel);
    setIsSuggestionsOpen(false);
    onChange(id, currentLocationLabel);
  }

  return (
    <div className="address-search">
      <label htmlFor={id}>{label}</label>

      <div
        className={
          allowCurrentLocation
            ? "address-search__input-row"
            : "address-search__input-row address-search__input-row--single"
        }
      >
        <input
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(event) => handleInputChange(event.target.value)}
          autoComplete="off"
        />
        {allowCurrentLocation && (
          <button type="button" onClick={useCurrentLocation}>
            Localização atual
          </button>
        )}
      </div>

      {filteredSuggestions.length > 0 && (
        <div className="address-search__suggestions">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TripPointsPage({ tripData, onBack }: TripPointsPageProps) {
  const [pointsData, setPointsData] = useState<TripPointsFormData>({
    originPoint: "",
    destinationPoint: "",
  });

  function updateField(field: keyof TripPointsFormData, value: string) {
    setPointsData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    console.log("Dados completos da viagem:", {
      ...tripData,
      ...pointsData,
    });
  }

  return (
    <main className="trip-points-page">
      <section className="trip-points-shell" aria-labelledby="trip-points-title">
        <div className="trip-points-copy">
          <img
            className="trip-points-copy__logo"
            src={izilineLogo}
            alt="Iziline"
          />
        </div>

        <form className="trip-points-form" onSubmit={handleSubmit}>
          <header className="trip-points-form__header">
            <h1 id="trip-points-title">Selecionar pontos da viagem</h1>
          </header>

          <AddressSearch
            id="originPoint"
            label="Ponto de origem"
            placeholder="Digite o endereço de embarque"
            value={pointsData.originPoint}
            allowCurrentLocation
            onChange={updateField}
          />

          <AddressSearch
            id="destinationPoint"
            label="Ponto de destino"
            placeholder="Digite o endereço de desembarque"
            value={pointsData.destinationPoint}
            onChange={updateField}
          />

          <div className="trip-summary">
            <strong>Resumo</strong>
            <span>
              {tripData.origin || "Origem"} até {tripData.destination || "destino"}
            </span>
            <span>
              {tripData.date || "Data"} às {tripData.time || "horário"} · {tripData.availableSeats} vaga
              {tripData.availableSeats > 1 ? "s" : ""}
            </span>
          </div>

          <div className="trip-points-form__actions">
            <button
              className="button button--secondary"
              type="button"
              onClick={onBack}
            >
              Voltar
            </button>
            <button className="button button--primary" type="submit">
              Finalizar cadastro
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}