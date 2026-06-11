export type NewTripFormData = {
  origin: string;
  destination: string;
  date: string;
  time: string;
  availableSeats: number;
};

export type TripPointsFormData = {
  originPoint: string;
  destinationPoint: string;
};

export type CreateTripInput = {
  origin: string;
  destination: string;
  date: string;
  time: string;
  availableSeats: number;
};

export type CreateTripPayload = {
  origin: string;
  destination: string;
  departure_at: string;
  seats_available: number;
};

export type TripResponse = {
  id: number;
  driver_name: string;
  origin: string;
  destination: string;
  departure_at: string;
  seats_available: number;
  price: string;
  is_cancelled: boolean;
  created_at?: string;
};