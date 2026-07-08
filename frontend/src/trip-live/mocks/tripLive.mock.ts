// Estado em memória para a viagem em andamento no modo mock. Guarda a rota de
// cada viagem (para simular o deslocamento) e o instante em que a simulação
// começou, além de um "override" de status (iniciada/finalizada nesta sessão).

import { fractionForElapsed, pointAlongRoute } from "../simulation";
import type { DriverLocation } from "../../types/tripLive";

const routes = new Map<number, [number, number][]>();
const startedAt = new Map<number, number>();
const finished = new Set<number>();

// A tela informa a rota (line_trip) assim que carrega o detalhe da viagem.
export function primeRoute(tripId: number, coordinates: [number, number][]): void {
  if (coordinates.length > 0) {
    routes.set(tripId, coordinates);
  }
}

export function markStarted(tripId: number): void {
  if (!startedAt.has(tripId)) {
    startedAt.set(tripId, Date.now());
  }
  finished.delete(tripId);
}

export function markFinished(tripId: number): void {
  finished.add(tripId);
}

// Posição simulada: o marcador avança ao longo da rota conforme o tempo. O
// relógio começa na primeira leitura, então um passageiro que abre a tela já
// vê o deslocamento sem depender de o motorista estar postando.
export function simulateLocation(tripId: number): DriverLocation {
  let started = startedAt.get(tripId);
  if (started == null) {
    started = Date.now();
    startedAt.set(tripId, started);
  }

  const coordinates = routes.get(tripId) ?? [];
  const fraction = fractionForElapsed(Date.now() - started);
  const point = pointAlongRoute(coordinates, fraction);

  return {
    trip_id: tripId,
    latitude: point.lat,
    longitude: point.lng,
    updated_at: new Date().toISOString(),
  };
}
