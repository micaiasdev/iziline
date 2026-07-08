import type { Booking } from "../../../types/booking";
import { apiClient } from "../../../app/services/apiClient";
import { buildApiError } from "../../../app/services/apiError";

export async function createBooking(tripId: number): Promise<Booking> {
  try {
    const response = await apiClient.post<Booking>("/api/bookings/", {
      trip: tripId,
    });
    return response.data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível reservar essa carona.");
  }
}
