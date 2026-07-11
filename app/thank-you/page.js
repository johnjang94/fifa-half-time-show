"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "../../components/qr-code";

const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const SUPPORT_ACCESS_KEY = "fifa-half-time-show-support-access-token";

function sanitizeToken(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "guest";
}

function sanitizeBarcode(value) {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  return digits.length === 5 ? digits : "";
}

function saveSupportAccessToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  const safeToken = typeof token === "string" ? token.trim() : "";
  if (!safeToken) {
    return;
  }

  window.localStorage.setItem(SUPPORT_ACCESS_KEY, safeToken);
}

export default function ThankYouPage({ searchParams }) {
  const router = useRouter();
  const inviteToken = sanitizeToken(searchParams?.invite);
  const [inviteBarcode, setInviteBarcode] = useState(() => sanitizeBarcode(searchParams?.barcode));
  const [isVisible, setIsVisible] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showPortalButton, setShowPortalButton] = useState(false);
  const [isQrReady, setIsQrReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!inviteToken || inviteToken === "guest") {
      return undefined;
    }

    let cancelled = false;

    async function loadBarcode() {
      try {
        const response = await fetch(
          `${controlBaseUrl}/api/invites/lookup?inviteToken=${encodeURIComponent(inviteToken)}`,
        );
        const data = await response.json();

        if (!cancelled && response.ok && data.ok && data.invite) {
          if (!inviteBarcode) {
            setInviteBarcode(sanitizeBarcode(data.invite.barcode));
          }
          saveSupportAccessToken(data.supportAccessToken);
        }
      } catch {
        // Best effort only.
      }
    }

    void loadBarcode();

    return () => {
      cancelled = true;
    };
  }, [inviteBarcode, inviteToken]);

  useEffect(() => {
    if (!isQrReady) {
      return undefined;
    }

    const barcodeTimer = window.setTimeout(() => {
      setShowBarcode(true);
    }, 220);

    const buttonTimer = window.setTimeout(() => {
      setShowPortalButton(true);
    }, 520);

    return () => {
      window.clearTimeout(barcodeTimer);
      window.clearTimeout(buttonTimer);
    };
  }, [isQrReady]);

  const handleQrReady = useCallback(() => {
    setIsQrReady(true);
  }, []);

  return (
    <main className={`app-frame thank-you-page ${isVisible ? "is-visible" : ""}`}>
      <section className="thank-you-shell">
        <header className="thank-you-header">
          <h1>You are going!</h1>
        </header>

        <div className="thank-you-qr-stack">
          <QrCode
            token={inviteToken}
            caption="Unique QR code for your registration"
            barcode={inviteBarcode}
            showBarcode={showBarcode}
            onReady={handleQrReady}
          />

          {showPortalButton ? (
            <button
              className="thank-you-return is-visible"
              onClick={() => router.push(`/survey?invite=${encodeURIComponent(inviteToken)}`)}
              type="button"
            >
              take a quick survey
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
