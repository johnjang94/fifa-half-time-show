"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePersistentInviteToken } from "../../components/use-persistent-invite-token";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const realtimeBaseUrl =
  process.env.NEXT_PUBLIC_REALTIME_URL ?? "https://fifa-realtime.onrender.com";
const TICKET_KEY = "fifa-half-time-show-support-ticket";
const SUPPORT_ACCESS_KEY = "fifa-half-time-show-support-access-token";
const PORTAL_PROFILE_KEY = "fifa-half-time-show-portal-profile";

const SUPPORT_ASSISTANT_NAME = "Miranda";

function normalize(value) {
  return String(value ?? "").trim();
}

function readSupportAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return normalize(window.localStorage.getItem(SUPPORT_ACCESS_KEY));
}

function saveSupportAccessToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  if (!normalize(token)) {
    window.localStorage.removeItem(SUPPORT_ACCESS_KEY);
    return;
  }

  window.localStorage.setItem(SUPPORT_ACCESS_KEY, token);
}

function readPortalProfile() {
  if (typeof window === "undefined") {
    return {
      firstName: "",
      lastName: "",
      displayName: "",
      phoneNumber: "",
      photoUrl: "",
      photoTag: "",
    };
  }

  try {
    const raw = window.localStorage.getItem(PORTAL_PROFILE_KEY);
    if (!raw) {
      return {
        firstName: "",
        lastName: "",
        displayName: "",
        phoneNumber: "",
        photoUrl: "",
        photoTag: "",
      };
    }

    const parsed = JSON.parse(raw);
    return {
      firstName: normalize(parsed.firstName),
      lastName: normalize(parsed.lastName),
      displayName: normalize(parsed.displayName),
      phoneNumber: normalize(parsed.phoneNumber),
      photoUrl: normalize(parsed.photoUrl),
      photoTag: normalize(parsed.photoTag),
    };
  } catch {
    return {
      firstName: "",
      lastName: "",
      displayName: "",
      phoneNumber: "",
      photoUrl: "",
      photoTag: "",
    };
  }
}

function createInitialMessages(name = "there") {
  const createdAt = new Date().toISOString();
  return [
    {
      role: "assistant",
      name: SUPPORT_ASSISTANT_NAME,
      text: `Hi ${name}, welcome to FIFA X BTS support. My name is Miranda. I can help with registration, the waitlist, survey, login, the activity hub, the information section, privacy policy questions, ticket details, and general event navigation. What do you need help with today?`,
      createdAt,
    },
  ];
}

function threadToMessages(thread, customerName = "Unknown guest", customerPhotoUrl = "", customerPhotoTag = "") {
  return thread.map((item) => ({
    role: item.role === "customer" ? "user" : "assistant",
    name: item.role === "customer" ? customerName : normalize(item.senderName) || SUPPORT_ASSISTANT_NAME,
    text: item.message,
    createdAt: item.createdAt,
    photoUrl: item.role === "customer" ? customerPhotoUrl : "",
    photoTag: item.role === "customer" ? customerPhotoTag : "",
  }));
}

function threadSignature(thread) {
  if (!Array.isArray(thread) || !thread.length) {
    return "";
  }

  return thread
    .map((item) => [item.role, item.message, item.createdAt].map((part) => normalize(part)).join("|"))
    .join("||");
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

function isPlaceholderCustomerName(value) {
  const name = normalize(value);
  return !name || name === "You" || name === "Unknown guest";
}

async function sendSupportPresenceUpdate(ticketId, state, supportAccessToken) {
  const safeTicketId = normalize(ticketId);
  const safeState = state === "inactive" ? "inactive" : "active";
  const safeToken = normalize(supportAccessToken);

  if (!safeTicketId || !safeToken) {
    return;
  }

  try {
    await fetch(`${apiBaseUrl}/api/support/inquiries/presence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${safeToken}`,
      },
      body: JSON.stringify({
        ticketId: safeTicketId,
        state: safeState,
      }),
      keepalive: true,
    });
  } catch {
    // Best effort only.
  }
}

function getRealtimeSocketUrl(roomId) {
  const safeRoomId = normalize(roomId);
  if (!safeRoomId) {
    return "";
  }

  const url = new URL("/ws", realtimeBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("room", safeRoomId);
  return url.toString();
}

function getCustomerName(profile, inviteProfile) {
  return (
    inviteProfile?.displayName ||
    inviteProfile?.firstName ||
    profile.displayName ||
    profile.firstName ||
    "You"
  );
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

export function SupportChatThread({ inviteToken }) {
  const { inviteToken: inviteTokenValue, isResolved } = usePersistentInviteToken(inviteToken);
  const [messages, setMessages] = useState(() => createInitialMessages("there"));
  const [value, setValue] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerDisplayName, setCustomerDisplayName] = useState("");
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState("");
  const [customerPhotoTag, setCustomerPhotoTag] = useState("");
  const [portalProfile, setPortalProfile] = useState(() => readPortalProfile());
  const [supportAccessToken, setSupportAccessToken] = useState(() => readSupportAccessToken());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const lastSyncedThreadSignatureRef = useRef("");
  const liveThreadPollTimerRef = useRef(null);
  const liveThreadPollFailureCountRef = useRef(0);
  const liveSocketRef = useRef(null);
  const liveSocketReconnectTimerRef = useRef(null);
  const liveSocketReconnectAttemptRef = useRef(0);

  const resolvedCustomerName =
    customerDisplayName ||
    customerFirstName ||
    portalProfile.displayName ||
    portalProfile.firstName ||
    "Unknown guest";

  const syncLiveInquiry = (inquiry) => {
    if (!Array.isArray(inquiry?.thread)) {
      return;
    }

    const nextSignature = threadSignature(inquiry.thread);
    if (!nextSignature || nextSignature === lastSyncedThreadSignatureRef.current) {
      return;
    }

    lastSyncedThreadSignatureRef.current = nextSignature;
    setMessages(
      threadToMessages(
        inquiry.thread,
        inquiry.customer || resolvedCustomerName,
        inquiry.customerPhotoUrl || customerPhotoUrl,
        inquiry.customerPhotoTag || customerPhotoTag,
      ),
    );
  };

  useEffect(() => {
    const savedTicketId = window.localStorage.getItem(TICKET_KEY);
    if (savedTicketId) {
      setTicketId(savedTicketId);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      if (!isResolved) {
        return;
      }

      const storedProfile = readPortalProfile();
      setPortalProfile(storedProfile);

      if (!inviteTokenValue) {
        const nextName = getCustomerName(storedProfile, storedProfile);
        setCustomerFirstName(storedProfile.firstName);
        setCustomerDisplayName(storedProfile.displayName || [storedProfile.firstName, storedProfile.lastName].filter(Boolean).join(" ").trim());
        setCustomerPhotoUrl(storedProfile.photoUrl);
        setCustomerPhotoTag(storedProfile.photoTag);
        setMessages(createInitialMessages(nextName || "there"));
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
        const displayName =
          fullName || firstName || storedProfile.displayName || storedProfile.firstName || "Unknown guest";
        const phoneNumber = normalize(data.invite?.phoneNumber);
        const photoUrl = normalize(data.invite?.profilePhotoUrl);
        const photoTag = normalize(data.invite?.profilePhotoTag);
        const nextAccessToken = normalize(data.supportAccessToken);

        setCustomerFirstName(firstName);
        setCustomerDisplayName(displayName);
        setCustomerPhotoUrl(photoUrl || storedProfile.photoUrl);
        setCustomerPhotoTag(photoTag || storedProfile.photoTag);
        if (nextAccessToken) {
          setSupportAccessToken(nextAccessToken);
          saveSupportAccessToken(nextAccessToken);
        }
        setPortalProfile({
          firstName: firstName || storedProfile.firstName,
          lastName: lastName || storedProfile.lastName,
          displayName,
          phoneNumber: phoneNumber || storedProfile.phoneNumber,
          photoUrl: photoUrl || storedProfile.photoUrl,
          photoTag: photoTag || storedProfile.photoTag,
        });
        window.localStorage.setItem(
          PORTAL_PROFILE_KEY,
          JSON.stringify({
            firstName: firstName || storedProfile.firstName,
            lastName: lastName || storedProfile.lastName,
            displayName,
            phoneNumber: phoneNumber || storedProfile.phoneNumber,
            photoUrl: photoUrl || storedProfile.photoUrl,
            photoTag: photoTag || storedProfile.photoTag,
          }),
        );
        setMessages(createInitialMessages(firstName || displayName || "there"));
      } catch {
        if (!cancelled) {
          const nextName = storedProfile.displayName || [storedProfile.firstName, storedProfile.lastName].filter(Boolean).join(" ").trim();
          setCustomerFirstName(storedProfile.firstName);
          setCustomerDisplayName(nextName);
          setCustomerPhotoUrl(storedProfile.photoUrl);
          setCustomerPhotoTag(storedProfile.photoTag);
          setMessages(createInitialMessages(nextName || storedProfile.firstName || "there"));
        }
      }
    }

    void loadInvite();

    return () => {
      cancelled = true;
    };
  }, [inviteTokenValue, isResolved]);

  useEffect(() => {
    if (!isResolved || !ticketId) {
      return undefined;
    }

    const storedToken = supportAccessToken || readSupportAccessToken();
    if (!storedToken) {
      setError("Support access is missing. Please reopen your invite.");
      return undefined;
    }

    let cancelled = false;
    let intervalId = null;

    async function pingPresence(state) {
      if (cancelled) {
        return;
      }

      await sendSupportPresenceUpdate(ticketId, state, storedToken);
    }

    void pingPresence("active");

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void pingPresence("inactive");
        return;
      }

      void pingPresence("active");
    };

    const handlePageHide = () => {
      void pingPresence("inactive");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    intervalId = window.setInterval(() => {
      void pingPresence("active");
    }, 15000);

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      void sendSupportPresenceUpdate(ticketId, "inactive", storedToken);
    };
  }, [isResolved, supportAccessToken, ticketId]);

  useEffect(() => {
    if (!isResolved || !ticketId) {
      return undefined;
    }

    const socketUrl = getRealtimeSocketUrl(ticketId);
    if (!socketUrl || typeof window.WebSocket !== "function") {
      return undefined;
    }

    let cancelled = false;

    function clearReconnectTimer() {
      if (liveSocketReconnectTimerRef.current) {
        window.clearTimeout(liveSocketReconnectTimerRef.current);
        liveSocketReconnectTimerRef.current = null;
      }
    }

    function closeSocket() {
      if (!liveSocketRef.current) {
        return;
      }

      try {
        liveSocketRef.current.close();
      } catch {
        // Ignore cleanup close failures.
      }

      liveSocketRef.current = null;
    }

    function connect() {
      if (cancelled) {
        return;
      }

      closeSocket();
      const socket = new WebSocket(socketUrl);
      liveSocketRef.current = socket;

      socket.onopen = () => {
        if (cancelled) {
          return;
        }

        liveSocketReconnectAttemptRef.current = 0;
        clearReconnectTimer();
      };

      socket.onmessage = (event) => {
        if (cancelled) {
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data?.type === "inquiry.updated" && data?.room === ticketId && data?.inquiry?.thread) {
            syncLiveInquiry(data.inquiry);
          }
        } catch {
          // Ignore malformed websocket payloads.
        }
      };

      socket.onerror = () => {
        if (cancelled) {
          return;
        }

        try {
          socket.close();
        } catch {
          // Ignore close failures.
        }
      };

      socket.onclose = () => {
        if (cancelled) {
          return;
        }

        const attempt = liveSocketReconnectAttemptRef.current + 1;
        liveSocketReconnectAttemptRef.current = attempt;
        const delay = Math.min(15000, 500 * 2 ** Math.min(attempt - 1, 5));

        clearReconnectTimer();
        liveSocketReconnectTimerRef.current = window.setTimeout(() => {
          liveSocketReconnectTimerRef.current = null;
          connect();
        }, delay);
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      closeSocket();
      liveSocketReconnectAttemptRef.current = 0;
    };
  }, [isResolved, ticketId]);

  useEffect(() => {
    if (!isResolved || !ticketId) {
      return undefined;
    }

    const storedToken = supportAccessToken || readSupportAccessToken();
    if (!storedToken) {
      return undefined;
    }

    let cancelled = false;

    async function refreshCurrentThread() {
      if (cancelled) {
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/support/inquiries?ticketId=${encodeURIComponent(ticketId)}`,
          {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          },
        );
        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? "Unable to load chat.");
        }

        liveThreadPollFailureCountRef.current = 0;
        setError("");
        setConnectionStatus("");

        if (data.inquiry?.thread) {
          syncLiveInquiry(data.inquiry);
          void sendSupportPresenceUpdate(ticketId, "active", storedToken);
        }
      } catch {
        if (cancelled) {
          return;
        }

        const nextFailureCount = liveThreadPollFailureCountRef.current + 1;
        liveThreadPollFailureCountRef.current = nextFailureCount;

        if (nextFailureCount >= 3) {
          setConnectionStatus("Reconnecting live support...");
        } else {
          setConnectionStatus((current) => current || "Connecting live support...");
        }
      }
    }

    void refreshCurrentThread();
    liveThreadPollTimerRef.current = window.setInterval(() => {
      void refreshCurrentThread();
    }, 2500);

    return () => {
      cancelled = true;
      if (liveThreadPollTimerRef.current) {
        window.clearInterval(liveThreadPollTimerRef.current);
        liveThreadPollTimerRef.current = null;
      }
      liveThreadPollFailureCountRef.current = 0;
    };
  }, [isResolved, supportAccessToken, ticketId]);

  useEffect(() => {
    if (!customerDisplayName && !customerPhotoUrl) {
      return;
    }

    setMessages((current) => {
      let changed = false;
      const nextMessages = current.map((message) => {
        if (message.role !== "user") {
          return message;
        }

        const nextName = isPlaceholderCustomerName(message.name)
          ? customerDisplayName || customerFirstName || portalProfile.displayName || portalProfile.firstName || "Unknown guest"
          : message.name;
        const shouldUpdatePhoto = !normalize(message.photoUrl) && Boolean(customerPhotoUrl);

        if (nextName !== message.name || shouldUpdatePhoto) {
          changed = true;
          return {
            ...message,
            name: nextName,
            photoUrl: shouldUpdatePhoto ? customerPhotoUrl : message.photoUrl,
          };
        }

        return message;
      });

      return changed ? nextMessages : current;
    });
  }, [customerDisplayName, customerFirstName, customerPhotoUrl, portalProfile.displayName, portalProfile.firstName]);

  async function postSupportMessage(body) {
    const storedToken = supportAccessToken || readSupportAccessToken();
    if (!storedToken) {
      throw new Error("Support access is missing. Please reopen your invite.");
    }

    const response = await fetch(`${apiBaseUrl}/api/support/inquiries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${storedToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error ?? "Unable to send support message.");
    }

    if (data.ticketId) {
      setTicketId(data.ticketId);
      window.localStorage.setItem(TICKET_KEY, data.ticketId);
      void sendSupportPresenceUpdate(data.ticketId, "active", supportAccessToken);
    }

    if (data.inquiry?.thread) {
      syncLiveInquiry(data.inquiry);
    }

    return data;
  }

  async function loadChatHistory() {
    const storedToken = supportAccessToken || readSupportAccessToken();
    if (!storedToken) {
      throw new Error("Support access is missing. Please reopen your invite.");
    }

    setIsHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/support/inquiries/history`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Unable to load chat history.");
      }

      setHistoryItems(Array.isArray(data.inquiries) ? data.inquiries : []);
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function sendSupportText(text, { restoreDraftText = "" } = {}) {
    const trimmed = normalize(text);
    if (!trimmed || isSending) {
      return;
    }

    setIsSending(true);
    setError("");

    const userMessage = {
      role: "user",
      name: resolvedCustomerName,
      text: trimmed,
      createdAt: new Date().toISOString(),
      photoUrl: customerPhotoUrl,
      photoTag: customerPhotoTag,
    };
    const nextMessages = [
      ...messages,
      userMessage,
    ];
    const thinkingMessages = [
      ...nextMessages,
      {
        role: "assistant",
        name: SUPPORT_ASSISTANT_NAME,
        text: "thinking...",
        createdAt: new Date().toISOString(),
      },
    ];
    setMessages(thinkingMessages);
    setValue("");

    try {
      await postSupportMessage({
        inviteToken: inviteTokenValue,
        message: trimmed,
        ticketId: ticketId || undefined,
        contactName: resolvedCustomerName,
        contactPhoneNumber: portalProfile.phoneNumber || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send support message.");
      setMessages(nextMessages);
      if (restoreDraftText) {
        setValue(restoreDraftText);
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    void sendSupportText(value, { restoreDraftText: value });
  }

  async function toggleChatHistory() {
    if (isHistoryOpen) {
      setIsHistoryOpen(false);
      return;
    }

    setIsHistoryOpen(true);

    try {
      if (!historyItems.length) {
        await loadChatHistory();
      }
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Unable to load chat history.");
    }
  }

  function finishTheChat() {
    window.localStorage.removeItem(TICKET_KEY);
    setTicketId("");
    lastSyncedThreadSignatureRef.current = "";
    setMessages(createInitialMessages(resolvedCustomerName || "there"));
    setValue("");
    setError("");
    setConnectionStatus("");
  }

  const hasMessageDraft = value.trim().length > 0;
  const hasStartedConversation = ticketId && messages.some((message) => message.role === "user");

  return (
    <section className="chatbot-shell support-chatbot" aria-label="Support chat">
      <div className="support-top-actions">
        <Link className="support-back-button" href="/portal">
          back
        </Link>
      </div>

      <div className="support-chat-stage">
        <div className="support-live-panel">
          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <article className={`chatbot-message chatbot-message-${message.role}`} key={`${message.role}-${index}`}>
                <header className="chatbot-message-header">
                  <div className="chatbot-message-identity">
                    <span
                      className={`chatbot-avatar ${message.role === "user" ? "is-user" : "is-support"}`}
                      aria-hidden="true"
                    >
                      {message.role === "user" && message.photoUrl ? (
                        <img alt="" src={message.photoUrl} />
                      ) : message.role === "user" ? (
                        initialsFromName(message.name || resolvedCustomerName)
                      ) : (
                        initialsFromName(message.name || SUPPORT_ASSISTANT_NAME)
                      )}
                    </span>
                    <span className="chatbot-message-name-wrap">
                      <strong>
                        {message.role === "user"
                          ? isPlaceholderCustomerName(message.name)
                            ? resolvedCustomerName || "You"
                            : message.name
                          : message.name || SUPPORT_ASSISTANT_NAME}
                      </strong>
                      {message.role === "user" && normalize(message.photoTag) ? (
                        <span className="chatbot-profile-tag">{message.photoTag}</span>
                      ) : null}
                    </span>
                  </div>
                  <time dateTime={message.createdAt || ""}>{formatMessageTime(message.createdAt)}</time>
                </header>
                {message.text}
              </article>
            ))}
          </div>

          {hasStartedConversation && connectionStatus ? (
            <p className="chatbot-connection-status" role="status" aria-live="polite">
              {connectionStatus}
            </p>
          ) : null}

          {error ? (
            <p className="chatbot-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="chatbot-compose">
            <form className="chatbot-form" onSubmit={handleSubmit}>
              <input
                aria-label="Send a message"
                placeholder="Type your message..."
                value={value}
                onChange={(event) => setValue(event.target.value)}
                type="text"
              />
              <button
                aria-label="Send message"
                className={`chatbot-send-button ${hasMessageDraft ? "is-ready" : "is-idle"}`}
                disabled={isSending || !hasMessageDraft}
                type="submit"
              >
                {isSending ? <span className="chatbot-send-loading">...</span> : <SendMessageIcon />}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="support-footer">
        <div className="support-bottom-actions">
          <button className="support-finish-button" onClick={finishTheChat} type="button">
            finish the chat
          </button>
          <button className="support-history-button" onClick={toggleChatHistory} type="button">
            chat history
          </button>
        </div>

        {isHistoryOpen ? (
          <section className="support-history-drawer" aria-label="Chat history">
            <header className="support-history-header">
              <div>
                <p className="support-history-eyebrow">history</p>
                <h2>recent chats</h2>
              </div>
              <div className="support-history-header-actions">
                <div className="support-history-count">{historyItems.length}</div>
                <button
                  className="support-history-close-button"
                  onClick={() => setIsHistoryOpen(false)}
                  type="button"
                >
                  close
                </button>
              </div>
            </header>

            {historyError ? <p className="chatbot-error">{historyError}</p> : null}

            {isHistoryLoading ? (
              <p className="support-hub-empty">loading history...</p>
            ) : historyItems.length ? (
              <div className="support-history-list">
                {historyItems.map((item) => {
                  const title = normalize(item.summaryTitle) || normalize(item.question) || "Support chat";
                  const snippet =
                    normalize(item.answer) ||
                    normalize(item.requestReason) ||
                    "Open conversation";
                  const updatedAt = formatMessageTime(item.updatedAt || item.createdAt);
                  const isUnread = Boolean(item.supportChatState && item.supportChatState !== "inactive");
                  const isAdmin = normalize(item.currentAgent) && normalize(item.currentAgent) !== "Unassigned";

                  return (
                    <article
                      className={`support-history-item ${isUnread ? "is-unread" : ""} ${isAdmin ? "is-active" : ""}`}
                      key={item.id}
                    >
                      <div className="support-history-item-copy">
                        <strong>{title}</strong>
                        <span className="support-history-snippet">{snippet}</span>
                      </div>
                      <div className="support-history-item-markers">
                        <span className={`support-history-dot ${isUnread ? "is-unread" : ""}`} aria-hidden="true" />
                        <span className={`support-history-dot ${isAdmin ? "is-admin" : ""}`} aria-hidden="true" />
                        <time dateTime={item.updatedAt || item.createdAt || ""}>{updatedAt}</time>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="support-hub-empty">no chat history yet.</p>
            )}
          </section>
        ) : null}
      </div>
    </section>
  );
}
