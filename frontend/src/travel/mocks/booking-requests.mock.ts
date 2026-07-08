import type { Booking, BookingStatus, TripStop } from "../../types/trip";
import { mockLocationsByCity } from "./locations.mock";

let nextBookingId = 50001;
let nextStopId = 95001;

function stop(order: number, cityId: number, locationIndex: number): TripStop {
  const location = mockLocationsByCity[cityId][locationIndex];
  return { id: nextStopId++, order, location };
}

function buildFixture(tripId: number): Booking[] {
  const now = new Date();
  const createdAt = (daysAgo: number) =>
    new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

  const pickup1 = stop(0, 1, 0);
  const dropoff1 = stop(1, 2, 0);
  const pickup2 = stop(0, 1, 1);
  const dropoff2 = stop(1, 2, 1);
  const pickup3 = stop(0, 1, 2);
  const dropoff3 = stop(1, 3, 0);

  return [
    {
      id: nextBookingId++,
      trip: tripId,
      passenger: 101,
      pickup_stop: pickup1,
      dropoff_stop: dropoff1,
      status: "pending",
      created_at: createdAt(0),
      confirmed_at: null,
    },
    {
      id: nextBookingId++,
      trip: tripId,
      passenger: 102,
      pickup_stop: pickup2,
      dropoff_stop: dropoff2,
      status: "pending",
      created_at: createdAt(1),
      confirmed_at: null,
    },
    {
      id: nextBookingId++,
      trip: tripId,
      passenger: 103,
      pickup_stop: pickup3,
      dropoff_stop: dropoff3,
      status: "confirmed",
      created_at: createdAt(2),
      confirmed_at: createdAt(1),
    },
  ];
}

// Estado em memória por trip_id, para que aceitar/recusar persista durante a
// sessão (não há backend real por trás do modo mock).
const bookingsByTrip = new Map<number, Booking[]>();

function getOrSeedTripBookings(tripId: number): Booking[] {
  let bookings = bookingsByTrip.get(tripId);
  if (!bookings) {
    bookings = buildFixture(tripId);
    bookingsByTrip.set(tripId, bookings);
  }
  return bookings;
}

export function getMockBookingRequests(
  tripId: number,
  status: BookingStatus | "all"
): Booking[] {
  const bookings = getOrSeedTripBookings(tripId);
  const filtered =
    status === "all" ? bookings : bookings.filter((b) => b.status === status);
  return [...filtered].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function updateMockBookingStatus(
  bookingId: number,
  status: "confirmed" | "rejected"
): Booking {
  for (const bookings of bookingsByTrip.values()) {
    const index = bookings.findIndex((b) => b.id === bookingId);
    if (index !== -1) {
      const updated: Booking = {
        ...bookings[index],
        status,
        confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
      };
      bookings[index] = updated;
      return updated;
    }
  }
  throw new Error(`Booking mock ${bookingId} não encontrado.`);
}
