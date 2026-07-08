import type { TripStop } from "../../types/trip";

export type RoutePoint = {
  role: "Origem" | "Parada" | "Destino";
  cityLabel: string;
  addressLabel: string;
};

// Deriva os pontos de rota a partir das stops já persistidas (TripDetail.stops).
export function tripStopsToRoutePoints(stops: TripStop[]): RoutePoint[] {
  return stops.map((stop, index) => ({
    role:
      index === 0 ? "Origem" : index === stops.length - 1 ? "Destino" : "Parada",
    cityLabel: `${stop.location.city.name}-${stop.location.city.state}`,
    addressLabel: stop.location.name,
  }));
}
