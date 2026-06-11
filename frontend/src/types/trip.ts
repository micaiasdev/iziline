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

export type TripCostBreakdownItem = {
  label: string;
  amount: number;
};

export type TripCostEstimate = {
  distanceInKm: number;
  fuelPricePerLiter: number;
  fuelEfficiencyKmPerLiter: number;
  fuelCost: number;
  tollCost: number;
  serviceFeeRate: number;
  serviceFee: number;
  totalCost: number;
  occupantsCount: number;
  passengersCount: number;
  perPersonCost: number;
  breakdown: TripCostBreakdownItem[];
};
