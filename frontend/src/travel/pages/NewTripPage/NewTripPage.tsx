import { useState } from "react";
import { FormField } from "../../../components/FormField/FormField";
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

type NewTripFormErrors = Partial<Record<keyof NewTripFormData | "departure", string>>;

type NewTripPageProps = {
  onContinue: (tripData: NewTripFormData) => void;
};

export function NewTripPage({ onContinue }: NewTripPageProps) {
  const [formData, setFormData] = useState<NewTripFormData>(initialFormData);
  const [errors, setErrors] = useState<NewTripFormErrors>({});

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const normalizedTripData: NewTripFormData = {
      ...formData,
      origin: formData.origin.trim(),
      destination: formData.destination.trim(),
    };

    console.log("Dados da nova viagem:", normalizedTripData);
    onContinue(normalizedTripData);
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
            <FormField
              id="origin"
              label="Endereço de origem"
              type="text"
              placeholder="Ex: Teresina"
              value={formData.origin}
              error={errors.origin}
              onChange={(event) => updateField("origin", event.target.value)}
            />

            <FormField
              id="destination"
              label="Endereço de destino"
              type="text"
              placeholder="Ex: Floriano"
              value={formData.destination}
              error={errors.destination}
              onChange={(event) =>
                updateField("destination", event.target.value)
              }
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
            <button className="button button--primary" type="submit">
              Cadastrar viagem
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}