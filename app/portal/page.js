"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "../../components/qr-code";
import { SessionGuard } from "../../components/session-guard";

const SESSION_KEY = "fifa-half-time-show-session";
const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const venueAddress = "138 Downes Street, Toronto, ON";
const venueMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`;

async function recordActivity(eventType, extra = {}) {
  const sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    return;
  }

  try {
    await fetch(`${controlBaseUrl}/api/activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        sessionId,
        pathname: window.location.pathname,
        userAgent: window.navigator.userAgent,
        ...extra,
      }),
    });
  } catch {
    // Best effort logging only.
  }
}

function sanitizeToken(value) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || "guest";
  }

  return typeof value === "string" && value.trim() ? value.trim() : "guest";
}

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function PanelCard({ title, onClose, children }) {
  return (
    <article className="portal-card is-open">
      <div className="portal-card-header">
        <h2>{title}</h2>
        <button
          aria-label={`Close ${title}`}
          className="portal-card-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="portal-card-body">{children}</div>
    </article>
  );
}

function PortalTicketCard({
  displayName,
  inviteToken,
  phoneNumber,
  initialRsvp,
  onClose,
}) {
  const [isFolding, setIsFolding] = useState(false);
  const [rsvp, setRsvp] = useState(initialRsvp || "Going");
  const [selectedRsvp, setSelectedRsvp] = useState(initialRsvp || "Going");
  const [statusMessage, setStatusMessage] = useState("");
  const [showRsvpControls, setShowRsvpControls] = useState(true);
  const foldTimerRef = useRef(null);

  useEffect(() => {
    const nextRsvp = initialRsvp || "Going";
    setRsvp(nextRsvp);
    setSelectedRsvp(nextRsvp);
    setStatusMessage("");
    setShowRsvpControls(true);
    setIsFolding(false);
  }, [initialRsvp]);

  useEffect(() => {
    return () => {
      if (foldTimerRef.current) {
        window.clearTimeout(foldTimerRef.current);
      }
    };
  }, []);

  function handleCheckRsvp() {
    if (selectedRsvp === "Going") {
      return;
    }

    const nextRsvp = selectedRsvp;

    setRsvp(nextRsvp);
    setStatusMessage("Your RSVP has been updated!");
    setIsFolding(true);
    setShowRsvpControls(false);

    if (foldTimerRef.current) {
      window.clearTimeout(foldTimerRef.current);
    }

    foldTimerRef.current = window.setTimeout(() => {
      onClose();
    }, 2000);

    void fetch(`${controlBaseUrl}/api/invites`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteToken,
        rsvp: nextRsvp,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data?.ok && data.user) {
          setRsvp(String(data.user.rsvp ?? nextRsvp));
        }
      })
      .catch(() => {
        // Best effort persistence; UI still folds locally.
      });
  }

  return (
    <article className={`portal-card is-open ${isFolding ? "is-folding" : ""}`}>
      <div className="portal-card-header">
        <h2>about my ticket</h2>
        <button
          aria-label="Close about my ticket"
          className="portal-card-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="portal-card-body">
        <dl className="portal-ticket-meta">
          <div>
            <dt>Name</dt>
            <dd>{displayName}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{phoneNumber || inviteToken}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>Participant</dd>
          </div>
          <div>
            <dt>RSVP</dt>
            <dd>{rsvp}</dd>
          </div>
        </dl>

        {statusMessage ? <p className="portal-rsvp-message">{statusMessage}</p> : null}

        {showRsvpControls ? (
          <div className="portal-rsvp-row">
            <label className="portal-rsvp-select">
              <span>RSVP</span>
              <select
                value={selectedRsvp}
                onChange={(event) => setSelectedRsvp(event.target.value)}
              >
                <option value="Going">Going</option>
                <option value="maybe">maybe</option>
                <option value="not going">not going</option>
              </select>
            </label>

            <button className="portal-rsvp-check" onClick={handleCheckRsvp} type="button">
              ✓
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function PortalPage({ searchParams }) {
  const router = useRouter();
  const inviteToken = sanitizeToken(searchParams?.invite);
  const [activePanel, setActivePanel] = useState(null);
  const [invite, setInvite] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    rsvp: "Going",
  });

  const displayName = useMemo(() => {
    const fullName = [normalize(invite.firstName), normalize(invite.lastName)]
      .filter(Boolean)
      .join(" ")
      .trim();
    return fullName || "Guest";
  }, [invite.firstName, invite.lastName]);

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      router.replace("/");
      return;
    }

    void recordActivity("portal-view", {
      inviteToken,
    });
  }, [inviteToken, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      try {
        const response = await fetch(
          `${controlBaseUrl}/api/invites/lookup?inviteToken=${encodeURIComponent(inviteToken)}`,
        );
        const data = await response.json();

        if (!cancelled && response.ok && data.ok && data.invite) {
          setInvite({
            firstName: normalize(data.invite.firstName),
            lastName: normalize(data.invite.lastName),
            phoneNumber: normalize(data.invite.phoneNumber),
            rsvp: normalize(data.invite.rsvp) || "Going",
          });
        }
      } catch {
        // Best effort only.
      }
    }

    void loadInvite();

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  if (typeof window !== "undefined" && !sessionStorage.getItem(SESSION_KEY)) {
    return null;
  }

  return (
    <main className="app-frame portal-page">
      <SessionGuard />
      <section className="portal-shell">
        <header className="portal-header">
          <h1>You are going</h1>
        </header>

        <section className="portal-qr-area" aria-label="Your QR code">
          <QrCode
            token={inviteToken}
            caption="This QR code is only valid for the invited number"
          />
        </section>

        <section className="portal-actions" aria-label="Portal actions">
          {activePanel === "ticket" ? (
            <PortalTicketCard
              displayName={displayName}
              inviteToken={inviteToken}
              phoneNumber={invite.phoneNumber}
              initialRsvp={invite.rsvp}
              onClose={() => setActivePanel(null)}
            />
          ) : (
            <button
              className="portal-action-button"
              onClick={() => setActivePanel("ticket")}
              type="button"
            >
              about my ticket
            </button>
          )}

          {activePanel === "venue" ? (
            <PanelCard title="about the venue" onClose={() => setActivePanel(null)}>
              <p className="portal-card-copy">
                The venue is{" "}
                <a className="portal-venue-link" href={venueMapUrl} target="_blank" rel="noreferrer">
                  {venueAddress}
                </a>
                . Tap the address to open Google Maps.
              </p>
            </PanelCard>
          ) : (
            <button
              className="portal-action-button"
              onClick={() => setActivePanel("venue")}
              type="button"
            >
              about the venue
            </button>
          )}

          <Link className="portal-action-button portal-action-link" href={`/support?invite=${encodeURIComponent(inviteToken)}`}>
            questions?
          </Link>
        </section>
      </section>
    </main>
  );
}
