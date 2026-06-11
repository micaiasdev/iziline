import type { CreateTripInput, TripCostEstimate } from "../../types/trip";

const MOCK_DISTANCE_IN_KM = 240;
const MOCK_FUEL_PRICE_PER_LITER = 6;
const MOCK_FUEL_EFFICIENCY_KM_PER_LITER = 12;
const MOCK_TOLL_COST = 0;
const MOCK_SERVICE_FEE_RATE = 0.1;

export async function calculateTripCosts(
  input: CreateTripInput
): Promise<TripCostEstimate> {
  const passengersCount = Math.max(0, input.availableSeats);
  const occupantsCount = Math.max(1, passengersCount + 1);
  const fuelCost = roundCurrency(
    (MOCK_DISTANCE_IN_KM / MOCK_FUEL_EFFICIENCY_KM_PER_LITER) *
      MOCK_FUEL_PRICE_PER_LITER
  );
  const tollCost = roundCurrency(MOCK_TOLL_COST);
  const subtotal = fuelCost + tollCost;
  const serviceFee = roundCurrency(subtotal * MOCK_SERVICE_FEE_RATE);
  const totalCost = roundCurrency(subtotal + serviceFee);
  const perPersonCost = roundCurrency(totalCost / occupantsCount);

  return {
    distanceInKm: MOCK_DISTANCE_IN_KM,
    fuelPricePerLiter: MOCK_FUEL_PRICE_PER_LITER,
    fuelEfficiencyKmPerLiter: MOCK_FUEL_EFFICIENCY_KM_PER_LITER,
    fuelCost,
    tollCost,
    serviceFeeRate: MOCK_SERVICE_FEE_RATE,
    serviceFee,
    totalCost,
    occupantsCount,
    passengersCount,
    perPersonCost,
    breakdown: [
      {
        label: "Combustível",
        amount: fuelCost,
      },
      {
        label: "Pedágio",
        amount: tollCost,
      },
      {
        label: "Taxa de serviço",
        amount: serviceFee,
      },
    ],
  };
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}
