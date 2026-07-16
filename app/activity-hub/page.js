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
import skewersImage from "../../skewers.jpg";
import salmonRiceImage from "../../salmon-rice.webp";

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
    name: "Fruit salad",
    description: "Bright, chilled, and palate-cleansing.",
    image: fruitSaladImage,
  },
  {
    name: "Skewers",
    description: "Grilled and plated for easy grazing.",
    image: skewersImage,
  },
  {
    name: "Salmon rice",
    description: "A warm main with a refined, comforting feel.",
    image: salmonRiceImage,
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
      <div className="portal-things-card-body">
        <div className="activity-hub-card-copy">{children}</div>
      </div>
    </details>
  );
}

function VenueMapPreview() {
  return (
    <Link
      aria-label="Open venue in maps"
      className="activity-hub-venue-map-link"
      href={venueMapUrl}
      rel="noreferrer"
      target="_blank"
    >
      <div className="activity-hub-venue-map" role="img" aria-label="Stylized map preview of the venue">
        <svg
          aria-hidden="true"
          className="activity-hub-map-svg"
          viewBox="0 0 1200 700"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="mapBg" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#1d242a" />
              <stop offset="100%" stopColor="#0e1419" />
            </linearGradient>
            <linearGradient id="road" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#8c9197" />
              <stop offset="100%" stopColor="#c2c7cc" />
            </linearGradient>
          </defs>

          <rect width="1200" height="700" fill="url(#mapBg)" />
          <path
            d="M84 112 C210 142, 300 170, 430 188 S684 226, 798 276 S1002 390, 1120 444"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="46"
            strokeLinecap="round"
          />
          <path
            d="M82 110 C208 140, 300 168, 430 186 S684 224, 798 274 S1002 388, 1120 442"
            fill="none"
            stroke="url(#road)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray="22 16"
          />
          <path
            d="M126 586 C236 516, 298 468, 402 422 S612 344, 724 316 S932 286, 1068 222"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="36"
            strokeLinecap="round"
          />
          <path
            d="M126 586 C236 516, 298 468, 402 422 S612 344, 724 316 S932 286, 1068 222"
            fill="none"
            stroke="url(#road)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path d="M146 170 L324 170" stroke="rgba(255,255,255,0.18)" strokeWidth="10" />
          <path d="M266 170 L266 364" stroke="rgba(255,255,255,0.18)" strokeWidth="10" />
          <path d="M744 180 L744 500" stroke="rgba(255,255,255,0.16)" strokeWidth="10" />
          <path d="M744 500 L1002 500" stroke="rgba(255,255,255,0.16)" strokeWidth="10" />
          <circle cx="744" cy="500" r="26" fill="#f6d15d" />
          <circle cx="744" cy="500" r="44" fill="none" stroke="rgba(246,209,93,0.26)" strokeWidth="18" />
          <path
            d="M744 454 C727 454, 713 469, 713 486 C713 511, 744 545, 744 545 C744 545, 775 511, 775 486 C775 469, 761 454, 744 454 Z"
            fill="#f4fff8"
          />
          <circle cx="744" cy="486" r="14" fill="#0e1419" />
          <text
            x="70"
            y="82"
            fill="rgba(244,255,248,0.78)"
            fontFamily="Iowan Old Style, Georgia, serif"
            fontSize="30"
            letterSpacing="4"
          >
            VENUE MAP
          </text>
          <text
            x="70"
            y="622"
            fill="rgba(244,255,248,0.56)"
            fontFamily="Iowan Old Style, Georgia, serif"
            fontSize="22"
            letterSpacing="2"
          >
            138 DOWNES STREET, TORONTO, ON
          </text>
        </svg>
      </div>
    </Link>
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
