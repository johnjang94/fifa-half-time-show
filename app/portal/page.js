"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QrCode } from "../../components/qr-code";
import { SessionGuard } from "../../components/session-guard";
import loungeImage from "../../lounge.jpg";

const SESSION_KEY = "fifa-half-time-show-session";
const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const PORTAL_PROFILE_KEY = "fifa-half-time-show-portal-profile";
const SUPPORT_ACCESS_KEY = "fifa-half-time-show-support-access-token";
const venueAddress = "138 Downes Street, Toronto, ON M5E 0E4";
const venueMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`;
const RSVP_CHANGE_LOCK_AT = new Date("2026-07-17T00:00:00-04:00");

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

function readInviteToken(value) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || "";
  }

  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readInviteField(invite, camelKey, snakeKey) {
  return normalize(invite?.[camelKey] ?? invite?.[snakeKey]);
}

function sanitizeBarcode(value) {
  const digits = normalize(value).replace(/\D/g, "");
  return digits.length === 5 ? digits : "";
}

function savePortalProfile(profile) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(PORTAL_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Best effort only.
  }
}

function saveSupportAccessToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  const safeToken = normalize(token);
  if (!safeToken) {
    return;
  }

  window.localStorage.setItem(SUPPORT_ACCESS_KEY, safeToken);
}

function formatPhoneNumber(value) {
  const digits = normalize(value).replace(/\D/g, "");

  if (digits.length !== 10) {
    return normalize(value);
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function normalizeRsvp(value) {
  const normalized = normalize(value).toLowerCase();

  if (normalized === "going") {
    return "Going";
  }

  if (normalized === "maybe") {
    return "maybe";
  }

  if (normalized === "not going") {
    return "not going";
  }

  return "Going";
}

function getPortalTitle(rsvp) {
  if (rsvp === "maybe") {
    return "Are you going?";
  }

  if (rsvp === "not going") {
    return "You cant make it";
  }

  return "You are going";
}

function LockedNoticeModal({ onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        aria-modal="true"
        className="portal-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="portal-modal-kicker">things to know</p>
        <h2>stay tuned for future announcements!</h2>
        <button className="portal-modal-close" onClick={onClose} type="button">
          close
        </button>
      </article>
    </div>
  );
}

function ThingsToKnowCard({ onLockedClick }) {
  return (
    <article className="portal-card portal-things-card">
      <button
        aria-label="Things to know, locked"
        className="portal-things-trigger"
        onClick={onLockedClick}
        type="button"
      >
        <span>things to know</span>
        <span aria-hidden="true" className="portal-things-trigger-lock">
          🔒
        </span>
      </button>
    </article>
  );
}

function PortalTicketCard({
  displayName,
  inviteToken,
  phoneNumber,
  rsvp,
  onRsvpChange,
  onClose,
}) {
  const [clockTick, setClockTick] = useState(() => Date.now());
  const locked = clockTick >= RSVP_CHANGE_LOCK_AT.getTime();

  useEffect(() => {
    const delay = Math.max(0, RSVP_CHANGE_LOCK_AT.getTime() - Date.now());
    const timer = window.setTimeout(() => {
      setClockTick(Date.now());
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function handleRsvpChange(nextRsvp) {
    if (locked) {
      return;
    }

    if (nextRsvp === rsvp) {
      return;
    }

    onRsvpChange(nextRsvp);

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
          onRsvpChange(normalizeRsvp(data.user.rsvp ?? nextRsvp));
        }
      })
      .catch(() => {
        // Best effort persistence; keep the optimistic UI state.
      });
  }

  return (
    <article className="portal-card is-open">
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
            <dd>{formatPhoneNumber(phoneNumber) || inviteToken}</dd>
          </div>
        </dl>

        <div className="portal-rsvp-row">
          <select
            aria-label="RSVP"
            className="portal-rsvp-select"
            value={rsvp}
            disabled={locked}
            onChange={(event) => handleRsvpChange(event.target.value)}
          >
            <option value="Going">Going</option>
            <option value="maybe">maybe</option>
            <option value="not going">not going</option>
          </select>
        </div>

        <p className="portal-rsvp-note">
          make sure you finalize whether you can make it or not in 48 hours prior to the event day.
        </p>
      </div>
    </article>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={null}>
      <PortalPageInner />
    </Suspense>
  );
}

function PortalPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = useMemo(() => readInviteToken(searchParams?.get("invite")), [searchParams]);
  const [activePanel, setActivePanel] = useState(null);
  const [showLockedNotice, setShowLockedNotice] = useState(false);
  const [invite, setInvite] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    rsvp: "Going",
    barcode: "",
    checkedInAt: "",
  });
  const portalTitle = getPortalTitle(invite.rsvp);
  const isCheckedIn = Boolean(invite.checkedInAt);

  const displayName = useMemo(() => {
    const fullName = [normalize(invite.firstName), normalize(invite.lastName)]
      .filter(Boolean)
      .join(" ")
      .trim();
    return fullName || "guest";
  }, [invite.firstName, invite.lastName]);

  useEffect(() => {
    if (!inviteToken) {
      router.replace("/");
      return;
    }

    if (!sessionStorage.getItem(SESSION_KEY)) {
      router.replace("/");
      return;
    }

    void recordActivity("portal-view", {
      inviteToken,
    });
  }, [inviteToken, router]);

  useEffect(() => {
    if (!inviteToken) {
      return;
    }

    let cancelled = false;

    async function loadInvite() {
      try {
        const response = await fetch(
          `${controlBaseUrl}/api/invites/lookup?inviteToken=${encodeURIComponent(inviteToken)}`,
        );
        const data = await response.json();

        if (!cancelled && response.ok && data.ok && data.invite) {
          const firstName = readInviteField(data.invite, "firstName", "first_name");
          const lastName = readInviteField(data.invite, "lastName", "last_name");
          const phoneNumber = readInviteField(data.invite, "phoneNumber", "phone_number");
          const barcode = sanitizeBarcode(readInviteField(data.invite, "barcode", "barcode"));
          const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || firstName || "guest";
          saveSupportAccessToken(data.supportAccessToken);

          setInvite({
            firstName,
            lastName,
            phoneNumber,
            barcode,
            checkedInAt: data.invite.checkedInAt ?? data.invite.checked_in_at ?? "",
            rsvp: normalizeRsvp(data.invite.rsvp ?? data.invite.RSVP),
          });
          savePortalProfile({
            firstName,
            lastName,
            displayName,
            phoneNumber,
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

  if (!inviteToken) {
    return null;
  }

  return (
    <main className="app-frame portal-page">
      <SessionGuard />
      <section className="portal-shell">
        {isCheckedIn ? (
          <p className="portal-checkin-banner">You have been checked-in</p>
        ) : null}

        <header className="portal-header">
          <h1>{portalTitle}</h1>
        </header>

        <section className="portal-qr-area" aria-label="Your QR code">
          <QrCode
            token={inviteToken}
            caption=""
            barcode={invite.barcode}
          />
        </section>

        <section className="portal-actions" aria-label="Portal actions">
          {activePanel === "ticket" ? (
            <PortalTicketCard
              displayName={displayName}
              inviteToken={inviteToken}
              phoneNumber={invite.phoneNumber}
              rsvp={invite.rsvp}
              onRsvpChange={(nextRsvp) =>
                setInvite((current) => ({ ...current, rsvp: normalizeRsvp(nextRsvp) }))
              }
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

          <ThingsToKnowCard onLockedClick={() => setShowLockedNotice(true)} />

          <Link className="portal-action-button portal-action-link" href={`/support?invite=${encodeURIComponent(inviteToken)}`}>
            questions?
          </Link>

          <button
            className="portal-action-button portal-logout-button"
            onClick={() => router.push("/")}
            type="button"
          >
            logout
          </button>
        </section>
      </section>
      {showLockedNotice ? <LockedNoticeModal onClose={() => setShowLockedNotice(false)} /> : null}
    </main>
  );
}
