import { useState } from 'react'
import type { FormEvent } from 'react'

type TravelFormData = {
  origin: string
  destination: string
  date: string
}

const initialFormData: TravelFormData = {
  origin: '',
  destination: '',
  date: '',
}

function TravelFormPage() {
  const [formData, setFormData] = useState(initialFormData)
  const [submittedTrip, setSubmittedTrip] = useState<TravelFormData | null>(
    null,
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedTrip(formData)
    setFormData(initialFormData)
  }

  return (
    <main className="travel-page">
      <form className="travel-form" onSubmit={handleSubmit}>
        <div className="form-header">
          <span className="form-kicker">Cadastro de viagens</span>
          <h1>Nova viagem</h1>
        </div>

        <label htmlFor="origin">
          Origem
          <input
            id="origin"
            name="origin"
            type="text"
            placeholder="Ex.: Sao Paulo"
            value={formData.origin}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                origin: event.target.value,
              }))
            }
            required
          />
        </label>

        <label htmlFor="destination">
          Destino
          <input
            id="destination"
            name="destination"
            type="text"
            placeholder="Ex.: Rio de Janeiro"
            value={formData.destination}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                destination: event.target.value,
              }))
            }
            required
          />
        </label>

        <label htmlFor="date">
          Data
          <input
            id="date"
            name="date"
            type="date"
            value={formData.date}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                date: event.target.value,
              }))
            }
            required
          />
        </label>

        <button type="submit">Cadastrar viagem</button>

        {submittedTrip && (
          <p className="success-message" role="status">
            Viagem cadastrada: {submittedTrip.origin} para{' '}
            {submittedTrip.destination}.
          </p>
        )}
      </form>
    </main>
  )
}

export default TravelFormPage
