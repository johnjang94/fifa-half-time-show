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
const OTP_CODE_LENGTH = 5;
const PHONE_NUMBER_LENGTH = 10;

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
        inviteToken: String(extra.inviteToken ?? "").trim(),
        phoneNumber: String(extra.phoneNumber ?? "").trim(),
      }),
    });
  } catch {
    // Best effort logging only.
  }
}

function normalizePhoneNumber(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, PHONE_NUMBER_LENGTH);
}

function normalizeOtpCode(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, OTP_CODE_LENGTH);
}

function LoginOtpModal({ isOpen, phoneNumber, onClose, onVerified }) {
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setOtpCode("");
      setError("");
      setIsSubmitting(false);
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      otpInputRef.current?.focus?.();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isOpen]);

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

  async function handleVerifyCode(event) {
    event.preventDefault();

    const digitsOnly = normalizeOtpCode(otpCode);

    if (digitsOnly.length !== OTP_CODE_LENGTH || isSubmitting) {
      setError(`Please enter the ${OTP_CODE_LENGTH}-digit code from your text message.`);
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
          phoneNumber: normalizePhoneNumber(phoneNumber),
          code: digitsOnly,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok || !data.inviteToken) {
        throw new Error(data.error ?? "Unable to verify code.");
      }

      onVerified({
        inviteToken: data.inviteToken,
        phoneNumber: normalizePhoneNumber(phoneNumber),
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
        <h2 id="login-modal-title">Enter the {OTP_CODE_LENGTH}-digit code</h2>
        <p className="login-modal-copy">
          Check your SMS and type the code below to continue.
        </p>

        <form className="login-modal-form" onSubmit={handleVerifyCode}>
          <label className="login-modal-field">
            <span>verification code</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={OTP_CODE_LENGTH}
              name="otpCode"
              onChange={(event) => setOtpCode(event.target.value)}
              placeholder="12345"
              ref={otpInputRef}
              type="text"
              value={otpCode}
            />
          </label>

          {error ? (
            <p className="login-modal-status is-error" role="status">
              {error}
            </p>
          ) : null}

          <div className="login-modal-actions">
            <button
              className="login-modal-secondary"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              back
            </button>
            <button className="login-modal-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "verifying..." : "verify"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function GuestExperience({ initialLoginOpen = false } = {}) {
  const router = useRouter();
  const [isLoginPanelOpen, setIsLoginPanelOpen] = useState(Boolean(initialLoginOpen));
  const [loginMode, setLoginMode] = useState("phone");
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [barcode, setBarcode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState("");
  const phoneInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const joinLinkLabel = "join the watch party";

  useEffect(() => {
    const reason = sessionStorage.getItem(LOGOUT_REASON_KEY);

    if (reason === "idle") {
      setLogoutNotice("You were signed out after 15 minutes of inactivity.");
      sessionStorage.removeItem(LOGOUT_REASON_KEY);
    }
  }, []);

  useEffect(() => {
    if (!isLoginPanelOpen) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      if (loginMode === "barcode") {
        barcodeInputRef.current?.focus?.();
        return;
      }

      phoneInputRef.current?.focus?.();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isLoginPanelOpen, loginMode]);

  useEffect(() => {
    if (initialLoginOpen) {
      setIsLoginPanelOpen(true);
    }
  }, [initialLoginOpen]);

  function handleLoginSuccess({ inviteToken, phoneNumber, supportAccessToken, method = "otp", barcode: inviteBarcode = "" }) {
    const sessionId = String(Date.now());
    sessionStorage.setItem(SESSION_KEY, sessionId);
    saveStoredInviteToken(inviteToken);

    if (supportAccessToken) {
      window.localStorage.setItem(SUPPORT_ACCESS_KEY, supportAccessToken);
    }

    void recordActivity("login", {
      phoneNumber,
      inviteToken,
      method,
      barcode: inviteBarcode,
    });

    setIsOtpModalOpen(false);
    router.push(`/portal?invite=${encodeURIComponent(inviteToken)}`);
  }

  function handleModeChange(nextMode) {
    setLoginMode(nextMode);
    setAuthError("");
    setAuthStatus("");
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    if (!isLoginPanelOpen) {
      setIsLoginPanelOpen(true);
      return;
    }

    if (isSendingCode) {
      return;
    }

    setIsSendingCode(true);
    setAuthError("");
    setAuthStatus("");

    try {
      if (loginMode === "barcode") {
        const safeBarcode = String(barcode ?? "").replace(/\D/g, "").slice(0, 5);

        if (safeBarcode.length !== 5) {
          setAuthError("Please enter the 5-digit barcode.");
          return;
        }

        const response = await fetch(`${controlBaseUrl}/api/auth/barcode/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ barcode: safeBarcode }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.ok || !data.inviteToken) {
          throw new Error(data.error ?? "Unable to log in with barcode.");
        }

        handleLoginSuccess({
          inviteToken: data.inviteToken,
          phoneNumber: data.invite?.phoneNumber ?? "",
          supportAccessToken: data.supportAccessToken ?? "",
          method: "barcode",
          barcode: safeBarcode,
        });
        return;
      }

      const digitsOnly = normalizePhoneNumber(phoneNumber);
      if (digitsOnly.length !== PHONE_NUMBER_LENGTH) {
        setAuthError("Please enter the 10-digit phone number you used to register.");
        return;
      }

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

      setAuthStatus(
        data.delivered
          ? `We sent a ${OTP_CODE_LENGTH}-digit code to your phone.`
          : "If that number is registered, a verification code has been sent.",
      );
      setIsOtpModalOpen(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unable to send verification code.");
    } finally {
      setIsSendingCode(false);
    }
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

            <Link className="join-link" href="/overview">
              {joinLinkLabel}
            </Link>

            <div className={`auth-switch ${isLoginPanelOpen ? "is-open" : ""}`}>
              <div className="auth-state auth-state-login" aria-hidden={isLoginPanelOpen}>
                <button className="login-button" onClick={() => setIsLoginPanelOpen(true)} type="button">
                  Login
                </button>
              </div>

              <form className="auth-state auth-state-form login-panel" onSubmit={handleLoginSubmit}>
                <div className="login-mode-tabs" role="tablist" aria-label="Login method">
                  <button
                    aria-pressed={loginMode === "phone"}
                    className={`login-mode-tab ${loginMode === "phone" ? "is-active" : ""}`}
                    onClick={() => handleModeChange("phone")}
                    type="button"
                  >
                    phone
                  </button>
                  <button
                    aria-pressed={loginMode === "barcode"}
                    className={`login-mode-tab ${loginMode === "barcode" ? "is-active" : ""}`}
                    onClick={() => handleModeChange("barcode")}
                    type="button"
                  >
                    barcode
                  </button>
                </div>

                <label className="login-field">
                  <span>{loginMode === "barcode" ? "barcode" : "phone number"}</span>
                  <input
                    autoComplete={loginMode === "barcode" ? "off" : "tel"}
                    inputMode={loginMode === "barcode" ? "numeric" : "tel"}
                    maxLength={loginMode === "barcode" ? 5 : PHONE_NUMBER_LENGTH}
                    name={loginMode === "barcode" ? "barcode" : "phoneNumber"}
                    onChange={(event) =>
                      loginMode === "barcode"
                        ? setBarcode(event.target.value.replace(/\D/g, "").slice(0, 5))
                        : setPhoneNumber(event.target.value)
                    }
                    placeholder={loginMode === "barcode" ? "Enter barcode" : "Enter phone number"}
                    ref={loginMode === "barcode" ? barcodeInputRef : phoneInputRef}
                    type="tel"
                    value={loginMode === "barcode" ? barcode : phoneNumber}
                  />
                </label>

                {authError ? (
                  <p className="login-status is-error" role="status">
                    {authError}
                  </p>
                ) : authStatus ? (
                  <p className="login-status" role="status">
                    {authStatus}
                  </p>
                ) : null}

                <button className="login-submit is-ready" disabled={isSendingCode} type="submit">
                  {isSendingCode ? "sending code..." : "Login"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <LoginOtpModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        onVerified={handleLoginSuccess}
        phoneNumber={phoneNumber}
      />
    </main>
  );
}
