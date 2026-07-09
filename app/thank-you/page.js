import { QrCode } from "../../components/qr-code";
import { AutoRedirect } from "./auto-redirect";

function sanitizeToken(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "guest";
}

export default function ThankYouPage({ searchParams }) {
  const inviteToken = sanitizeToken(searchParams?.invite);

  return (
    <main className="app-frame thank-you-page">
      <AutoRedirect />
      <section className="thank-you-shell">
        <h1>You are going!</h1>
        <QrCode token={inviteToken} caption="Unique QR code for your registration" />
      </section>
    </main>
  );
}
