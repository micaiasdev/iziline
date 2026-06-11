import type {
  CreateTripInput,
  CreateTripPayload,
  TripResponse
} from '../../types/trip'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export function buildDepartureAt(date: string, time: string): string {
  const departureAt = new Date(`${date}T${time}`)

  if (Number.isNaN(departureAt.getTime())) {
    throw new ApiError('Data ou horario da viagem invalidos.', 0)
  }

  return departureAt.toISOString()
}

export async function createTrip(
  input: CreateTripInput
): Promise<TripResponse> {
  const payload = buildCreateTripPayload(input)

  return {
    id: Date.now(),
    driver_name: 'Motorista',
    origin: payload.origin,
    destination: payload.destination,
    departure_at: payload.departure_at,
    seats_available: payload.seats_available,
    price: '0.00',
    is_cancelled: false
  }
}

function buildCreateTripPayload(input: CreateTripInput): CreateTripPayload {
  return {
    origin: input.origin.trim(),
    destination: input.destination.trim(),
    departure_at: buildDepartureAt(input.date, input.time),
    seats_available: input.availableSeats
  }
}

