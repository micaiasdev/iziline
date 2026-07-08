import type {
  City,
  CreateTripInput,
  CreateTripPayload,
  Location,
  TripDetail,
  TripStop,
} from "../../../types/trip";
import { mockLocationsByCity } from "../../../geo/mocks/locations.mock";

let nextTripId = 7001;
let nextStopId = 90001;

// Monta o TripDetail que o backend devolveria em POST /api/trips/,
// derivando stops ordenadas e um line_trip a partir dos pontos escolhidos.
export function buildCreatedTripMock(
  input: CreateTripInput,
  payload: CreateTripPayload
): TripDetail {
  const originLocation = findLocation(input.originLocationId);
  const destinationLocation = findLocation(input.destinationLocationId);
  const intermediateLocations = input.intermediateLocationIds
    .map((id) => findLocation(id))
    .filter((location): location is Location => Boolean(location));

  const orderedLocations: Location[] = [
    ...(originLocation ? [originLocation] : []),
    ...intermediateLocations,
    ...(destinationLocation ? [destinationLocation] : []),
  ];

  const stops: TripStop[] = orderedLocations.map((location, index) => ({
    id: nextStopId++,
    order: index,
    location,
  }));

  const coordinates = orderedLocations.map(
    (location) => [location.longitude, location.latitude] as [number, number]
  );
  const distanceKm = estimateDistanceKm(coordinates);
  const now = new Date().toISOString();

  return {
    id: nextTripId++,
    driver: 1,
    origin_city: originLocation?.city ?? fallbackCity(input.originCityId),
    destine_city: destinationLocation?.city ?? fallbackCity(input.destineCityId),
    departure_time: payload.departure_time,
    available_spots: input.availableSpots,
    available_seats: input.availableSpots,
    status: "open",
    line_trip:
      coordinates.length >= 2 ? { type: "LineString", coordinates } : null,
    total_distance_km: distanceKm,
    total_duration_min: Math.round((distanceKm / 80) * 60),
    stops,
    created_at: now,
    updated_at: now,
  };
}

function findLocation(id: number): Location | undefined {
  for (const locations of Object.values(mockLocationsByCity)) {
    const match = locations.find((location) => location.id === id);
    if (match) {
      return match;
    }
  }
  return undefined;
}

function fallbackCity(id: number): City {
  return { id, name: "Cidade", state: "" };
}

function estimateDistanceKm(coordinates: [number, number][]): number {
  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    total += haversineKm(coordinates[index - 1], coordinates[index]);
  }
  return Math.round(total * 10) / 10;
}

function haversineKm(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
