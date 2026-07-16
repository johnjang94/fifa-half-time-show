"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { QrCode } from "../../components/qr-code";
import { SessionGuard } from "../../components/session-guard";
import { SESSION_KEY } from "../../components/session-lifecycle";
import { usePersistentInviteToken } from "../../components/use-persistent-invite-token";

const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const PORTAL_PROFILE_KEY = "fifa-half-time-show-portal-profile";
const SUPPORT_ACCESS_KEY = "fifa-half-time-show-support-access-token";
const venueAddress = "138 Downes Street, Toronto, ON M5E 0E4";
const venueMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`;
const venueMapThumbnailUrl =
  "https://staticmap.openstreetmap.de/staticmap.php?center=43.6448,-79.3722&zoom=15&size=900x520&markers=43.6448,-79.3722,red-pushpin";

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

function ActivityDisclosure({ title, children }) {
  return (
    <details className="portal-card portal-things-card activity-hub-disclosure">
      <summary className="portal-things-trigger">
        <span>{title}</span>
        <span aria-hidden="true" className="portal-things-trigger-lock">
          ⌄
        </span>
      </summary>
      <div className="portal-things-card-body">
        <div className="activity-hub-card-copy">{children}</div>
      </div>
    </details>
  );
}

export default function ActivityHubPage() {
  return (
    <Suspense fallback={null}>
      <ActivityHubPageInner />
    </Suspense>
  );
}

function ActivityHubPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { inviteToken, isResolved } = usePersistentInviteToken(searchParams?.get("invite"));
  const [isVisible, setIsVisible] = useState(false);
  const [invite, setInvite] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    rsvp: "Going",
    barcode: "",
    checkedInAt: "",
    profilePhotoUrl: "",
    profilePhotoTag: "",
    profilePhotoAiGenerated: false,
  });
  const portalTitle = "Information";
  const isCheckedIn = Boolean(invite.checkedInAt);

  const displayName = (() => {
    const fullName = [normalize(invite.firstName), normalize(invite.lastName)]
      .filter(Boolean)
      .join(" ")
      .trim();
    return fullName || "guest";
  })();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isResolved) {
      return;
    }

    if (!inviteToken) {
      router.replace("/");
      return;
    }

    if (!sessionStorage.getItem(SESSION_KEY)) {
      router.replace("/");
      return;
    }
  }, [inviteToken, isResolved, router]);

  useEffect(() => {
    if (!isResolved || !inviteToken) {
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
          const profilePhotoUrl = data.invite.profilePhotoUrl ?? "";
          const profilePhotoTag = data.invite.profilePhotoTag ?? "";
          const profilePhotoAiGenerated = Boolean(data.invite.profilePhotoAiGenerated);

          setInvite({
            firstName,
            lastName,
            phoneNumber,
            barcode,
            checkedInAt: data.invite.checkedInAt ?? data.invite.checked_in_at ?? "",
            rsvp: normalizeRsvp(data.invite.rsvp ?? data.invite.RSVP),
            profilePhotoUrl,
            profilePhotoTag,
            profilePhotoAiGenerated,
          });
          savePortalProfile({
            firstName,
            lastName,
            displayName,
            phoneNumber,
            photoUrl: profilePhotoUrl,
            photoTag: profilePhotoTag,
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
  }, [inviteToken, isResolved]);

  if (!isResolved) {
    return null;
  }

  if (typeof window !== "undefined" && !sessionStorage.getItem(SESSION_KEY)) {
    return null;
  }

  if (!inviteToken) {
    return null;
  }

  return (
    <main className={`app-frame portal-page activity-hub-page ${isVisible ? "is-visible" : ""}`}>
      <SessionGuard />
      <section className="portal-shell activity-hub-shell">
        <div className="activity-hub-top-row">
          <Link
            aria-label="Back to portal"
            className="activity-hub-back-button"
            href={`/portal?invite=${encodeURIComponent(inviteToken)}`}
          >
            <FiArrowLeft />
          </Link>
        </div>

        {isCheckedIn ? <p className="portal-checkin-banner">You have been checked-in</p> : null}

        <header className="portal-header">
          <h1>{portalTitle}</h1>
        </header>

        <section className="portal-qr-area" aria-label="Your QR code">
          <QrCode token={inviteToken} caption="" barcode={invite.barcode} />
        </section>

        <section className="portal-actions activity-hub-actions" aria-label="Activity hub actions">
          <ActivityDisclosure title="What is provided">
            <p className="portal-card-copy">
              Gluten free sausages, chicken, fruit salad, skewers, salmon rice, and more will be
              provided.
            </p>
          </ActivityDisclosure>

          <ActivityDisclosure title="About the venue">
            <Link
              className="activity-hub-venue-map-link"
              href={venueMapUrl}
              rel="noreferrer"
              target="_blank"
            >
              <img
                alt="Map to the venue"
                className="activity-hub-venue-map"
                src={venueMapThumbnailUrl}
              />
            </Link>
            <p className="portal-card-copy activity-hub-venue-copy">
              we are going to have our party <Link className="activity-hub-inline-link" href={venueMapUrl} rel="noreferrer" target="_blank">here</Link>.
            </p>
          </ActivityDisclosure>

          <ActivityDisclosure title="Date &amp; Time">
            <dl className="activity-hub-datetime">
              <div>
                <dt>Date</dt>
                <dd>Sunday, July 19, 2026</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>1 PM ~ 5 PM EST</dd>
              </div>
            </dl>
          </ActivityDisclosure>

          <ActivityDisclosure title="Bring Your Own">
            <p className="portal-card-copy">
              We are looking for a volunteer who is willing to bring some corn, mushrooms,
              cutleries, napkins, beverages, etc. Should you wish to share some snacks, please let
              us know as well using the form below:
            </p>
            <Link
              className="portal-action-button activity-hub-volunteer-link"
              href={`/volunteer?invite=${encodeURIComponent(inviteToken)}`}
            >
              Volunteer Application
            </Link>
          </ActivityDisclosure>
        </section>
      </section>
    </main>
  );
}
