"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { saveStoredInviteToken } from "./invite-storage";
import { LOGOUT_REASON_KEY, SESSION_KEY } from "./session-lifecycle";
import heroImage from "../image.png";

const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const SUPPORT_ACCESS_KEY = "fifa-half-time-show-support-access-token";

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

function normalizePhoneNumber(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 10);
}

function normalizeOtpCode(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 6);
}

function LoginOtpModal({ isOpen, onClose, onVerified }) {
  const [step, setStep] = useState("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const phoneInputRef = useRef(null);
  const otpInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setStep("phone");
      setPhoneNumber("");
      setOtpCode("");
      setStatus("");
      setError("");
      setIsSubmitting(false);
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      phoneInputRef.current?.focus?.();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || step !== "otp") {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      otpInputRef.current?.focus?.();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  async function handleSendCode(event) {
    event.preventDefault();

    const digitsOnly = normalizePhoneNumber(phoneNumber);
    if (digitsOnly.length !== 10 || isSubmitting) {
      setError("Please enter the 10-digit phone number you used to register.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setStatus("");

    try {
      const response = await fetch(`${controlBaseUrl}/api/auth/otp/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber: digitsOnly }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Unable to send verification code.");
      }

      setStep("otp");
      setOtpCode("");
      setStatus(
        data.delivered
          ? "We sent a 6-digit code to your phone."
          : "If that number is registered, a verification code has been sent.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send verification code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();

    const digitsOnly = normalizePhoneNumber(phoneNumber);
    const codeOnly = normalizeOtpCode(otpCode);

    if (digitsOnly.length !== 10 || codeOnly.length !== 6 || isSubmitting) {
      setError("Please enter the 6-digit code from your text message.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${controlBaseUrl}/api/auth/otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: digitsOnly,
          code: codeOnly,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok || !data.inviteToken) {
        throw new Error(data.error ?? "Unable to verify code.");
      }

      onVerified({
        inviteToken: data.inviteToken,
        phoneNumber: digitsOnly,
        supportAccessToken: data.supportAccessToken ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="login-modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-labelledby="login-modal-title"
        aria-modal="true"
        className="login-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="Close login dialog"
          className="login-modal-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>

        <p className="login-modal-eyebrow">login</p>
        <h2 id="login-modal-title">
          {step === "phone" ? "Enter your phone number" : "Enter the 6-digit code"}
        </h2>
        <p className="login-modal-copy">
          {step === "phone"
            ? "We will text you a one-time code to confirm it is really you."
            : "Check your SMS and type the code below to continue."}
        </p>

        {step === "phone" ? (
          <form className="login-modal-form" onSubmit={handleSendCode}>
            <label className="login-modal-field">
              <span>phone number</span>
              <input
                autoComplete="tel"
                inputMode="tel"
                name="phoneNumber"
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="Enter phone number"
                ref={phoneInputRef}
                type="tel"
                value={phoneNumber}
              />
            </label>

            {error ? (
              <p className="login-modal-status is-error" role="status">
                {error}
              </p>
            ) : null}

            <button className="login-modal-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "sending code..." : "send code"}
            </button>
          </form>
        ) : (
          <form className="login-modal-form" onSubmit={handleVerifyCode}>
            <label className="login-modal-field">
              <span>verification code</span>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                name="otpCode"
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="123456"
                ref={otpInputRef}
                type="text"
                value={otpCode}
              />
            </label>

            {status ? (
              <p className="login-modal-status" role="status">
                {status}
              </p>
            ) : null}

            {error ? (
              <p className="login-modal-status is-error" role="status">
                {error}
              </p>
            ) : null}

            <div className="login-modal-actions">
              <button
                className="login-modal-secondary"
                disabled={isSubmitting}
                onClick={() => {
                  setStep("phone");
                  setOtpCode("");
                  setError("");
                  setStatus("");
                }}
                type="button"
              >
                back
              </button>
              <button className="login-modal-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? "verifying..." : "verify"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export function GuestExperience() {
  const router = useRouter();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState("");
  const [inviteCount, setInviteCount] = useState(0);
  const [capacity, setCapacity] = useState(null);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
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

  function handleLoginSuccess({ inviteToken, phoneNumber, supportAccessToken }) {
    const sessionId = String(Date.now());
    sessionStorage.setItem(SESSION_KEY, sessionId);
    saveStoredInviteToken(inviteToken);

    if (supportAccessToken) {
      window.localStorage.setItem(SUPPORT_ACCESS_KEY, supportAccessToken);
    }

    void recordActivity("login", {
      phoneNumber,
      inviteToken,
      method: "otp",
    });

    setIsLoginModalOpen(false);
    router.push(`/portal?invite=${encodeURIComponent(inviteToken)}`);
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

            <button className="login-button" onClick={() => setIsLoginModalOpen(true)} type="button">
              Login
            </button>

            <Link className="join-link" href="/overview">
              {joinLinkLabel}
            </Link>
          </div>
        </div>
      </section>

      <LoginOtpModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onVerified={handleLoginSuccess}
      />
    </main>
  );
}
