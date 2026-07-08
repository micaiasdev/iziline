// Domínio de viagem alinhado ao contrato (frontend/api-contract-trip.md).

export type TripStatus =
  | "open"
  | "full"
  | "in_progress"
  | "finished"
  | "cancelled";

export type City = {
  id: number;
  name: string;
  state: string;
};

// Resultado do autocomplete: GET /api/cities/search/?q=
export type CitySearchResult = {
  id: number;
  label: string;
};

export type Location = {
  id: number;
  name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  city: City;
};

export type TripStop = {
  id: number;
  order: number;
  location: Location;
};

// GeoJSON vindo do Mapbox Directions; coordenadas [longitude, latitude].
export type LineString = {
  type: "LineString";
  coordinates: [number, number][];
};

// Item resumido da busca (TripListOutputSerializer).
export type TripListItem = {
  id: number;
  origin_city: City;
  destine_city: City;
  departure_time: string;
  available_spots: number;
  status: TripStatus;
  total_distance_km: number;
  total_duration_min: number;
};

// Detalhe completo (TripDetailOutputSerializer).
export type TripDetail = {
  id: number;
  driver: number;
  origin_city: City;
  destine_city: City;
  departure_time: string;
  available_spots: number;
  available_seats: number;
  status: TripStatus;
  line_trip: LineString | null;
  total_distance_km: number;
  total_duration_min: number;
  stops: TripStop[];
  created_at: string;
  updated_at: string;
};

// Entrada coletada pela Tela 1 (motorista) antes de virar payload.
export type CreateTripInput = {
  originCityId: number;
  originLocationId: number;
  destineCityId: number;
  destinationLocationId: number;
  intermediateLocationIds: number[];
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  availableSpots: number;
};

// Corpo de POST /api/trips/ (shape exato do contrato).
export type CreateTripPayload = {
  origin_city_id: number;
  destine_city_id: number;
  departure_time: string;
  available_spots: number;
  origin_location_id: number;
  destination_location_id: number;
  intermediate_location_ids: number[];
};
