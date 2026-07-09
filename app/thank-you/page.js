"use client";

import { useEffect, useState } from "react";
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
  const [canReturnHome, setCanReturnHome] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));

    const homeTimer = window.setTimeout(() => setCanReturnHome(true), 6200);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(homeTimer);
    };
  }, []);

  return (
    <main className={`app-frame thank-you-page ${isVisible ? "is-visible" : ""}`}>
      <section className="thank-you-shell">
        <Celebration inviteToken={inviteToken} />
        <QrCode token={inviteToken} caption="Unique QR code for your registration" />
        <button
          className={`thank-you-return ${canReturnHome ? "is-visible" : ""}`}
          onClick={() => router.push("/")}
          type="button"
        >
          I have scanned the QR code
        </button>
      </section>
    </main>
  );
}
