import type { TripDetail } from "../../types/trip";

// Estado em memória das viagens do motorista nesta sessão (não há endpoint
// "minhas viagens" no contrato — ver Pendências do backend). Começa vazio;
// cada viagem criada via createTrip() entra aqui.
const driverTrips: TripDetail[] = [];

export function registerMockDriverTrip(trip: TripDetail): void {
  driverTrips.unshift(trip);
}

export function listMockDriverTrips(): TripDetail[] {
  return [...driverTrips];
}

export function getMockDriverTrip(tripId: number): TripDetail | undefined {
  return driverTrips.find((trip) => trip.id === tripId);
}
