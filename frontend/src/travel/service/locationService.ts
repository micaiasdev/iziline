const DEFAULT_SUGGESTION_LIMIT = 4;

const addressSuggestions = [
  "Terminal Rodoviário Lucídio Portella, Teresina",
  "Avenida Frei Serafim, Centro, Teresina",
  "Shopping Rio Poty, Teresina",
  "Universidade Federal do Piauí, Teresina",
  "Avenida Presidente Kennedy, Teresina",
  "Terminal Rodoviário de Floriano",
  "Avenida Eurípedes de Aguiar, Floriano",
  "Centro Comercial de Floriano",
  "Hospital Regional Tibério Nunes, Floriano",
  "Universidade Estadual do Piauí, Floriano",
];

export type AddressSuggestionOptions = {
  limit?: number;
};

export async function getPossibleAddresses(
  query: string,
  options: AddressSuggestionOptions = {}
): Promise<string[]> {
  const search = normalizeText(query.trim());

  if (search.length < 2) {
    return [];
  }

  return addressSuggestions
    .filter((address) => normalizeText(address).includes(search))
    .slice(0, options.limit ?? DEFAULT_SUGGESTION_LIMIT);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
