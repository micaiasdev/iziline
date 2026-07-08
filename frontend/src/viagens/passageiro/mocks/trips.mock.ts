import type {
  LineString,
  Location,
  TripDetail,
  TripListItem,
  TripStop,
} from "../../../types/trip";
import { mockLocationsByCity } from "../../../geo/mocks/locations.mock";
import type { RideSearchFilters } from "../types/ride";

let nextStopId = 81001;

function cityLocation(cityId: number, index: number): Location {
  const location = mockLocationsByCity[cityId]?.[index];
  if (!location) {
    throw new Error(`Ponto mock não encontrado: cidade ${cityId}, índice ${index}`);
  }
  return location;
}

function futureIso(daysAhead: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function stopsFromLocations(locations: Location[]): TripStop[] {
  return locations.map((location, order) => ({
    id: nextStopId++,
    order,
    location,
  }));
}

function lineFromStops(stops: TripStop[]): LineString {
  return {
    type: "LineString",
    coordinates: stops.map((stop) => [
      stop.location.longitude,
      stop.location.latitude,
    ]),
  };
}

function createTrip(
  id: number,
  departureTime: string,
  availableSpots: number,
  locations: Location[],
  status: TripDetail["status"] = "open"
): TripDetail {
  const stops = stopsFromLocations(locations);
  const lineTrip = lineFromStops(stops);
  const distanceKm = estimateDistanceKm(lineTrip.coordinates);

  return {
    id,
    driver: 1,
    origin_city: stops[0].location.city,
    destine_city: stops[stops.length - 1].location.city,
    departure_time: departureTime,
    available_spots: availableSpots,
    available_seats: availableSpots,
    status,
    line_trip: lineTrip,
    total_distance_km: distanceKm,
    total_duration_min: Math.max(35, Math.round((distanceKm / 72) * 60)),
    stops,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

const tripDetails: TripDetail[] = [
  createTrip(1001, futureIso(1, 7, 30), 3, [
    cityLocation(1, 0),
    cityLocation(3, 0),
    cityLocation(2, 0),
  ]),
  createTrip(1002, futureIso(2, 13), 2, [
    cityLocation(1, 3),
    cityLocation(6, 0),
    cityLocation(5, 0),
  ]),
  createTrip(1003, futureIso(3, 8, 45), 1, [
    cityLocation(4, 0),
    cityLocation(7, 0),
    cityLocation(1, 1),
  ]),
  createTrip(
    1004,
    futureIso(1, 18),
    0,
    [cityLocation(8, 0), cityLocation(3, 1), cityLocation(1, 2)],
    "full"
  ),
  createTrip(1005, futureIso(5, 6, 15), 4, [
    cityLocation(1, 2),
    cityLocation(7, 0),
    cityLocation(4, 1),
  ]),
];

export const mockTrips: TripListItem[] = tripDetails.map(toTripListItem);

export function searchMockTrips(filters: RideSearchFilters): TripListItem[] {
  const originCityId = filters.originCity?.id;
  const destineCityId = filters.destineCity?.id;

  return tripDetails
    .filter((trip) => trip.status === "open")
    .filter((trip) =>
      originCityId ? trip.origin_city.id === originCityId : true
    )
    .filter((trip) =>
      destineCityId ? trip.destine_city.id === destineCityId : true
    )
    .filter((trip) => isWithinDateRange(trip.departure_time, filters))
    .sort((a, b) => a.departure_time.localeCompare(b.departure_time))
    .map(toTripListItem);
}

export function getMockTripDetail(tripId: number): TripDetail | null {
  const trip = tripDetails.find((item) => item.id === tripId);
  return trip ? cloneTripDetail(trip) : null;
}

export function findMockTripStop(
  tripId: number,
  stopId: number
): TripStop | null {
  const trip = tripDetails.find((item) => item.id === tripId);
  return trip?.stops.find((stop) => stop.id === stopId) ?? null;
}

export function decrementMockTripSeat(tripId: number): TripListItem | null {
  const trip = tripDetails.find((item) => item.id === tripId);
  if (!trip) {
    return null;
  }

  trip.available_spots = Math.max(0, trip.available_spots - 1);
  trip.available_seats = Math.max(0, trip.available_seats - 1);
  trip.status = trip.available_spots > 0 ? trip.status : "full";
  trip.updated_at = new Date().toISOString();

  return toTripListItem(trip);
}

export function incrementMockTripSeat(tripId: number): TripListItem | null {
  const trip = tripDetails.find((item) => item.id === tripId);
  if (!trip) {
    return null;
  }

  trip.available_spots += 1;
  trip.available_seats += 1;
  if (trip.status === "full") {
    trip.status = "open";
  }
  trip.updated_at = new Date().toISOString();

  return toTripListItem(trip);
}

export function toTripListItem(trip: TripDetail): TripListItem {
  return {
    id: trip.id,
    origin_city: trip.origin_city,
    destine_city: trip.destine_city,
    departure_time: trip.departure_time,
    available_spots: trip.available_spots,
    status: trip.status,
    total_distance_km: trip.total_distance_km,
    total_duration_min: trip.total_duration_min,
  };
}

function isWithinDateRange(
  departureTime: string,
  filters: RideSearchFilters
): boolean {
  const departure = new Date(departureTime).getTime();
  const start = filters.dateStart
    ? new Date(`${filters.dateStart}T00:00:00`).getTime()
    : null;
  const end = filters.dateEnd
    ? new Date(`${filters.dateEnd}T23:59:59`).getTime()
    : null;

  if (start !== null && departure < start) {
    return false;
  }

  if (end !== null && departure > end) {
    return false;
  }

  return true;
}

function cloneTripDetail(trip: TripDetail): TripDetail {
  return {
    ...trip,
    origin_city: { ...trip.origin_city },
    destine_city: { ...trip.destine_city },
    line_trip: trip.line_trip
      ? { ...trip.line_trip, coordinates: [...trip.line_trip.coordinates] }
      : null,
    stops: trip.stops.map((stop) => ({
      ...stop,
      location: {
        ...stop.location,
        city: { ...stop.location.city },
      },
    })),
  };
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
