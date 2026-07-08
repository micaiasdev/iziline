export type AgendaTripRole = "driver" | "passenger";

export type AgendaWhen = "upcoming" | "past";

export type AgendaTrip = {
  id: number;
  driver_name: string;
  origin: string;
  destination: string;
  departure_at: string;
  seats_available: number;
  price: string;
  is_cancelled: boolean;
  role: AgendaTripRole;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
