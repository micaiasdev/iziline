import type { TripDetail } from "../../types/trip";
import { apiClient } from "../../app/services/apiClient";
import { buildApiError } from "../../app/services/apiError";
import { listMockDriverTrips, getMockDriverTrip } from "../mocks/driver-trips.mock";
import { getMockBookingRequests } from "../mocks/booking-requests.mock";
import { listBookingRequests } from "./tripRequestsService";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export type DriverTripSummary = TripDetail & { pendingRequestsCount: number };

// Lista as viagens do motorista logado. Pendência conhecida do backend: o
// contrato (api-contract-trip.md) não tem um endpoint "minhas viagens" — no
// modo mock, refletimos as viagens criadas nesta sessão (ver driver-trips.mock).
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
