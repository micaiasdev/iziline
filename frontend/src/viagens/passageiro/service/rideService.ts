import { apiClient } from "../../../app/services/apiClient";
import { ApiError, buildApiError } from "../../../app/services/apiError";
import type { TripDetail, TripFareQuote, TripListItem, TripStop } from "../../../types/trip";
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

export async function getTripFareQuote(
  tripId: number,
  pickupStopId: number,
  dropoffStopId: number
): Promise<TripFareQuote> {
  try {
    if (USE_MOCK) {
      await mockDelay();
      const trip = getMockTripDetail(tripId);
      if (!trip) {
        throw new ApiError("Viagem não encontrada.", 404);
      }
      return buildMockFareQuote(trip, pickupStopId, dropoffStopId);
    }

    const { data } = await apiClient.get<TripFareQuote>(
      `/api/trips/${tripId}/fare-quote/`,
      {
        params: {
          pickup_stop_id: pickupStopId,
          dropoff_stop_id: dropoffStopId,
        },
      }
    );
    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível calcular o valor da reserva.");
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

function buildMockFareQuote(
  trip: TripDetail,
  pickupStopId: number,
  dropoffStopId: number
): TripFareQuote {
  const stops = [...trip.stops].sort((a, b) => a.order - b.order);
  const pickupStop = stops.find((stop) => stop.id === pickupStopId);
  const dropoffStop = stops.find((stop) => stop.id === dropoffStopId);

  if (!pickupStop || !dropoffStop || pickupStop.order >= dropoffStop.order) {
    throw new ApiError("O ponto de embarque precisa vir antes do ponto de desembarque.", 400);
  }

  const totalCost = Number(trip.cost?.total_cost ?? trip.total_distance_km);
  const selectedDistance = estimateStopsDistance(stops, pickupStop.order, dropoffStop.order);
  const totalDistance = Math.max(estimateStopsDistance(stops, stops[0].order, stops[stops.length - 1].order), 1);
  const estimatedAmount = (totalCost * (selectedDistance / totalDistance)) / 2;

  return {
    trip_id: trip.id,
    pickup_stop_id: pickupStopId,
    dropoff_stop_id: dropoffStopId,
    estimated_amount: estimatedAmount.toFixed(2),
    total_cost: totalCost.toFixed(2),
    current_confirmed_passengers: 0,
  };
}

function estimateStopsDistance(stops: TripStop[], startOrder: number, endOrder: number): number {
  let total = 0;
  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1];
    const current = stops[index];
    if (previous.order >= startOrder && current.order <= endOrder) {
      total += haversineKm(
        [previous.location.longitude, previous.location.latitude],
        [current.location.longitude, current.location.latitude]
      );
    }
  }
  return total;
}

function haversineKm(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
