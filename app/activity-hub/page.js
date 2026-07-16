"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { SessionGuard } from "../../components/session-guard";
import { SESSION_KEY } from "../../components/session-lifecycle";
import { usePersistentInviteToken } from "../../components/use-persistent-invite-token";
import glutenFreeSausagesImage from "../../gluten-free-sausages.webp";
import chickenImage from "../../chicken.webp";
import fruitSaladImage from "../../fruit-salad.webp";
import skewersImage from "../../skewers.jpeg";
import salmonRiceImage from "../../salmon-rice.webp";
import cardGameImage from "../../card-game.jpeg";
import soccerImage from "../../soccer.webp";

const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const PORTAL_PROFILE_KEY = "fifa-half-time-show-portal-profile";
const SUPPORT_ACCESS_KEY = "fifa-half-time-show-support-access-token";
const venueAddress = "138 Downes Street, Toronto, ON M5E 0E4";
const venueMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`;
const providedItems = [
  {
    name: "Gluten free sausages",
    description: "Charred, fragrant, and served warm.",
    image: glutenFreeSausagesImage,
  },
  {
    name: "Chicken",
    description: "Tender pieces with a polished finish.",
    image: chickenImage,
  },
  {
    name: "Salmon rice",
    description: "A warm main with a refined, comforting feel.",
    image: salmonRiceImage,
  },
  {
    name: "Skewers",
    description: "Grilled and plated for easy grazing.",
    image: skewersImage,
  },
  {
    name: "Fruit salad",
    description: "Bright, chilled, and palate-cleansing.",
    image: fruitSaladImage,
  },
];
const entertainmentItems = [
  {
    name: "Card game",
    description: "A cozy table-side game for people who want to linger and laugh.",
    image: cardGameImage,
  },
  {
    name: "Soccer",
    description: "A playful nod to the match-day energy that keeps the room alive.",
    image: soccerImage,
  },
];

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readInviteField(invite, camelKey, snakeKey) {
  return normalize(invite?.[camelKey] ?? invite?.[snakeKey]);
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
      <div className="activity-hub-disclosure-panel">
        <div className="portal-things-card-body">
          <div className="activity-hub-card-copy">{children}</div>
        </div>
      </div>
    </details>
  );
}

function VenueMapPreview() {
  return (
    <div className="activity-hub-venue-map">
      <iframe
        className="activity-hub-map-iframe"
        title="Google map of 138 Downes Street, Toronto, ON"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.google.com/maps?q=${encodeURIComponent(venueAddress)}&z=16&output=embed`}
        allowFullScreen
      />
    </div>
  );
}

function HelpNeededIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="activity-hub-help-illustration"
      viewBox="0 0 960 420"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="helpSky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#111820" />
          <stop offset="100%" stopColor="#091015" />
        </linearGradient>
        <linearGradient id="helpGlow" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f6d15d" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f19c6b" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <rect width="960" height="420" rx="36" fill="url(#helpSky)" />
      <circle cx="156" cy="86" r="38" fill="rgba(246,209,93,0.16)" />
      <circle cx="156" cy="86" r="18" fill="rgba(246,209,93,0.34)" />
      <circle cx="784" cy="94" r="48" fill="rgba(255,255,255,0.05)" />
      <path
        d="M746 292 C784 210, 854 200, 900 230"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="26"
        strokeLinecap="round"
      />
      <path
        d="M64 304 C112 236, 178 206, 244 212"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path d="M130 292 C176 244, 220 224, 274 220" fill="none" stroke="#f6d15d" strokeWidth="6" strokeLinecap="round" />
      <path d="M666 270 C700 250, 728 240, 756 240" fill="none" stroke="#f19c6b" strokeWidth="6" strokeLinecap="round" />

      <g transform="translate(210 154)">
        <circle cx="0" cy="0" r="28" fill="#f5e7c5" />
        <path d="M-26 36 C-22 92, 22 92, 26 36" fill="#d96f5f" />
        <path d="M-54 60 C-96 84, -106 128, -88 166" fill="none" stroke="#f5e7c5" strokeWidth="20" strokeLinecap="round" />
        <path d="M54 60 C96 84, 106 128, 88 166" fill="none" stroke="#f5e7c5" strokeWidth="20" strokeLinecap="round" />
        <path d="M-48 166 L-24 250" stroke="#f5e7c5" strokeWidth="20" strokeLinecap="round" />
        <path d="M48 166 L24 250" stroke="#f5e7c5" strokeWidth="20" strokeLinecap="round" />
        <path d="M-38 250 L-68 338" stroke="#f5e7c5" strokeWidth="20" strokeLinecap="round" />
        <path d="M38 250 L68 338" stroke="#f5e7c5" strokeWidth="20" strokeLinecap="round" />
        <circle cx="-9" cy="-4" r="3.5" fill="#0f1418" />
        <circle cx="9" cy="-4" r="3.5" fill="#0f1418" />
        <path d="M-8 10 C-2 16, 2 16, 8 10" fill="none" stroke="#0f1418" strokeWidth="4" strokeLinecap="round" />
        <path d="M-8 46 L-22 98" stroke="rgba(15,20,24,0.22)" strokeWidth="5" />
        <path d="M8 46 L22 98" stroke="rgba(15,20,24,0.22)" strokeWidth="5" />
      </g>

      <g transform="translate(682 168)">
        <circle cx="0" cy="0" r="74" fill="rgba(255,255,255,0.05)" />
        <circle cx="0" cy="0" r="60" fill="#f5f7f8" />
        <path d="M0 -60 L24 -22 L0 0 L-24 -22 Z" fill="#202a31" />
        <path d="M-52 -18 L-24 -22 L0 0 L-16 34 L-52 18 Z" fill="#202a31" />
        <path d="M52 -18 L24 -22 L0 0 L16 34 L52 18 Z" fill="#202a31" />
        <path d="M-16 34 L0 60 L16 34 L0 0 Z" fill="#202a31" />
      </g>

      <g transform="translate(442 110)">
        <path d="M0 0 L18 24 L-18 24 Z" fill="url(#helpGlow)" />
        <rect x="-10" y="24" width="20" height="54" rx="10" fill="url(#helpGlow)" />
        <path d="M-34 46 C-22 36, -12 36, 0 44 C12 52, 22 52, 34 42" fill="none" stroke="rgba(246,209,93,0.9)" strokeWidth="6" strokeLinecap="round" />
      </g>

      <path
        d="M84 346 C188 312, 288 304, 392 318 S606 348, 734 332 S884 302, 938 314"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="18"
        strokeLinecap="round"
      />
    </svg>
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
          const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || firstName || "guest";
          saveSupportAccessToken(data.supportAccessToken);
          const profilePhotoUrl = data.invite.profilePhotoUrl ?? "";
          const profilePhotoTag = data.invite.profilePhotoTag ?? "";
          const profilePhotoAiGenerated = Boolean(data.invite.profilePhotoAiGenerated);

          setInvite({
            firstName,
            lastName,
            phoneNumber,
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

        <section className="portal-actions activity-hub-actions" aria-label="Activity hub actions">
          <ActivityDisclosure title="What is provided">
            <div className="activity-hub-menu">
              <p className="portal-card-copy activity-hub-menu-intro">
                An elevated spread of familiar favorites, plated with a relaxed restaurant feel.
              </p>
              <div className="activity-hub-menu-grid">
                {providedItems.map((item) => (
                  <article className="activity-hub-food-card" key={item.name}>
                    <div className="activity-hub-food-photo-wrap">
                      <Image alt={item.name} className="activity-hub-food-photo" src={item.image} />
                    </div>
                    <div className="activity-hub-food-copy">
                      <strong className="activity-hub-food-name">{item.name}</strong>
                      <p>{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
              <p className="portal-card-copy activity-hub-menu-footnote">
                Plus a few extra dishes to keep the table feeling generous.
              </p>
            </div>
          </ActivityDisclosure>

          <ActivityDisclosure title="Entertainment">
            <div className="activity-hub-menu">
              <p className="portal-card-copy activity-hub-menu-intro">
                A playful party corner with a table game and a soccer nod to keep the room buzzing
                between bites and laughs.
              </p>
              <div className="activity-hub-menu-grid">
                {entertainmentItems.map((item) => (
                  <article className="activity-hub-food-card" key={item.name}>
                    <div className="activity-hub-food-photo-wrap">
                      <Image alt={item.name} className="activity-hub-food-photo" src={item.image} />
                    </div>
                    <div className="activity-hub-food-copy">
                      <strong className="activity-hub-food-name">{item.name}</strong>
                      <p>{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
              <p className="portal-card-copy activity-hub-menu-footnote">
                Perfect for the in-between moments when guests want to mingle, smile, and stay in
                the party mood.
              </p>
            </div>
          </ActivityDisclosure>

          <ActivityDisclosure title="About the venue">
            <VenueMapPreview />
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

          <ActivityDisclosure title="HELP NEEDED">
            <div className="activity-hub-help-needed">
              <HelpNeededIllustration />
              <p className="portal-card-copy activity-hub-help-copy">
                We could use a few extra hands to keep the party feeling warm and alive. If you
                love the energy of a music night or a football match, we would be so grateful for
                help with snacks, setup, and small touches that make the room feel special.
              </p>
            </div>
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
