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
import helpImage from "../../help.jpg";

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
  const isHelpNeeded = title === "HELP NEEDED";

  return (
    <details className="portal-card portal-things-card activity-hub-disclosure">
      <summary className={`portal-things-trigger ${isHelpNeeded ? "is-help-needed" : ""}`}>
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
              <div className="activity-hub-help-image-wrap">
                <Image
                  alt="Help wanted illustration"
                  className="activity-hub-help-image"
                  src={helpImage}
                />
              </div>
              <p className="portal-card-copy activity-hub-help-copy">
                can we get some help with food, cutleries, and set up, please?
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
