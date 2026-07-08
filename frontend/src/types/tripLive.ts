// Posição do motorista durante a viagem em andamento.
// Espelha o DriverLocationOutputSerializer do backend:
//   GET  /api/trips/<id>/location/  -> DriverLocation (participantes)
//   POST /api/trips/<id>/location/  -> { latitude, longitude } (só motorista)
export type DriverLocation = {
  trip_id: number;
  latitude: number;
  longitude: number;
  updated_at: string; // ISO 8601
};

export type LiveRole = "driver" | "passenger";
