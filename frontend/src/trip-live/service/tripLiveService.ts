// Service da viagem em andamento (mock + real), consumindo os endpoints que já
// existem no backend:
//   POST /api/trips/<id>/start/    -> inicia a viagem (motorista)
//   POST /api/trips/<id>/finish/   -> finaliza a viagem (motorista)
//   GET  /api/trips/<id>/location/ -> posição do motorista (participantes)
//   POST /api/trips/<id>/location/ -> atualiza a posição (motorista)

import { apiClient } from "../../app/services/apiClient";
import { buildApiError } from "../../app/services/apiError";
import {
  markFinished,
  markStarted,
  primeRoute,
  simulateLocation,
} from "../mocks/tripLive.mock";
import type { DriverLocation } from "../../types/tripLive";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

function mockDelay(ms = 220): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Informa a rota ao simulador (no-op no modo real).
export function primeSimulatedRoute(tripId: number, coordinates: [number, number][]): void {
  if (USE_MOCK) {
    primeRoute(tripId, coordinates);
  }
}

export async function startTrip(tripId: number): Promise<void> {
  if (USE_MOCK) {
    await mockDelay();
    markStarted(tripId);
    return;
  }
  try {
    await apiClient.post(`/api/trips/${tripId}/start/`);
  } catch (error) {
    throw buildApiError(error, "Não foi possível iniciar a viagem.");
  }
}

export async function finishTrip(tripId: number): Promise<void> {
  if (USE_MOCK) {
    await mockDelay();
    markFinished(tripId);
    return;
  }
  try {
    await apiClient.post(`/api/trips/${tripId}/finish/`);
  } catch (error) {
    throw buildApiError(error, "Não foi possível finalizar a viagem.");
  }
}

export async function getDriverLocation(tripId: number): Promise<DriverLocation> {
  if (USE_MOCK) {
    return simulateLocation(tripId);
  }
  try {
    const { data } = await apiClient.get<DriverLocation>(`/api/trips/${tripId}/location/`);
    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível obter a localização do motorista.");
  }
}

export async function postDriverLocation(
  tripId: number,
  latitude: number,
  longitude: number
): Promise<DriverLocation> {
  if (USE_MOCK) {
    return {
      trip_id: tripId,
      latitude,
      longitude,
      updated_at: new Date().toISOString(),
    };
  }
  try {
    const { data } = await apiClient.post<DriverLocation>(
      `/api/trips/${tripId}/location/`,
      { latitude, longitude }
    );
    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível enviar sua localização.");
  }
}
