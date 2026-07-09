// Domínio do chat. Dois contextos compartilham o mesmo shape de mensagem:
// - chat da RESERVA: 1:1 entre motorista e passageiro, disponível assim que a
//   reserva é solicitada (para combinar detalhes antes do aceite).
// - chat da VIAGEM: em grupo (motorista + passageiros confirmados), liberado
//   depois que o motorista aceita a reserva.
//
// Endpoints reais planejados (ver docs/backend-operacao-viagem.md):
//   GET/POST /api/bookings/<id>/messages/   (reserva)
//   GET/POST /api/trips/<id>/messages/      (viagem)
// Ambos aceitam ?after=<id> para o polling incremental.

export type ChatMessage = {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  sent_at: string; // ISO 8601
};

export type ChatKind = "reservation" | "trip";
