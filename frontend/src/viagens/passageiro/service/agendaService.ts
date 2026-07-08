import { apiClient } from "../../../app/services/apiClient";
import { ApiError, buildApiError } from "../../../app/services/apiError";
import type { PassengerBooking } from "../../../types/trip";
import {
  cancelMockPassengerBooking,
  listMockPassengerBookings,
} from "../mocks/bookings.mock";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export async function listMyBookings(): Promise<PassengerBooking[]> {
  try {
    if (USE_MOCK) {
      await mockDelay();
      return listMockPassengerBookings();
    }

    const { data } = await apiClient.get<PassengerBooking[]>(
      "/api/bookings/mine/"
    );

    return [...data].sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch (error) {
    throw buildApiError(error, "Não foi possível carregar suas reservas.");
  }
}

export async function cancelBooking(
  bookingId: number
): Promise<PassengerBooking> {
  try {
    if (USE_MOCK) {
      await mockDelay();
      return cancelMockPassengerBooking(bookingId);
    }

    const { data } = await apiClient.post<PassengerBooking>(
      `/api/bookings/${bookingId}/cancel/`
    );
    return data;
  } catch (error) {
    if (USE_MOCK && error instanceof Error) {
      throw new ApiError(error.message, 400);
    }

    throw buildApiError(error, "Não foi possível cancelar esta reserva.");
  }
}

function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 240));
}
