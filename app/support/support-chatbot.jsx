"use client";

import { useEffect, useMemo, useState } from "react";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const TICKET_KEY = "fifa-half-time-show-support-ticket";

function createGreeting(firstName) {
  const name = firstName?.trim() || "there";
  return `Hi ${name}, how may I help you today?`;
}

function createInitialMessages(firstName) {
  return [
    {
      role: "assistant",
      text: createGreeting(firstName),
    },
  ];
}

function threadToMessages(thread) {
  return thread.map((item) => ({
    role: item.role === "customer" ? "user" : "assistant",
    text: item.message,
  }));
}

function normalize(value) {
  return String(value ?? "").trim();
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

export function SupportChatbot({ inviteToken }) {
  const inviteTokenValue = useMemo(() => (inviteToken ? String(inviteToken).trim() : ""), [inviteToken]);
  const [messages, setMessages] = useState(() => createInitialMessages("there"));
  const [value, setValue] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [showFoodRequestButton, setShowFoodRequestButton] = useState(false);
  const [showFoodRequestForm, setShowFoodRequestForm] = useState(false);
  const [foodRequestDraft, setFoodRequestDraft] = useState("");
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

  useEffect(() => {
    setRequestForm((current) => ({
      ...current,
      name: current.name || customerFirstName || "",
      phoneNumber: current.phoneNumber || inviteTokenValue || "",
    }));
  }, [customerFirstName, inviteTokenValue]);

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
      setMessages(threadToMessages(data.inquiry.thread));
    } else if (data.inquiry?.answer) {
      setMessages((current) => [...current, { role: "assistant", text: data.inquiry.answer }]);
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

    const nextMessages = [...messages, { role: "user", text: trimmed }];
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

      {showFoodRequestButton ? (
        <div className="support-action-panel">
          <p>Would you like to pass this along to the admin?</p>
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
