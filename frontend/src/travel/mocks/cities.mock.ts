import type { City } from "../../types/trip";

// Cidades fictícias da região PI/MA para o modo mock (VITE_USE_MOCK=true).
export const mockCities: City[] = [
  { id: 1, name: "Teresina", state: "PI" },
  { id: 2, name: "Floriano", state: "PI" },
  { id: 3, name: "Timon", state: "MA" },
  { id: 4, name: "Parnaíba", state: "PI" },
  { id: 5, name: "Picos", state: "PI" },
  { id: 6, name: "Oeiras", state: "PI" },
  { id: 7, name: "Campo Maior", state: "PI" },
  { id: 8, name: "Caxias", state: "MA" },
];
