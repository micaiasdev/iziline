import type {
  CreateTripInput,
  CreateTripPayload,
  TripDetail,
} from "../../types/trip";
import { apiClient } from "./apiClient";
import { ApiError, buildApiError } from "./apiError";
import { buildCreatedTripMock } from "../mocks/trip.mock";

export { ApiError };

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export function buildDepartureTime(date: string, time: string): string {
  const departure = new Date(`${date}T${time}`);

  if (Number.isNaN(departure.getTime())) {
    throw new ApiError("Data ou horário da viagem inválidos.", 0);
  }

  return departure.toISOString();
}

// 1c. Criar viagem — POST /api/trips/
export async function createTrip(input: CreateTripInput): Promise<TripDetail> {
  const payload = buildCreateTripPayload(input);

  if (USE_MOCK) {
    await mockDelay();
    return buildCreatedTripMock(input, payload);
  }

  try {
    const { data } = await apiClient.post<TripDetail>("/api/trips/", payload);
    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível cadastrar a viagem.");
  }
}

function buildCreateTripPayload(input: CreateTripInput): CreateTripPayload {
  return {
    origin_city_id: input.originCityId,
    destine_city_id: input.destineCityId,
    departure_time: buildDepartureTime(input.date, input.time),
    available_spots: input.availableSpots,
    origin_location_id: input.originLocationId,
    destination_location_id: input.destinationLocationId,
    intermediate_location_ids: input.intermediateLocationIds,
  };
}

function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 420));
}
