import type { RideSearchFilters, RideSearchResult } from "../types/ride";
import { apiClient } from "../../../app/services/apiClient";

type TripListItem = {
  id: number;
  driver_name: string;
  origin: string;
  destination: string;
  departure_at: string;
  seats_available: number;
  price: string;
};

type PaginatedTripsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: TripListItem[];
};

export async function searchRides(
  filters: RideSearchFilters
): Promise<RideSearchResult[]> {
  const response = await apiClient.get<PaginatedTripsResponse>("/api/trips/", {
    params: buildTripSearchParams(filters),
  });

  return response.data.results.map(mapTripToRide);
}

function buildTripSearchParams(filters: RideSearchFilters) {
  return {
    ...(filters.origin.trim() ? { origin: filters.origin.trim() } : {}),
    ...(filters.destination.trim()
      ? { destination: filters.destination.trim() }
      : {}),
    ...(filters.date ? { date: filters.date } : {}),
  };
}

function mapTripToRide(trip: TripListItem): RideSearchResult {
  return {
    id: trip.id,
    driverName: trip.driver_name,
    origin: trip.origin,
    destination: trip.destination,
    departureAt: trip.departure_at,
    seatsAvailable: trip.seats_available,
    price: trip.price,
  };
}
