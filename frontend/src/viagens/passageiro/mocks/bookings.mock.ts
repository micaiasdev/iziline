import type {
  BookingStatus,
  CreateBookingPayload,
  PassengerBooking,
  TripDetail,
  TripListItem,
  TripStop,
} from "../../../types/trip";
import {
  decrementMockTripSeat,
  findMockTripStop,
  getMockTripDetail,
  incrementMockTripSeat,
  toTripListItem,
} from "./trips.mock";

let nextBookingId = 92001;

function createdAt(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function getStop(trip: TripDetail, index: number): TripStop {
  const stop = trip.stops[index];
  if (!stop) {
    throw new Error(`Parada mock ${index} não encontrada na viagem ${trip.id}`);
  }
  return stop;
}

function fixtureBooking(
  tripId: number,
  pickupIndex: number,
  dropoffIndex: number,
  status: BookingStatus,
  daysAgo: number
): PassengerBooking {
  const trip = getMockTripDetail(tripId);
  if (!trip) {
    throw new Error(`Viagem mock ${tripId} não encontrada.`);
  }

  const tripSummary =
    status === "pending" || status === "confirmed"
      ? decrementMockTripSeat(trip.id) ?? toTripListItem(trip)
      : toTripListItem(trip);

  return {
    id: nextBookingId++,
    trip: trip.id,
    trip_summary: tripSummary,
    passenger: 201,
    pickup_stop: getStop(trip, pickupIndex),
    dropoff_stop: getStop(trip, dropoffIndex),
    status,
    created_at: createdAt(daysAgo),
    confirmed_at:
      status === "confirmed" ? createdAt(Math.max(0, daysAgo - 1)) : null,
  };
}

const passengerBookings: PassengerBooking[] = [
  fixtureBooking(1002, 0, 2, "pending", 0),
  fixtureBooking(1001, 0, 2, "confirmed", 2),
  fixtureBooking(1005, 0, 2, "rejected", 5),
  fixtureBooking(1003, 0, 2, "cancelled", 8),
];

export function listMockPassengerBookings(): PassengerBooking[] {
  return [...passengerBookings]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(cloneBooking);
}

export function createMockPassengerBooking(
  payload: CreateBookingPayload
): PassengerBooking {
  const trip = getMockTripDetail(payload.trip_id);
  if (!trip) {
    throw new Error("Viagem não encontrada.");
  }

  if (trip.status !== "open") {
    throw new Error("Esta viagem não está aberta para reservas.");
  }

  if (trip.available_spots <= 0 || trip.available_seats <= 0) {
    throw new Error("Esta viagem não tem vagas disponíveis.");
  }

  const pickupStop = findMockTripStop(payload.trip_id, payload.pickup_stop_id);
  const dropoffStop = findMockTripStop(payload.trip_id, payload.dropoff_stop_id);

  if (!pickupStop || !dropoffStop) {
    throw new Error("Selecione pontos válidos para embarque e desembarque.");
  }

  if (pickupStop.order >= dropoffStop.order) {
    throw new Error("O embarque deve vir antes do desembarque.");
  }

  const updatedSummary = decrementMockTripSeat(trip.id);
  const booking: PassengerBooking = {
    id: nextBookingId++,
    trip: trip.id,
    trip_summary: updatedSummary ?? toTripListItem(trip),
    passenger: 201,
    pickup_stop: pickupStop,
    dropoff_stop: dropoffStop,
    status: "pending",
    created_at: new Date().toISOString(),
    confirmed_at: null,
  };

  passengerBookings.unshift(booking);
  return cloneBooking(booking);
}

export function cancelMockPassengerBooking(bookingId: number): PassengerBooking {
  const index = passengerBookings.findIndex((booking) => booking.id === bookingId);
  if (index === -1) {
    throw new Error("Reserva não encontrada.");
  }

  const current = passengerBookings[index];
  if (current.status !== "pending") {
    throw new Error("Somente reservas pendentes podem ser canceladas.");
  }

  const updatedSummary = incrementMockTripSeat(current.trip);
  const updated: PassengerBooking = {
    ...current,
    status: "cancelled",
    confirmed_at: null,
    trip_summary: updatedSummary ?? current.trip_summary,
  };

  passengerBookings[index] = updated;
  return cloneBooking(updated);
}

function cloneBooking(booking: PassengerBooking): PassengerBooking {
  return {
    ...booking,
    trip_summary: booking.trip_summary
      ? cloneTripSummary(booking.trip_summary)
      : undefined,
    pickup_stop: cloneStop(booking.pickup_stop),
    dropoff_stop: cloneStop(booking.dropoff_stop),
  };
}

function cloneStop(stop: TripStop): TripStop {
  return {
    ...stop,
    location: {
      ...stop.location,
      city: { ...stop.location.city },
    },
  };
}

function cloneTripSummary(summary: TripListItem): TripListItem {
  return {
    ...summary,
    origin_city: { ...summary.origin_city },
    destine_city: { ...summary.destine_city },
  };
}
