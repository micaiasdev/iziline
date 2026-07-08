// Store em memória para o chat em modo mock (VITE_USE_MOCK=true). Cada conversa
// é identificada por uma chave ("reservation:<id>" / "trip:<id>"). As mensagens
// persistem enquanto a aba estiver aberta — o suficiente para o protótipo.

import { getMockUser } from "../../app/services/authStorage";
import type { ChatMessage } from "../../types/chat";

// Identidade fictícia da "outra ponta" da conversa, para as mensagens semeadas
// não colidirem com o usuário logado (id 1 no mock).
const OTHER_DRIVER = { id: 900, name: "Motorista" };
const OTHER_PASSENGER = { id: 901, name: "Passageiro" };
const OTHER_PASSENGER_2 = { id: 902, name: "Outro passageiro" };

const store = new Map<string, ChatMessage[]>();
let nextId = 1000;

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

// Semeia a conversa na primeira vez que é aberta, para não começar vazia.
function seed(key: string): ChatMessage[] {
  if (key.startsWith("reservation:")) {
    return [
      {
        id: nextId++,
        sender_id: OTHER_DRIVER.id,
        sender_name: OTHER_DRIVER.name,
        content: "Oi! Podemos combinar o ponto de embarque por aqui.",
        sent_at: minutesAgo(32),
      },
    ];
  }

  return [
    {
      id: nextId++,
      sender_id: OTHER_DRIVER.id,
      sender_name: OTHER_DRIVER.name,
      content: "Bem-vindos! Saída no horário combinado, qualquer coisa avisem por aqui.",
      sent_at: minutesAgo(120),
    },
    {
      id: nextId++,
      sender_id: OTHER_PASSENGER_2.id,
      sender_name: OTHER_PASSENGER_2.name,
      content: "Combinado, obrigado!",
      sent_at: minutesAgo(115),
    },
  ];
}

function getThread(key: string): ChatMessage[] {
  let thread = store.get(key);
  if (!thread) {
    thread = seed(key);
    store.set(key, thread);
  }
  return thread;
}

export function mockListMessages(key: string, afterId?: number): ChatMessage[] {
  const thread = getThread(key);
  if (afterId == null) {
    return [...thread];
  }
  return thread.filter((message) => message.id > afterId);
}

export function mockSendMessage(key: string, content: string): ChatMessage {
  const me = getMockUser();
  const message: ChatMessage = {
    id: nextId++,
    sender_id: me?.id ?? 1,
    sender_name: me?.full_name ?? "Você",
    content,
    sent_at: new Date().toISOString(),
  };
  getThread(key).push(message);
  return message;
}

export const mockOtherParticipants = {
  driver: OTHER_DRIVER,
  passenger: OTHER_PASSENGER,
};
