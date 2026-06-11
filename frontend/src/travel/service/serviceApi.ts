import { isAxiosError } from 'axios'

import type {
  CreateTripInput,
  CreateTripPayload,
  TripResponse
} from '../../types/trip'
import { apiClient } from './apiClient'

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
    const response = await apiClient.post<TripResponse>('/api/trips/', payload)
    return response.data
  } catch (error) {
    throw buildApiError(error, 'Nao foi possivel cadastrar a viagem.')
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

function buildApiError(error: unknown, fallbackMessage: string): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (isAxiosError(error)) {
    return new ApiError(
      getApiErrorMessage(error.response?.data) ?? fallbackMessage,
      error.response?.status ?? 0,
      error.response?.data
    )
  }

  return new ApiError(fallbackMessage, 0, error)
}

function getApiErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined
  }

  if ('detail' in body && typeof body.detail === 'string') {
    return body.detail
  }

  return undefined
}

