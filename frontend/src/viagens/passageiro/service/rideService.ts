import { apiClient } from "../../../app/services/apiClient";
import { ApiError, buildApiError } from "../../../app/services/apiError";
import type { TripDetail, TripListItem } from "../../../types/trip";
import { getMockTripDetail, searchMockTrips } from "../mocks/trips.mock";
import type { RideSearchFilters } from "../types/ride";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export async function searchTrips(
  filters: RideSearchFilters
): Promise<TripListItem[]> {
  try {
    if (USE_MOCK) {
      await mockDelay();
      return searchMockTrips(filters);
    }

    const { data } = await apiClient.get<TripListItem[]>("/api/trips/search/", {
      params: buildTripSearchParams(filters),
    });

    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível buscar viagens.");
  }
}

export async function getTripDetail(tripId: number): Promise<TripDetail> {
  try {
    if (USE_MOCK) {
      await mockDelay();
      const trip = getMockTripDetail(tripId);
      if (!trip) {
        throw new ApiError("Viagem não encontrada.", 404);
      }
      return trip;
    }

    const { data } = await apiClient.get<TripDetail>(`/api/trips/${tripId}/`);
    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível carregar os detalhes da viagem.");
  }
}

function buildTripSearchParams(filters: RideSearchFilters) {
  return {
    origin_city_id: filters.originCity?.id,
    destine_city_id: filters.destineCity?.id,
    ...(filters.dateStart
      ? { date_start: toDateTimeParam(filters.dateStart, "start") }
      : {}),
    ...(filters.dateEnd
      ? { date_end: toDateTimeParam(filters.dateEnd, "end") }
      : {}),
  };
}

function toDateTimeParam(value: string, boundary: "start" | "end") {
  const time = boundary === "start" ? "00:00:00" : "23:59:59";
  return new Date(`${value}T${time}`).toISOString();
}

function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 240));
}
