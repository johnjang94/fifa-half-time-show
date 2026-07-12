"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveStoredInviteToken } from "./invite-storage";
import { LOGOUT_REASON_KEY, SESSION_KEY } from "./session-lifecycle";
import heroImage from "../image.png";
const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";

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

export function GuestExperience() {
  const router = useRouter();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [logoutNotice, setLogoutNotice] = useState("");
  const [inviteCount, setInviteCount] = useState(0);
  const [capacity, setCapacity] = useState(null);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const isPhoneNumberComplete = digitsOnly.length === 10;
  const spotsLeft =
    availabilityLoaded && capacity !== null ? Math.max(0, Number(capacity) - Number(inviteCount)) : null;
  const shouldShowSpotWarning = spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 5;
  const joinLinkLabel = spotsLeft === 0 ? "join the waitlist" : "join the watch party";

  useEffect(() => {
    const reason = sessionStorage.getItem(LOGOUT_REASON_KEY);

    if (reason === "idle") {
      setLogoutNotice("You were signed out after 15 minutes of inactivity.");
      sessionStorage.removeItem(LOGOUT_REASON_KEY);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      try {
        const response = await fetch(`${controlBaseUrl}/api/invites`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!cancelled && response.ok && data.ok) {
          setInviteCount(Number(data.inviteCount ?? 0));
          setCapacity(
            data.capacity === null || data.capacity === undefined ? null : Number(data.capacity),
          );
          setAvailabilityLoaded(true);
        }
      } catch {
        // Best effort only.
      }
    }

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLoginSubmit(event) {
    event.preventDefault();
    const sessionId = String(Date.now());
    sessionStorage.setItem(SESSION_KEY, sessionId);
    saveStoredInviteToken(digitsOnly);
    void recordActivity("login", {
      phoneNumber: digitsOnly,
      inviteToken: digitsOnly,
    });
    router.push(`/portal?invite=${encodeURIComponent(digitsOnly)}`);
  }

  return (
    <main className="home-page page-shell">
      <section className="hero-stage">
        <div className="hero-media">
          <Image
            alt="FIFA Half-Time Show background"
            className="hero-image"
            fill
            priority
            sizes="100vw"
            src={heroImage}
          />
          <div className="hero-overlay" aria-hidden="true" />
        </div>

        <div className="hero-content">
          <div className="cta-band">
            {logoutNotice ? (
              <p className="login-status" role="status">
                {logoutNotice}
              </p>
            ) : null}

            {shouldShowSpotWarning ? (
              <div className="login-warning" role="status" aria-live="polite">
                <strong>{spotsLeft} spots left</strong>
                <span>Hurry, the guest list is nearly full.</span>
              </div>
            ) : null}

            <div className={`auth-switch ${isLoginOpen ? "is-open" : ""}`}>
              <div className="auth-state auth-state-login" aria-hidden={isLoginOpen}>
                <button
                  className="login-button"
                  onClick={() => setIsLoginOpen(true)}
                  type="button"
                >
                  Login
                </button>
              </div>

              <form
                className="auth-state auth-state-form"
                onSubmit={handleLoginSubmit}
              >
                <label className="login-field">
                  <span>phone number</span>
                  <input
                    autoComplete="tel"
                    inputMode="tel"
                    name="phoneNumber"
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="Enter phone number"
                    type="tel"
                    value={phoneNumber}
                  />
                </label>

                <button
                  className={`login-submit ${isPhoneNumberComplete ? "is-ready" : ""}`}
                  disabled={!isPhoneNumberComplete}
                  type="submit"
                >
                  enter the party
                </button>
              </form>
            </div>

            <Link className="join-link" href="/overview">
              {joinLinkLabel}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
