import { apiClient } from "../../../app/services/apiClient";
import { ApiError, buildApiError } from "../../../app/services/apiError";
import type { CreateBookingPayload, PassengerBooking } from "../../../types/trip";
import { createMockPassengerBooking } from "../mocks/bookings.mock";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export type CreateBookingInput = {
  tripId: number;
  pickupStopId: number;
  dropoffStopId: number;
};

export async function createBooking(
  input: CreateBookingInput
): Promise<PassengerBooking> {
  const payload = toPayload(input);

  try {
    if (USE_MOCK) {
      await mockDelay();
      return createMockPassengerBooking(payload);
    }

    const { data } = await apiClient.post<PassengerBooking>(
      "/api/bookings/",
      payload
    );
    return data;
  } catch (error) {
    if (USE_MOCK && error instanceof Error) {
      throw new ApiError(error.message, 400);
    }

    throw buildApiError(error, "Não foi possível solicitar sua reserva.");
  }
}

function toPayload(input: CreateBookingInput): CreateBookingPayload {
  return {
    trip_id: input.tripId,
    pickup_stop_id: input.pickupStopId,
    dropoff_stop_id: input.dropoffStopId,
  };
}

function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 240));
}
