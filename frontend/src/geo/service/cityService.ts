import type { CitySearchResult, Location } from "../../types/trip";
import { apiClient } from "../../app/services/apiClient";
import { buildApiError } from "../../app/services/apiError";
import { mockCities } from "../mocks/cities.mock";
import { mockLocationsByCity } from "../mocks/locations.mock";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const MIN_QUERY_LENGTH = 2;

// 1a. Autocomplete de cidade — GET /api/cities/search/?q=
export async function searchCities(query: string): Promise<CitySearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return [];
  }

  if (USE_MOCK) {
    await mockDelay();
    return filterMockCities(trimmed);
  }

  try {
    const { data } = await apiClient.get<CitySearchResult[]>(
      "/api/cities/search/",
      { params: { q: trimmed } }
    );
    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível buscar cidades.");
  }
}

// 1b. Pontos de uma cidade — GET /api/cities/<id>/locations/
export async function getCityLocations(cityId: number): Promise<Location[]> {
  if (USE_MOCK) {
    await mockDelay();
    return mockLocationsByCity[cityId] ?? [];
  }

  try {
    const { data } = await apiClient.get<Location[]>(
      `/api/cities/${cityId}/locations/`
    );
    return data;
  } catch (error) {
    throw buildApiError(error, "Não foi possível carregar os pontos da cidade.");
  }
}

function filterMockCities(query: string): CitySearchResult[] {
  const normalized = normalize(query);
  return mockCities
    .filter((city) => normalize(city.name).includes(normalized))
    .map((city) => ({ id: city.id, label: `${city.name}-${city.state}` }));
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 220));
}
