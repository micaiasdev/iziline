import type { City, Location } from "../../types/trip";
import { mockCities } from "./cities.mock";

function city(id: number): City {
  const found = mockCities.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Cidade mock ${id} não encontrada`);
  }
  return found;
}

// Pontos de embarque/desembarque por cidade para o modo mock.
export const mockLocationsByCity: Record<number, Location[]> = {
  1: [
    { id: 101, name: "Terminal Rodoviário Lucídio Portella", formatted_address: "Av. Boa Esperança, Redenção, Teresina - PI", latitude: -5.0949, longitude: -42.8213, city: city(1) },
    { id: 102, name: "Shopping Rio Poty", formatted_address: "Av. Marechal Castelo Branco, 900, Cabral, Teresina - PI", latitude: -5.0833, longitude: -42.8016, city: city(1) },
    { id: 103, name: "Praça da Liberdade", formatted_address: "Centro, Teresina - PI", latitude: -5.0892, longitude: -42.8016, city: city(1) },
    { id: 104, name: "UFPI — Campus Petrônio Portella", formatted_address: "Av. Universitária, Ininga, Teresina - PI", latitude: -5.0561, longitude: -42.796, city: city(1) },
  ],
  2: [
    { id: 201, name: "Terminal Rodoviário de Floriano", formatted_address: "Av. Getúlio Vargas, Floriano - PI", latitude: -6.7669, longitude: -43.0225, city: city(2) },
    { id: 202, name: "Praça Getúlio Vargas", formatted_address: "Centro, Floriano - PI", latitude: -6.7708, longitude: -43.0244, city: city(2) },
    { id: 203, name: "Hospital Regional Tibério Nunes", formatted_address: "Rua Sport Club, Floriano - PI", latitude: -6.7625, longitude: -43.0197, city: city(2) },
  ],
  3: [
    { id: 301, name: "Terminal Rodoviário de Timon", formatted_address: "Av. Piauí, Timon - MA", latitude: -5.0942, longitude: -42.8367, city: city(3) },
    { id: 302, name: "Praça São José", formatted_address: "Centro, Timon - MA", latitude: -5.0958, longitude: -42.8386, city: city(3) },
  ],
  4: [
    { id: 401, name: "Terminal Rodoviário de Parnaíba", formatted_address: "Av. São Sebastião, Parnaíba - PI", latitude: -2.9055, longitude: -41.7767, city: city(4) },
    { id: 402, name: "Porto das Barcas", formatted_address: "Centro, Parnaíba - PI", latitude: -2.9038, longitude: -41.7745, city: city(4) },
  ],
  5: [
    { id: 501, name: "Terminal Rodoviário de Picos", formatted_address: "Av. Getúlio Vargas, Picos - PI", latitude: -7.0771, longitude: -41.4669, city: city(5) },
    { id: 502, name: "Praça Félix Pacheco", formatted_address: "Centro, Picos - PI", latitude: -7.0768, longitude: -41.4666, city: city(5) },
  ],
  6: [
    { id: 601, name: "Praça das Vitórias", formatted_address: "Centro, Oeiras - PI", latitude: -7.0253, longitude: -42.1319, city: city(6) },
  ],
  7: [
    { id: 701, name: "Terminal Rodoviário de Campo Maior", formatted_address: "Av. Área Leão, Campo Maior - PI", latitude: -4.8275, longitude: -42.1686, city: city(7) },
  ],
  8: [
    { id: 801, name: "Terminal Rodoviário de Caxias", formatted_address: "Av. Getúlio Vargas, Caxias - MA", latitude: -4.8586, longitude: -43.3556, city: city(8) },
  ],
};
