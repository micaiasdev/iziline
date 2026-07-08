import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { ApiError } from "../../../app/services/apiError";
import type { ChatMessage } from "../../../types/chat";
import "./ChatWindow.css";

const POLL_INTERVAL_MS = 4000;

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
});

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : timeFormatter.format(date);
}

function dayKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toDateString();
}

function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Hoje";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Ontem";
  }
  return dayFormatter.format(date);
}

type ChatWindowProps = {
  title: string;
  subtitle?: string;
  backTo: string;
  currentUserId: number;
  showSenderNames: boolean;
  emptyHint: string;
  loadMessages: (afterId?: number) => Promise<ChatMessage[]>;
  sendMessage: (content: string) => Promise<ChatMessage>;
};

export function ChatWindow({
  title,
  subtitle,
  backTo,
  currentUserId,
  showSenderNames,
  emptyHint,
  loadMessages,
  sendMessage,
}: ChatWindowProps) {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const lastIdRef = useRef<number>(0);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Mescla mensagens novas, ignorando as que já temos (dedupe por id).
  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) {
      return;
    }
    setMessages((current) => {
      const knownIds = new Set(current.map((message) => message.id));
      const fresh = incoming.filter((message) => !knownIds.has(message.id));
      if (fresh.length === 0) {
        return current;
      }
      const next = [...current, ...fresh];
      lastIdRef.current = next.reduce((max, m) => Math.max(max, m.id), lastIdRef.current);
      return next;
    });
  }, []);

  // Carga inicial. O estado já começa em "loading"; ao trocar de conversa o
  // componente é remontado (key nas páginas), então não resetamos aqui.
  useEffect(() => {
    let active = true;

    loadMessages()
      .then((initial) => {
        if (!active) {
          return;
        }
        setMessages(initial);
        lastIdRef.current = initial.reduce((max, m) => Math.max(max, m.id), 0);
      })
      .catch((error) => {
        if (active) {
          setLoadError(
            error instanceof ApiError ? error.message : "Não foi possível carregar a conversa."
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadMessages]);

  // Polling incremental enquanto a conversa está aberta.
  useEffect(() => {
    const interval = window.setInterval(() => {
      loadMessages(lastIdRef.current)
        .then(mergeMessages)
        .catch(() => {
          // Falha transitória de polling é silenciosa; a próxima tentativa cobre.
        });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [loadMessages, mergeMessages]);

  // Rola para a última mensagem quando a lista cresce.
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    listEndRef.current?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  }, [messages]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) {
      return;
    }

    setIsSending(true);
    setSendError("");
    try {
      const sent = await sendMessage(content);
      mergeMessages([sent]);
      setInput("");
    } catch (error) {
      setSendError(
        error instanceof ApiError ? error.message : "Não foi possível enviar. Tente de novo."
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend(event);
    }
  }

  return (
    <div className="chat-window">
      <header className="chat-window__header">
        <button
          type="button"
          className="chat-window__back"
          onClick={() => navigate(backTo)}
          aria-label="Voltar"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div className="chat-window__heading">
          <h1 className="chat-window__title">{title}</h1>
          {subtitle && <span className="chat-window__subtitle">{subtitle}</span>}
        </div>
      </header>

      <div className="chat-window__messages" ref={scrollRef}>
        {isLoading ? (
          <p className="chat-window__state">Carregando conversa…</p>
        ) : loadError ? (
          <p className="chat-window__state chat-window__state--error" role="alert">
            {loadError}
          </p>
        ) : messages.length === 0 ? (
          <div className="chat-window__empty">
            <strong>Nenhuma mensagem ainda</strong>
            <p>{emptyHint}</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const mine = message.sender_id === currentUserId;
            const previous = messages[index - 1];
            const showDay = !previous || dayKey(previous.sent_at) !== dayKey(message.sent_at);
            return (
              <div key={message.id}>
                {showDay && <div className="chat-day">{formatDay(message.sent_at)}</div>}
                <div className={`chat-msg ${mine ? "chat-msg--mine" : "chat-msg--theirs"}`}>
                  {!mine && showSenderNames && (
                    <span className="chat-msg__sender">{message.sender_name}</span>
                  )}
                  <div className="chat-msg__bubble">
                    <span className="chat-msg__text">{message.content}</span>
                    <span className="chat-msg__time">{formatTime(message.sent_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      <form className="chat-window__composer" onSubmit={handleSend}>
        {sendError && (
          <span className="chat-window__send-error" role="alert">
            {sendError}
          </span>
        )}
        <div className="chat-window__composer-row">
          <textarea
            className="chat-window__input"
            placeholder="Escreva uma mensagem…"
            aria-label="Mensagem"
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            className="chat-window__send"
            disabled={!input.trim() || isSending}
            aria-label="Enviar mensagem"
          >
            <Send size={20} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
