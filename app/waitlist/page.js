"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { usePersistentInviteToken } from "../../components/use-persistent-invite-token";

function WaitlistPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { inviteToken } = usePersistentInviteToken(searchParams?.get("invite"));

  function handleSurveyClick() {
    const query = inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : "";
    router.push(`/survey${query}`);
  }

  return (
    <main className="app-frame thank-you-page">
      <section className="thank-you-shell">
        <header className="thank-you-header">
          <h1>waitlist</h1>
        </header>

        <div className="thank-you-qr-stack waitlist-stack">
          <p className="waitlist-copy">this needs to be completed to join the party</p>
          <button className="thank-you-return is-visible waitlist-action" onClick={handleSurveyClick} type="button">
            Take a quick survey
          </button>
        </div>
      </section>
    </main>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense fallback={null}>
      <WaitlistPageInner />
    </Suspense>
  );
}
