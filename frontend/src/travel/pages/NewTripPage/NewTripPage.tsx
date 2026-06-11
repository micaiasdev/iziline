import { useEffect, useState } from "react";
import { FormField } from "../../../components/FormField/FormField";
import { getPossibleAddresses } from "../../service/locationService";
import { createTrip } from "../../service/serviceApi";
import type { NewTripFormData } from "../../../types/trip";
import izilineLogo from "../../../assets/iziline.png";
import "./NewTripPage.css";

const initialFormData: NewTripFormData = {
  origin: "",
  destination: "",
  date: "",
  time: "",
  availableSeats: 1,
};

const currentLocationLabel = "Minha localização atual";
const lastCreatedTripStorageKey = "iziline:lastCreatedTrip";

type AddressFieldName = "origin" | "destination";
type NewTripFormErrors = Partial<Record<keyof NewTripFormData | "departure", string>>;
type NewTripStage = "form" | "costDetails";

type AddressSearchProps = {
  id: AddressFieldName;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  allowCurrentLocation?: boolean;
  onChange: (field: AddressFieldName, value: string) => void;
};

function AddressSearch({
  id,
  label,
  placeholder,
  value,
  error,
  allowCurrentLocation = false,
  onChange,
}: AddressSearchProps) {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (
      !isSuggestionsOpen ||
      value === selectedSuggestion ||
      value === currentLocationLabel
    ) {
      return;
    }

    let shouldIgnore = false;

    async function loadSuggestions() {
      const suggestions = await getPossibleAddresses(value);

      if (!shouldIgnore) {
        setFilteredSuggestions(suggestions);
      }
    }

    void loadSuggestions();

    return () => {
      shouldIgnore = true;
    };
  }, [isSuggestionsOpen, selectedSuggestion, value]);

  const suggestionsToShow =
    isSuggestionsOpen &&
    value !== selectedSuggestion &&
    value !== currentLocationLabel
      ? filteredSuggestions
      : [];

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
    if (!navigator.geolocation) {
      onChange(id, currentLocationLabel);
      setSelectedSuggestion(currentLocationLabel);
      setIsSuggestionsOpen(false);
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(5);
        const longitude = position.coords.longitude.toFixed(5);
        const currentLocation = `${currentLocationLabel} (${latitude}, ${longitude})`;

        onChange(id, currentLocation);
        setSelectedSuggestion(currentLocation);
        setIsSuggestionsOpen(false);
        setIsLocating(false);
      },
      () => {
        onChange(id, currentLocationLabel);
        setSelectedSuggestion(currentLocationLabel);
        setIsSuggestionsOpen(false);
        setIsLocating(false);
      }
    );
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
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => handleInputChange(event.target.value)}
          autoComplete="off"
        />

        {allowCurrentLocation && (
          <button type="button" onClick={useCurrentLocation}>
            {isLocating ? "Localizando..." : "Localização atual"}
          </button>
        )}
      </div>

      {error && (
        <span className="address-search__error" id={`${id}-error`}>
          {error}
        </span>
      )}

      {suggestionsToShow.length > 0 && (
        <div className="address-search__suggestions">
          {suggestionsToShow.map((suggestion) => (
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

export function NewTripPage() {
  const [formData, setFormData] = useState<NewTripFormData>(initialFormData);
  const [errors, setErrors] = useState<NewTripFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<NewTripStage>("form");

  function updateField<Field extends keyof NewTripFormData>(
    field: Field,
    value: NewTripFormData[Field]
  ) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
      departure: field === "date" || field === "time" ? undefined : currentErrors.departure,
    }));
  }

  function updateAddressField(field: AddressFieldName, value: string) {
    updateField(field, value);
  }

  function decreaseSeats() {
    setFormData((currentData) => ({
      ...currentData,
      availableSeats: Math.max(1, currentData.availableSeats - 1),
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      availableSeats: undefined,
    }));
  }

  function increaseSeats() {
    setFormData((currentData) => ({
      ...currentData,
      availableSeats: Math.min(8, currentData.availableSeats + 1),
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      availableSeats: undefined,
    }));
  }

  function validateForm() {
    const nextErrors: NewTripFormErrors = {};

    if (!formData.origin.trim()) {
      nextErrors.origin = "Preencha o endereço de origem.";
    }

    if (!formData.destination.trim()) {
      nextErrors.destination = "Preencha o endereço de destino.";
    }

    if (!formData.date) {
      nextErrors.date = "Preencha a data da viagem.";
    }

    if (!formData.time) {
      nextErrors.time = "Preencha o horário de saída.";
    }

    if (!formData.availableSeats || formData.availableSeats < 1) {
      nextErrors.availableSeats = "Informe pelo menos 1 vaga disponível.";
    }

    if (formData.date && formData.time) {
      const departureDate = new Date(`${formData.date}T${formData.time}`);

      if (departureDate <= new Date()) {
        nextErrors.departure = "A data e o horário precisam ser futuros.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const normalizedTripData: NewTripFormData = {
      ...formData,
      origin: formData.origin.trim(),
      destination: formData.destination.trim(),
    };

    setIsSubmitting(true);

    try {
      const createdTrip = await createTrip(normalizedTripData);

      window.sessionStorage.setItem(
        lastCreatedTripStorageKey,
        JSON.stringify(createdTrip)
      );
      setStage("costDetails");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (stage === "costDetails") {
    return null;
  }

  return (
    <main className="new-trip-page">
      <section className="new-trip-shell" aria-labelledby="new-trip-title">
        <div className="new-trip-copy">
          <img
            className="new-trip-copy__logo"
            src={izilineLogo}
            alt="Iziline"
          />
        </div>

        <form className="new-trip-form" onSubmit={handleSubmit} noValidate>
          <header className="new-trip-form__header">
            <h1 id="new-trip-title">Cadastrar nova viagem</h1>
          </header>

          <div className="new-trip-form__group">
            <AddressSearch
              id="origin"
              label="Endereço de origem"
              placeholder="Ex: Terminal Rodoviário Lucídio Portella"
              value={formData.origin}
              error={errors.origin}
              allowCurrentLocation
              onChange={updateAddressField}
            />

            <AddressSearch
              id="destination"
              label="Endereço de destino"
              placeholder="Ex: Terminal Rodoviário de Floriano"
              value={formData.destination}
              error={errors.destination}
              onChange={updateAddressField}
            />
          </div>

          <div className="new-trip-form__grid">
            <FormField
              id="date"
              label="Data da viagem"
              type="date"
              value={formData.date}
              error={errors.date}
              onChange={(event) => updateField("date", event.target.value)}
            />

            <FormField
              id="time"
              label="Horário de saída"
              type="time"
              value={formData.time}
              error={errors.time}
              onChange={(event) => updateField("time", event.target.value)}
            />
          </div>

          {errors.departure && (
            <span className="new-trip-form__error">{errors.departure}</span>
          )}

          <div className="seats-field">
            <div>
              <label htmlFor="availableSeats">Vagas disponíveis</label>
              <p>Escolha quantas pessoas podem viajar com você.</p>
              {errors.availableSeats && (
                <span className="seats-field__error">{errors.availableSeats}</span>
              )}
            </div>

            <div className="seats-control">
              <button
                type="button"
                onClick={decreaseSeats}
                aria-label="Diminuir vagas"
              >
                -
              </button>
              <input
                id="availableSeats"
                type="number"
                min="1"
                max="8"
                value={formData.availableSeats}
                aria-invalid={Boolean(errors.availableSeats)}
                onChange={(event) =>
                  updateField("availableSeats", Number(event.target.value))
                }
              />
              <button
                type="button"
                onClick={increaseSeats}
                aria-label="Aumentar vagas"
              >
                +
              </button>
            </div>
          </div>

          <div className="new-trip-form__actions">
            <button className="button button--secondary" type="button">
              Cancelar
            </button>
            <button
              className="button button--primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Cadastrando..." : "Cadastrar viagem"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
