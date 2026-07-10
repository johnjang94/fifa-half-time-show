"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "../../components/qr-code";
import { Celebration } from "./celebration";

function sanitizeToken(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "guest";
}

export default function ThankYouPage({ searchParams }) {
  const router = useRouter();
  const inviteToken = sanitizeToken(searchParams?.invite);
  const [isVisible, setIsVisible] = useState(false);
  const [showCelebration, setShowCelebration] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [showPortalButton, setShowPortalButton] = useState(false);
  const [isQrReady, setIsQrReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!showQr || !isQrReady) {
      return undefined;
    }

    setShowPortalButton(true);
    return undefined;
  }, [isQrReady, showQr]);

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
    setShowQr(true);
  }, []);

  const handleQrReady = useCallback(() => {
    setIsQrReady(true);
  }, []);

  return (
    <main className={`app-frame thank-you-page ${isVisible ? "is-visible" : ""}`}>
      <section className="thank-you-shell">
        <header className="thank-you-header">
          <h1>You are going!</h1>
        </header>

        {showCelebration ? <Celebration onComplete={handleCelebrationComplete} /> : null}

        {showQr ? (
          <div className="thank-you-qr-stack">
            <QrCode
              token={inviteToken}
              caption="Unique QR code for your registration"
              onReady={handleQrReady}
            />

            <button
              className={`thank-you-return ${showPortalButton ? "is-visible" : ""}`}
              onClick={() => router.push(`/survey?invite=${encodeURIComponent(inviteToken)}`)}
              type="button"
            >
              take a quick survey
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
