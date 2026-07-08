import type { Booking } from "../../types/booking";
import { apiClient } from "../../travel/service/apiClient";
import { buildApiError } from "../../travel/service/apiError";

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
