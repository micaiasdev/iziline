import type {
  MyTripItem,
  TripDetail,
  TripFareOverview,
  TripListItem,
} from "../../../types/trip";
import { apiClient } from "../../../app/services/apiClient";
import { buildApiError } from "../../../app/services/apiError";
import { listMockDriverTrips, getMockDriverTrip } from "../mocks/driver-trips.mock";
import { getMockBookingRequests } from "../mocks/booking-requests.mock";
import { listBookingRequests } from "./tripRequestsService";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export type DriverTripSummary = TripDetail & { pendingRequestsCount: number };

export async function listMyTrips(): Promise<MyTripItem[]> {
  if (USE_MOCK) {
    return listMockDriverTrips().map((trip) => ({
      role: "driver",
      trip: toTripListItem(trip),
    }));
  }

  try {
    const { data } = await apiClient.get<MyTripItem[]>("/api/trips/mine/");
    return data;
  } catch (error) {
    throw buildApiError(error, "N\u00e3o foi poss\u00edvel carregar suas viagens.");
  }
}

function toTripListItem(trip: TripDetail): TripListItem {
  return {
    id: trip.id,
    origin_city: trip.origin_city,
    destine_city: trip.destine_city,
    departure_time: trip.departure_time,
    available_spots: trip.available_spots,
    status: trip.status,
    total_distance_km: trip.total_distance_km,
    total_duration_min: trip.total_duration_min,
    cost: trip.cost,
  };
}

// Resumo legado de viagens do motorista. A aba "Viagens" usa listMyTrips,
// mas esta funcao segue disponivel para fluxos que dependem de pendencias.
export async function listDriverTrips(): Promise<DriverTripSummary[]> {
  if (USE_MOCK) {
    return listMockDriverTrips().map((trip) => ({
      ...trip,
      pendingRequestsCount: getMockBookingRequests(trip.id, "pending").length,
    }));
  }

  throw buildApiError(
    new Error("driver trips endpoint not implemented"),
    "Listar viagens do motorista ainda não é suportado pelo backend."
  );
}

// 3b. Detalhe da viagem — GET /api/trips/<trip_id>/
export async function getTripDetail(tripId: number): Promise<DriverTripSummary> {
  if (USE_MOCK) {
    const trip = getMockDriverTrip(tripId);
    if (!trip) {
      throw new Error(`Viagem mock ${tripId} não encontrada.`);
    }
    return {
      ...trip,
      pendingRequestsCount: getMockBookingRequests(tripId, "pending").length,
    };
  }

  try {
    const { data } = await apiClient.get<TripDetail>(`/api/trips/${tripId}/`);
    const pendingRequests = await listBookingRequests(tripId, "pending");
    return { ...data, pendingRequestsCount: pendingRequests.length };
  } catch (error) {
    throw buildApiError(error, "Não foi possível carregar os dados da viagem.");
  }
}

export async function getTripFareOverview(tripId: number): Promise<TripFareOverview> {
  if (USE_MOCK) {
    const trip = getMockDriverTrip(tripId);
    if (!trip) {
      throw new Error(`Viagem mock ${tripId} não encontrada.`);
    }
    const totalCost = trip.cost?.total_cost ?? trip.total_distance_km.toFixed(2);
    return {
      trip_id: trip.id,
      total_cost: totalCost,
      covered_amount: "0.00",
      driver_amount: totalCost,
      confirmed_passengers: 0,
      split: [],
    };
  }

  try {
    const { data } = await apiClient.get<TripFareOverview>(
      `/api/trips/${tripId}/fare-split/`
    );
    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível carregar o rateio da viagem.");
  }
}
