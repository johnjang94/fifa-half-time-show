"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const TICKET_KEY = "fifa-half-time-show-support-ticket";

function createGreeting(firstName) {
  const name = firstName?.trim() || "there";
  return `Hi ${name}, how may I help you today?`;
}

function createInitialMessages(firstName) {
  const createdAt = new Date().toISOString();
  return [
    {
      role: "assistant",
      name: "Support",
      text: createGreeting(firstName),
      createdAt,
    },
  ];
}

function threadToMessages(thread, customerName = "Guest") {
  return thread.map((item) => ({
    role: item.role === "customer" ? "user" : "assistant",
    name: item.role === "customer" ? customerName : "Support",
    text: item.message,
    createdAt: item.createdAt,
  }));
}

function normalize(value) {
  return String(value ?? "").trim();
}

function SendMessageIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M3.5 20.5 20.5 12 3.5 3.5l3.2 7.2L14 12l-7.3 1.3-3.2 7.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function isTicketDefaultGreeting(messages) {
  return (
    messages.length === 1 &&
    messages[0]?.role === "assistant" &&
    normalize(messages[0]?.text).startsWith("Hi ")
  );
}

function defaultRequestForm(firstName, phoneNumber, draftMessage) {
  return {
    name: firstName || "",
    phoneNumber: phoneNumber || "",
    message: draftMessage || "I can bring food for the party.",
  };
}

function formatHistoryDate(value) {
  if (!value) {
    return "recent chat";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recent chat";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMessageTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getHistorySnippet(inquiry) {
  const firstCustomerLine = inquiry?.thread?.find((entry) => entry.role === "customer")?.message ?? "";
  const fallback = inquiry?.question || inquiry?.answer || "Chat history";
  return normalize(firstCustomerLine || fallback).slice(0, 72);
}

function getHistoryCustomerName(inquiry) {
  const name = [normalize(inquiry?.customer ?? ""), normalize(inquiry?.firstName ?? "")]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (name) {
    return name;
  }

  return normalize(inquiry?.customerName ?? "") || "Guest";
}

function initialsFromName(value) {
  const parts = normalize(value)
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function SupportChatbot({ inviteToken }) {
  const router = useRouter();
  const inviteTokenValue = useMemo(() => (inviteToken ? String(inviteToken).trim() : ""), [inviteToken]);
  const [messages, setMessages] = useState(() => createInitialMessages("there"));
  const [value, setValue] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerDisplayName, setCustomerDisplayName] = useState("");
  const [showFoodRequestButton, setShowFoodRequestButton] = useState(false);
  const [showFoodRequestForm, setShowFoodRequestForm] = useState(false);
  const [foodRequestDraft, setFoodRequestDraft] = useState("");
  const [historyItems, setHistoryItems] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [viewMode, setViewMode] = useState("live");
  const [requestForm, setRequestForm] = useState({
    name: "",
    phoneNumber: "",
    message: "",
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  useEffect(() => {
    const savedTicketId = window.localStorage.getItem(TICKET_KEY);
    if (savedTicketId) {
      setTicketId(savedTicketId);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      if (!inviteTokenValue) {
        setCustomerFirstName("");
        setRequestForm((current) => ({
          ...current,
          ...defaultRequestForm("", "", current.message),
        }));
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/invites/lookup?inviteToken=${encodeURIComponent(inviteTokenValue)}`,
        );
        const data = await response.json();

        if (cancelled || !response.ok || !data.ok) {
          return;
        }

        const firstName = normalize(data.invite?.firstName);
        const lastName = normalize(data.invite?.lastName);
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
        const phoneNumber = normalize(data.invite?.phoneNumber);

        setCustomerFirstName(firstName);
        setCustomerDisplayName(fullName || firstName || "Guest");
        setRequestForm((current) => ({
          ...defaultRequestForm(fullName, phoneNumber, current.message),
        }));
        setMessages((current) => {
          if (!isTicketDefaultGreeting(current)) {
            return current;
          }

          return createInitialMessages(firstName || "there");
        });
      } catch {
        // Best-effort only. The chatbot still works without a lookup result.
      }
    }

    void loadInvite();

    return () => {
      cancelled = true;
    };
  }, [inviteTokenValue]);

  useEffect(() => {
    if (!ticketId) {
      return undefined;
    }

    let cancelled = false;

    async function loadTicket() {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/support/inquiries?ticketId=${encodeURIComponent(ticketId)}`,
        );
        const data = await response.json();

        if (!cancelled && response.ok && data.ok && data.inquiry?.thread) {
          setMessages(threadToMessages(data.inquiry.thread, data.inquiry.customer || customerDisplayName));
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

  useEffect(() => {
    setRequestForm((current) => ({
      ...current,
      name: current.name || customerFirstName || "",
      phoneNumber: current.phoneNumber || inviteTokenValue || "",
    }));
  }, [customerFirstName, inviteTokenValue]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (!inviteTokenValue) {
        setHistoryItems([]);
        setSelectedHistoryId("");
        setHistoryError("");
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/support/inquiries/history?inviteToken=${encodeURIComponent(inviteTokenValue)}`,
        );
        const data = await response.json();

        if (cancelled || !response.ok || !data.ok) {
          return;
        }

        const items = Array.isArray(data.inquiries) ? data.inquiries : [];
        setHistoryItems(items);
        setHistoryError("");
        setSelectedHistoryId((current) => current || items[0]?.id || "");
      } catch {
        if (!cancelled) {
          setHistoryError("Unable to load chat history.");
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [inviteTokenValue, viewMode]);

  const selectedHistory = useMemo(
    () => historyItems.find((item) => item.id === selectedHistoryId) ?? historyItems[0] ?? null,
    [historyItems, selectedHistoryId],
  );

  async function postSupportMessage(body, { isRequestSubmission = false } = {}) {
    const response = await fetch(`${apiBaseUrl}/api/support/inquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
      setMessages(threadToMessages(data.inquiry.thread, data.inquiry.customer || customerDisplayName));
    } else if (data.inquiry?.answer) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          name: "Support",
          text: data.inquiry.answer,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    const action = normalize(data.suggestedAction ?? data.inquiry?.suggestedAction);
    if (action === "food_request_confirmation") {
      setShowFoodRequestButton(false);
      setShowFoodRequestForm(false);
      setFoodRequestDraft(normalize(body.message));
    } else if (action === "food_request_form") {
      setShowFoodRequestButton(true);
      setShowFoodRequestForm(false);
    } else if (!isRequestSubmission) {
      setShowFoodRequestButton(false);
      setShowFoodRequestForm(false);
      setFoodRequestDraft("");
    }

    if (data.ticketId) {
      setHistoryItems((current) => {
        const nextItem = data.inquiry ?? null;
        if (!nextItem) {
          return current;
        }

        const nextHistory = current.filter((entry) => entry.id !== nextItem.id);
        return [nextItem, ...nextHistory];
      });
      setSelectedHistoryId(data.ticketId);
    }

    return data;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmed = value.trim();
    if (!trimmed || isSending) {
      return;
    }

    setIsSending(true);
    setError("");

    const nextMessages = [
      ...messages,
      {
        role: "user",
        name: customerDisplayName || customerFirstName || "You",
        text: trimmed,
        createdAt: new Date().toISOString(),
      },
    ];
    setMessages(nextMessages);
    setValue("");

    try {
      await postSupportMessage({
        inviteToken: inviteTokenValue,
        message: trimmed,
        ticketId: ticketId || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send support message.");
      setMessages(nextMessages);
      setValue(trimmed);
    } finally {
      setIsSending(false);
    }
  }

  function openFoodRequestForm() {
    setShowFoodRequestButton(false);
    setShowFoodRequestForm(true);
    setRequestForm((current) => ({
      name: current.name || customerFirstName || "",
      phoneNumber: current.phoneNumber || inviteTokenValue || "",
      message: current.message || foodRequestDraft || "I can bring food for the party.",
    }));
  }

  async function handleFoodRequestSubmit(event) {
    event.preventDefault();

    const name = requestForm.name.trim();
    const phoneNumber = requestForm.phoneNumber.replace(/\D/g, "");
    const message = requestForm.message.trim();

    if (!name || phoneNumber.length < 10 || !message || isSubmittingRequest) {
      setError("Please fill in your name, phone number, and message.");
      return;
    }

    setIsSubmittingRequest(true);
    setError("");

    const requestMessage = `Food request from ${name} (${phoneNumber}): ${message}`;
    const nextMessages = [
      ...messages,
      { role: "user", text: requestMessage },
    ];
    setMessages(nextMessages);

    try {
      await postSupportMessage(
        {
          inviteToken: inviteTokenValue,
          requestType: "food_request",
          contactName: name,
          contactPhoneNumber: phoneNumber,
          message: requestMessage,
          ticketId: ticketId || undefined,
        },
        { isRequestSubmission: true },
      );

      setShowFoodRequestButton(false);
      setShowFoodRequestForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send your request.");
      setMessages(nextMessages);
    } finally {
      setIsSubmittingRequest(false);
    }
  }

  function finishTheChat() {
    const nextPath = inviteTokenValue
      ? `/portal?invite=${encodeURIComponent(inviteTokenValue)}`
      : "/portal";

    router.push(nextPath);
  }

  function startNewChat() {
    setTicketId("");
    window.localStorage.removeItem(TICKET_KEY);
    setMessages(createInitialMessages(customerFirstName || "there"));
    setValue("");
    setError("");
    setShowFoodRequestButton(false);
    setShowFoodRequestForm(false);
    setFoodRequestDraft("");
    setSelectedHistoryId("");
    setViewMode("live");
  }

  function openHistory() {
    setViewMode("history");
    if (!selectedHistoryId && historyItems[0]?.id) {
      setSelectedHistoryId(historyItems[0].id);
    }
  }

  function goBackToSupport() {
    setViewMode("live");
    router.replace(
      inviteTokenValue
        ? `/support?invite=${encodeURIComponent(inviteTokenValue)}`
        : "/support",
    );
  }

  const hasHistory = historyItems.length > 0;
  const activeHistoryMessages = selectedHistory?.thread
    ? threadToMessages(selectedHistory.thread, getHistoryCustomerName(selectedHistory))
    : [];
  const liveMessages = messages;

  return (
    <section className="chatbot-shell support-chatbot" aria-label="Support chatbot">
      <div className="support-toolbar">
        <button className="support-back-button" onClick={goBackToSupport} type="button">
          back
        </button>
        <button className="support-new-chat-button" onClick={startNewChat} type="button">
          + new chat
        </button>
      </div>

      {viewMode === "history" ? (
        <div className="support-history-panel">
          <div className="support-history-header">
            <div>
              <p className="support-history-eyebrow">your chat history</p>
              <h2>Past conversations</h2>
            </div>
            <span className="support-history-count">{historyItems.length}</span>
          </div>

          {historyError ? <p className="chatbot-error">{historyError}</p> : null}

          <div className="support-history-list" role="list">
            {historyItems.map((item) => (
              <button
                className={`support-history-item ${item.id === selectedHistory?.id ? "is-active" : ""}`}
                key={item.id}
                onClick={() => {
                  setSelectedHistoryId(item.id);
                }}
                type="button"
              >
                <strong>{getHistoryCustomerName(item)}</strong>
                <time dateTime={item.createdAt}>{formatHistoryDate(item.createdAt)}</time>
                <span>{getHistorySnippet(item)}</span>
              </button>
            ))}
          </div>

          <div className="support-history-thread">
            {activeHistoryMessages.length ? (
              activeHistoryMessages.map((message, index) => (
                <article
                  className={`chatbot-message chatbot-message-${message.role}`}
                  key={`${message.role}-${index}`}
                >
                  <header className="chatbot-message-header">
                    <div className="chatbot-message-identity">
                      <span
                        className={`chatbot-avatar ${message.role === "user" ? "is-user" : "is-support"}`}
                        aria-hidden="true"
                      >
                        {message.role === "user"
                          ? initialsFromName(message.name || selectedHistory?.customer || customerDisplayName)
                          : "S"}
                      </span>
                      <strong>{message.name || (message.role === "user" ? selectedHistory?.customer || customerDisplayName || "You" : "Support")}</strong>
                    </div>
                    <time dateTime={message.createdAt || ""}>{formatMessageTime(message.createdAt)}</time>
                  </header>
                  {message.text}
                </article>
              ))
            ) : (
              <p className="support-history-empty">Pick a conversation to review it here.</p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="chatbot-messages">
            {liveMessages.map((message, index) => (
              <article
                className={`chatbot-message chatbot-message-${message.role}`}
                key={`${message.role}-${index}`}
              >
                <header className="chatbot-message-header">
                  <div className="chatbot-message-identity">
                    <span
                      className={`chatbot-avatar ${message.role === "user" ? "is-user" : "is-support"}`}
                      aria-hidden="true"
                    >
                      {message.role === "user"
                        ? initialsFromName(message.name || customerDisplayName)
                        : "S"}
                    </span>
                    <strong>{message.name || (message.role === "user" ? customerDisplayName || "You" : "Support")}</strong>
                  </div>
                  <time dateTime={message.createdAt || ""}>{formatMessageTime(message.createdAt)}</time>
                </header>
                {message.text}
              </article>
            ))}
          </div>

          {showFoodRequestButton ? (
            <div className="support-action-panel">
              <p>Would you like to pass this along to the host?</p>
              <button
                className="support-action-button"
                onClick={openFoodRequestForm}
                type="button"
              >
                send the request
              </button>
            </div>
          ) : null}

          {showFoodRequestForm ? (
            <form className="support-request-form" onSubmit={handleFoodRequestSubmit}>
              <label className="support-request-field">
                <span>Name</span>
                <input
                  autoComplete="name"
                  name="name"
                  onChange={(event) =>
                    setRequestForm((current) => ({ ...current, name: event.target.value }))
                  }
                  type="text"
                  value={requestForm.name}
                />
              </label>

              <label className="support-request-field">
                <span>Phone number</span>
                <input
                  autoComplete="tel"
                  inputMode="numeric"
                  name="phoneNumber"
                  onChange={(event) =>
                    setRequestForm((current) => ({ ...current, phoneNumber: event.target.value }))
                  }
                  type="tel"
                  value={requestForm.phoneNumber}
                />
              </label>

              <label className="support-request-field">
                <span>Message</span>
                <textarea
                  name="message"
                  onChange={(event) =>
                    setRequestForm((current) => ({ ...current, message: event.target.value }))
                  }
                  rows={4}
                  value={requestForm.message}
                />
              </label>

              <button className="support-request-submit" type="submit" disabled={isSubmittingRequest}>
                {isSubmittingRequest ? "sending..." : "submit"}
              </button>
            </form>
          ) : null}

          {error ? (
            <p className="chatbot-error" role="status">
              {error}
            </p>
          ) : null}

          <div className="chatbot-compose">
            <form className="chatbot-form" onSubmit={handleSubmit}>
              <input
                aria-label="Ask a question"
                placeholder="Type your question..."
                value={value}
                onChange={(event) => setValue(event.target.value)}
                type="text"
              />
              <button
                aria-label="Send message"
                className="chatbot-send-button"
                disabled={isSending}
                type="submit"
              >
                {isSending ? <span className="chatbot-send-loading">...</span> : <SendMessageIcon />}
              </button>
            </form>

            <button className="support-finish-button" onClick={finishTheChat} type="button">
              finish the chat
            </button>

            {hasHistory ? (
              <button className="support-history-button" onClick={openHistory} type="button">
                your chat history
              </button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
