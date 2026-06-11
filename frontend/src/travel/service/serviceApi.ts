import axios from 'axios'

import { apiClient } from './apiClient'
import type {
  CreateTripInput,
  CreateTripPayload,
  TripResponse
} from '../../types/trip'

const TRIPS_ENDPOINT = '/api/trips/'

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

  try {
    const response = await apiClient.post<TripResponse>(TRIPS_ENDPOINT, payload)

    return response.data
  } catch (error) {
    throw toApiError(error)
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

function getErrorMessage(status: number): string {
  if (status === 401) {
    return 'E necessario estar autenticado para cadastrar uma viagem.'
  }

  if (status === 400) {
    return 'Nao foi possivel cadastrar a viagem com os dados informados.'
  }

  return 'Nao foi possivel cadastrar a viagem.'
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0

    return new ApiError(getErrorMessage(status), status, error.response?.data)
  }

  return new ApiError('Nao foi possivel cadastrar a viagem.', 0, error)
}
