import { isAxiosError } from 'axios'

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

export function buildApiError(error: unknown, fallbackMessage: string): ApiError {
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
