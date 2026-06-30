import type { AgendaTrip, AgendaWhen, PaginatedResponse } from "../../types/agenda";
import { apiClient } from "../../travel/service/apiClient";
import { buildApiError } from "../../travel/service/apiError";

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
