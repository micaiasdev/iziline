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

export type TripCost = {
  trip_id: number;
  price_per_km: string;
  distance_km_snapshot: number;
  total_cost: string;
  created_at: string;
};

export type FareSplitItem = {
  booking_id: number;
  passenger_id: number;
  amount: string;
};

export type TripFareOverview = {
  trip_id: number;
  total_cost: string;
  covered_amount: string;
  driver_amount: string;
  confirmed_passengers: number;
  split: FareSplitItem[];
};

export type TripFareQuote = {
  trip_id: number;
  pickup_stop_id: number;
  dropoff_stop_id: number;
  estimated_amount: string;
  total_cost: string;
  current_confirmed_passengers: number;
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
  cost: TripCost | null;
};

export type MyTripRole = "driver" | "passenger";

export type MyTripItem = {
  role: MyTripRole;
  trip: TripListItem;
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
  cost: TripCost | null;
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

export type BookingStatus = "pending" | "confirmed" | "rejected" | "cancelled";

// Booking (shape exato do contrato). O contrato só expõe o passageiro como
// id (não há nome) — a UI mostra "Passageiro #<id>" a partir desse campo.
export type Booking = {
  id: number;
  trip: number;
  passenger: number;
  pickup_stop: TripStop;
  dropoff_stop: TripStop;
  status: BookingStatus;
  created_at: string;
  confirmed_at: string | null;
};

export type CreateBookingPayload = {
  trip_id: number;
  pickup_stop_id: number;
  dropoff_stop_id: number;
};

// Enriquecimento usado pela UI de "Minhas reservas" enquanto o backend ainda
// devolve somente o id da viagem em /api/bookings/mine/.
export type PassengerBooking = Booking & {
  trip_summary?: TripListItem;
};
