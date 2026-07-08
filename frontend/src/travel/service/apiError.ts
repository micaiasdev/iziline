import { isAxiosError } from "axios";

// Erro de aplicação normalizado. Toda a camada de service lança ApiError,
// nunca o erro cru do axios, para que as telas tratem de forma uniforme.
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// Traduz um erro (axios ou não) para ApiError com mensagem amigável em pt-BR.
// Mapeia o formato DRF: 403 -> {detail}, 400 -> {campo: [msg]}.
export function buildApiError(
  error: unknown,
  fallbackMessage: string
): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;

    if (data && typeof data === "object") {
      const detail = (data as { detail?: unknown }).detail;
      if (typeof detail === "string") {
        return new ApiError(detail, status);
      }

      const fieldErrors = extractFieldErrors(data as Record<string, unknown>);
      if (fieldErrors) {
        const firstMessage = Object.values(fieldErrors)[0]?.[0];
        return new ApiError(firstMessage ?? fallbackMessage, status, fieldErrors);
      }
    }

    return new ApiError(fallbackMessage, status);
  }

  return new ApiError(fallbackMessage, 0);
}

function extractFieldErrors(
  data: Record<string, unknown>
): Record<string, string[]> | null {
  const result: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      result[key] = value as string[];
    } else if (typeof value === "string") {
      result[key] = [value];
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}
