"use client";

import { useEffect, useMemo, useState } from "react";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const TICKET_KEY = "fifa-half-time-show-support-ticket";

const initialMessages = [
  {
    role: "assistant",
    text: "Hi, we are here to help. Send your question and we will keep the thread in one place.",
  },
];

function threadToMessages(thread) {
  return thread.map((item) => ({
    role: item.role === "customer" ? "user" : "assistant",
    text: item.message,
  }));
}

export function SupportChatbot({ inviteToken }) {
  const [messages, setMessages] = useState(initialMessages);
  const [value, setValue] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inviteTokenValue = useMemo(() => (inviteToken ? String(inviteToken).trim() : ""), [inviteToken]);

  useEffect(() => {
    const savedTicketId = window.localStorage.getItem(TICKET_KEY);
    if (savedTicketId) {
      setTicketId(savedTicketId);
    }
  }, []);

  useEffect(() => {
    if (!ticketId) {
      return undefined;
    }

    let cancelled = false;

    async function loadTicket() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/support/inquiries?ticketId=${encodeURIComponent(ticketId)}`);
        const data = await response.json();

        if (!cancelled && response.ok && data.ok && data.inquiry?.thread) {
          setMessages(threadToMessages(data.inquiry.thread));
        }
      } catch {
        // Best effort hydration only.
      }
    }

    void loadTicket();

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmed = value.trim();
    if (!trimmed || isSending) {
      return;
    }

    setIsSending(true);
    setError("");

    const nextMessages = [...messages, { role: "user", text: trimmed }];
    setMessages(nextMessages);
    setValue("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/support/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken: inviteTokenValue,
          message: trimmed,
          ticketId: ticketId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Unable to send support message.");
      }

      if (data.ticketId) {
        setTicketId(data.ticketId);
        window.localStorage.setItem(TICKET_KEY, data.ticketId);
      }

      if (data.inquiry?.thread) {
        setMessages(threadToMessages(data.inquiry.thread));
      } else if (data.inquiry?.answer) {
        setMessages((current) => [
          ...current,
          { role: "assistant", text: data.inquiry.answer },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send support message.");
      setMessages(nextMessages);
      setValue(trimmed);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="chatbot-shell support-chatbot" aria-label="Support chatbot">
      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <article
            className={`chatbot-message chatbot-message-${message.role}`}
            key={`${message.role}-${index}`}
          >
            {message.text}
          </article>
        ))}
      </div>

      {error ? (
        <p className="chatbot-error" role="status">
          {error}
        </p>
      ) : null}

      <form className="chatbot-form" onSubmit={handleSubmit}>
        <input
          aria-label="Ask a question"
          placeholder="Type your question..."
          value={value}
          onChange={(event) => setValue(event.target.value)}
          type="text"
        />
        <button type="submit" disabled={isSending}>
          {isSending ? "sending..." : "send"}
        </button>
      </form>
    </section>
  );
}
