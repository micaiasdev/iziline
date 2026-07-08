import type { Booking, BookingStatus } from "../../types/trip";
import { apiClient } from "../../app/services/apiClient";
import { buildApiError } from "../../app/services/apiError";
import {
  getMockBookingRequests,
  updateMockBookingStatus,
} from "../mocks/booking-requests.mock";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// 4a. Listar requests — GET /api/trips/<trip_id>/booking-requests/?status=
export async function listBookingRequests(
  tripId: number,
  status: BookingStatus | "all" = "pending"
): Promise<Booking[]> {
  if (USE_MOCK) {
    return getMockBookingRequests(tripId, status);
  }

  try {
    const { data } = await apiClient.get<Booking[]>(
      `/api/trips/${tripId}/booking-requests/`,
      { params: { status } }
    );
    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível carregar as solicitações.");
  }
}

// 4b. Aceitar request — POST /api/bookings/<id>/accept/
export async function acceptRequest(bookingId: number): Promise<Booking> {
  if (USE_MOCK) {
    return updateMockBookingStatus(bookingId, "confirmed");
  }

  try {
    const { data } = await apiClient.post<Booking>(
      `/api/bookings/${bookingId}/accept/`
    );
    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível aceitar essa solicitação.");
  }
}

// 4c. Recusar request — POST /api/bookings/<id>/reject/
export async function rejectRequest(bookingId: number): Promise<Booking> {
  if (USE_MOCK) {
    return updateMockBookingStatus(bookingId, "rejected");
  }

  try {
    const { data } = await apiClient.post<Booking>(
      `/api/bookings/${bookingId}/reject/`
    );
    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível recusar essa solicitação.");
  }
}
