import type { RideSearchFilters, RideSearchResult } from "../../types/ride";

type RideFixture = Omit<RideSearchResult, "departureAt"> & {
  dayOffset: number;
  time: string;
};

const rideFixtures: RideFixture[] = [
  {
    id: 1,
    driverName: "Ana Beatriz",
    origin: "Teresina",
    destination: "Floriano",
    dayOffset: 2,
    time: "07:30",
    seatsAvailable: 3,
    price: "44.00",
    carModel: "Honda Fit",
  },
  {
    id: 2,
    driverName: "Carlos Eduardo",
    origin: "Teresina",
    destination: "Parnaíba",
    dayOffset: 3,
    time: "06:15",
    seatsAvailable: 2,
    price: "72.00",
    carModel: "Toyota Corolla",
  },
  {
    id: 3,
    driverName: "Marina Sousa",
    origin: "Floriano",
    destination: "Teresina",
    dayOffset: 4,
    time: "14:00",
    seatsAvailable: 1,
    price: "46.00",
    carModel: "Fiat Argo",
  },
  {
    id: 4,
    driverName: "João Pedro",
    origin: "Teresina",
    destination: "Picos",
    dayOffset: 5,
    time: "08:45",
    seatsAvailable: 4,
    price: "55.00",
    carModel: "Chevrolet Onix",
  },
  {
    id: 5,
    driverName: "Rafael Lima",
    origin: "Teresina",
    destination: "Floriano",
    dayOffset: 1,
    time: "19:20",
    seatsAvailable: 0,
    price: "42.00",
    carModel: "Volkswagen Gol",
  },
  {
    id: 6,
    driverName: "Patrícia Alves",
    origin: "Parnaíba",
    destination: "Teresina",
    dayOffset: -1,
    time: "09:00",
    seatsAvailable: 2,
    price: "70.00",
    carModel: "Hyundai HB20",
  },
];

export async function searchRides(
  filters: RideSearchFilters
): Promise<RideSearchResult[]> {
  const normalizedFilters = {
    origin: normalizeText(filters.origin),
    destination: normalizeText(filters.destination),
    date: filters.date,
  };
  const now = new Date();

  return rideFixtures
    .map(buildRideResult)
    .filter((ride) => ride.seatsAvailable > 0)
    .filter((ride) => new Date(ride.departureAt) > now)
    .filter((ride) =>
      normalizedFilters.origin
        ? normalizeText(ride.origin).includes(normalizedFilters.origin)
        : true
    )
    .filter((ride) =>
      normalizedFilters.destination
        ? normalizeText(ride.destination).includes(normalizedFilters.destination)
        : true
    )
    .filter((ride) =>
      normalizedFilters.date
        ? ride.departureAt.startsWith(normalizedFilters.date)
        : true
    );
}

function buildRideResult(fixture: RideFixture): RideSearchResult {
  return {
    id: fixture.id,
    driverName: fixture.driverName,
    origin: fixture.origin,
    destination: fixture.destination,
    departureAt: buildDepartureAt(fixture.dayOffset, fixture.time),
    seatsAvailable: fixture.seatsAvailable,
    price: fixture.price,
    carModel: fixture.carModel,
  };
}

function buildDepartureAt(dayOffset: number, time: string) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);

  const [hours, minutes] = time.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);

  return date.toISOString();
}

function normalizeText(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
