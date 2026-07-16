"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePersistentInviteToken } from "../../components/use-persistent-invite-token";

function VolunteerThankYouPageInner() {
  const searchParams = useSearchParams();
  const { inviteToken, isResolved } = usePersistentInviteToken(searchParams?.get("invite"));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!isResolved) {
    return null;
  }

  const portalHref = inviteToken ? `/portal?invite=${encodeURIComponent(inviteToken)}` : "/portal";

  return (
    <main className={`app-frame survey-done-page volunteer-thank-you-page ${isVisible ? "is-visible" : ""}`}>
      <section className="survey-done-shell volunteer-thank-you-shell">
        <header className="survey-done-header">
          <h1>Thank you</h1>
        </header>

        <p className="survey-done-copy">
          We appreciate your contribution to this party! We look forward to seeing you at the
          party!
        </p>

        <Link className="survey-done-home volunteer-thank-you-home" href={portalHref}>
          Portal
        </Link>
      </section>
    </main>
  );
}

export default function VolunteerThankYouPage() {
  return (
    <Suspense fallback={null}>
      <VolunteerThankYouPageInner />
    </Suspense>
  );
}
