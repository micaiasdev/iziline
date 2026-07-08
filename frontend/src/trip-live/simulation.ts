// Interpolação de um ponto ao longo de uma rota (GeoJSON: coordenadas em
// [longitude, latitude]). Usada tanto pelo mock quanto pelo fallback simulado
// do motorista real (quando o GPS não está disponível).

export type LatLng = { lat: number; lng: number };

// Distância planar simples entre dois pontos [lng, lat]. Suficiente para
// distribuir o progresso ao longo da rota de forma proporcional (não é
// geodésica, mas o efeito visual do marcador é correto).
function segmentDistance(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.hypot(dx, dy);
}

// Retorna o ponto a uma fração (0..1) do comprimento total da rota.
export function pointAlongRoute(
  coordinates: [number, number][],
  fraction: number
): LatLng {
  if (coordinates.length === 0) {
    return { lat: 0, lng: 0 };
  }
  if (coordinates.length === 1 || fraction <= 0) {
    const [lng, lat] = coordinates[0];
    return { lat, lng };
  }
  if (fraction >= 1) {
    const [lng, lat] = coordinates[coordinates.length - 1];
    return { lat, lng };
  }

  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i += 1) {
    const d = segmentDistance(coordinates[i], coordinates[i + 1]);
    lengths.push(d);
    total += d;
  }

  if (total === 0) {
    const [lng, lat] = coordinates[0];
    return { lat, lng };
  }

  let target = fraction * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (target <= lengths[i]) {
      const t = lengths[i] === 0 ? 0 : target / lengths[i];
      const [lng1, lat1] = coordinates[i];
      const [lng2, lat2] = coordinates[i + 1];
      return {
        lat: lat1 + (lat2 - lat1) * t,
        lng: lng1 + (lng2 - lng1) * t,
      };
    }
    target -= lengths[i];
  }

  const [lng, lat] = coordinates[coordinates.length - 1];
  return { lat, lng };
}

// Ângulo (graus, 0 = norte) entre dois pontos — para girar o ícone do carro
// na direção do movimento.
export function bearing(from: LatLng, to: LatLng): number {
  const dLng = to.lng - from.lng;
  const dLat = to.lat - from.lat;
  const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  return (angle + 360) % 360;
}

// Duração (ms) que o marcador leva para percorrer a rota inteira na simulação.
export const SIM_TRAVERSAL_MS = 90_000;

// Fração da rota já percorrida dado o tempo decorrido desde o início.
export function fractionForElapsed(elapsedMs: number): number {
  return Math.min(Math.max(elapsedMs / SIM_TRAVERSAL_MS, 0), 1);
}
