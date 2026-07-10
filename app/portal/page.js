"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "../../components/qr-code";
import { SessionGuard } from "../../components/session-guard";

const SESSION_KEY = "fifa-half-time-show-session";
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

function sanitizeToken(value) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || "guest";
  }

  return typeof value === "string" && value.trim() ? value.trim() : "guest";
}

export default function PortalPage({ searchParams }) {
  const router = useRouter();
  const inviteToken = sanitizeToken(searchParams?.invite);

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      router.replace("/");
      return;
    }

    void recordActivity("portal-view", {
      inviteToken: inviteToken,
    });
  }, [router]);

  if (typeof window !== "undefined" && !sessionStorage.getItem(SESSION_KEY)) {
    return null;
  }

  return (
    <main className="app-frame portal-page">
      <SessionGuard />
      <section className="portal-shell">
        <header className="portal-header">
          <h1>You are going</h1>
        </header>

        <section className="portal-qr-area" aria-label="Your QR code">
          <QrCode
            token={inviteToken}
            caption="This QR code is only valid for the invited number"
          />
        </section>

        <section className="portal-accordion" aria-label="Party details">
          <details className="portal-details">
            <summary>venue detail</summary>
            <p>
              we are located in 138 Downes Street, Toronto, ON. We will be having our party on the
              4th floor.
            </p>
          </details>

          <details className="portal-details">
            <summary>the party detail</summary>
            <p>
              we will have this party on Sunday, July 19, 2026 from 1:00 pm until 5:00 pm. After 5
              pm, we could head out to another board game cafe.
            </p>
          </details>

          <details className="portal-details">
            <summary>FAQ</summary>
            <p>
              Should you have any question, please feel free to reach out to us{" "}
              <Link className="faq-inline-link" href={`/support?invite=${encodeURIComponent(inviteToken)}`}>
                here
              </Link>
              .
            </p>
          </details>
        </section>
      </section>
    </main>
  );
}
