export type RideSearchFilters = {
  origin: string;
  destination: string;
  date: string;
};

export type RideSearchResult = {
  id: number;
  driverName: string;
  origin: string;
  destination: string;
  departureAt: string;
  seatsAvailable: number;
  price: string;
  carModel: string;
};
