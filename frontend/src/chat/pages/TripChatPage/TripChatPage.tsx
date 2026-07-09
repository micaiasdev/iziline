import { useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ChatWindow } from "../../components/ChatWindow/ChatWindow";
import { useAuth } from "../../../app/providers/AuthProvider";
import { listTripMessages, sendTripMessage } from "../../service/chatService";

type ChatNavState = { title?: string; subtitle?: string; backTo?: string };

export function TripChatPage() {
  const { tripId: tripIdParam } = useParams();
  const tripId = Number(tripIdParam);
  const { user } = useAuth();
  const state = (useLocation().state as ChatNavState | null) ?? {};

  const loadMessages = useCallback(
    (afterId?: number) => listTripMessages(tripId, afterId),
    [tripId]
  );
  const sendMessage = useCallback(
    (content: string) => sendTripMessage(tripId, content),
    [tripId]
  );

  return (
    <ChatWindow
      key={tripId}
      title={state.title ?? "Chat da viagem"}
      subtitle={state.subtitle ?? `Viagem #${tripId}`}
      backTo={state.backTo ?? "/viagens"}
      currentUserId={user?.id ?? -1}
      showSenderNames
      emptyHint="Envie a primeira mensagem para o grupo da viagem."
      loadMessages={loadMessages}
      sendMessage={sendMessage}
    />
  );
}
