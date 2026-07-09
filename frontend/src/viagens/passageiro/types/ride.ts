import type { CitySearchResult } from "../../../types/trip";

export type RideSearchFilters = {
  originCity: CitySearchResult | null;
  destineCity: CitySearchResult | null;
  dateStart: string;
  dateEnd: string;
};

export type RideSearchErrors = Partial<
  Record<keyof RideSearchFilters, string>
>;
