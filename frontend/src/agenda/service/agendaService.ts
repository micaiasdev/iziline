import type { AgendaTrip, AgendaWhen, PaginatedResponse } from "../../types/agenda";
import { apiClient } from "../../app/services/apiClient";
import { buildApiError } from "../../app/services/apiError";

export async function getUserAgenda(when: AgendaWhen): Promise<AgendaTrip[]> {
  try {
    const response = await apiClient.get<PaginatedResponse<AgendaTrip>>(
      "/api/bookings/my-trips/",
      { params: { when } }
    );
    return response.data.results;
  } catch (error) {
    throw buildApiError(error, "Não foi possível carregar suas viagens.");
  }
}

export async function cancelTrip(tripId: number): Promise<AgendaTrip> {
  try {
    const response = await apiClient.patch<AgendaTrip>(
      `/api/trips/${tripId}/cancel/`
    );
    return response.data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível cancelar essa viagem.");
  }
}
