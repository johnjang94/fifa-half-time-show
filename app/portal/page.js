import Link from "next/link";
import { QrCode } from "../../components/qr-code";

function sanitizeToken(value) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || "guest";
  }

  return typeof value === "string" && value.trim() ? value.trim() : "guest";
}

export const metadata = {
  title: "You are going | FIFA X BTS Watch Party",
};

export default function PortalPage({ searchParams }) {
  const inviteToken = sanitizeToken(searchParams?.invite);

  return (
    <main className="app-frame portal-page">
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
              <Link className="faq-inline-link" href="/faq">
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
