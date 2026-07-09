import { useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ChatWindow } from "../../components/ChatWindow/ChatWindow";
import { useAuth } from "../../../app/providers/AuthProvider";
import {
  listReservationMessages,
  sendReservationMessage,
} from "../../service/chatService";

type ChatNavState = { title?: string; subtitle?: string; backTo?: string };

export function ReservationChatPage() {
  const { bookingId: bookingIdParam } = useParams();
  const bookingId = Number(bookingIdParam);
  const { user } = useAuth();
  const state = (useLocation().state as ChatNavState | null) ?? {};

  const loadMessages = useCallback(
    (afterId?: number) => listReservationMessages(bookingId, afterId),
    [bookingId]
  );
  const sendMessage = useCallback(
    (content: string) => sendReservationMessage(bookingId, content),
    [bookingId]
  );

  return (
    <ChatWindow
      key={bookingId}
      title={state.title ?? "Chat da reserva"}
      subtitle={state.subtitle ?? `Reserva #${bookingId}`}
      backTo={state.backTo ?? "/minhas-viagens"}
      currentUserId={user?.id ?? -1}
      showSenderNames={false}
      emptyHint="Combine aqui os detalhes da viagem antes do embarque."
      loadMessages={loadMessages}
      sendMessage={sendMessage}
    />
  );
}
