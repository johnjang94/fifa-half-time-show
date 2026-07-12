"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePersistentInviteToken } from "../../components/use-persistent-invite-token";

const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const SURVEY_COMPLETION_SMS_SENT_PREFIX = "fifa-half-time-show-survey-completion-admin-sms-sent";
const surveyCompletionSmsInFlightTokens = new Set();

function getSurveyCompletionSmsStorageKey(inviteToken) {
  return `${SURVEY_COMPLETION_SMS_SENT_PREFIX}:${inviteToken}`;
}

export default function SurveyDonePage() {
  return (
    <Suspense fallback={null}>
      <SurveyDonePageInner />
    </Suspense>
  );
}

function SurveyDonePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const { inviteToken, isResolved } = usePersistentInviteToken(searchParams?.get("invite"));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isResolved || !inviteToken || typeof window === "undefined") {
      return undefined;
    }

    const storageKey = getSurveyCompletionSmsStorageKey(inviteToken);

    try {
      if (window.localStorage.getItem(storageKey) === "sent") {
        return undefined;
      }
    } catch {
      // Best effort only.
    }

    if (surveyCompletionSmsInFlightTokens.has(inviteToken)) {
      return undefined;
    }

    surveyCompletionSmsInFlightTokens.add(inviteToken);
    let cancelled = false;

    async function sendSurveyCompletionSms() {
      try {
        const response = await fetch(`${controlBaseUrl}/api/invites/thank-you`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inviteToken }),
        });

        const data = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && data.ok) {
          try {
            window.localStorage.setItem(storageKey, "sent");
          } catch {
            // Best effort only.
          }
        }
      } catch {
        // Best effort only.
      } finally {
        surveyCompletionSmsInFlightTokens.delete(inviteToken);
      }
    }

    void sendSurveyCompletionSms();

    return () => {
      cancelled = true;
    };
  }, [inviteToken, isResolved]);

  function handleMyTicketClick() {
    if (!inviteToken) {
      router.push("/");
      return;
    }

    router.push(`/portal?invite=${encodeURIComponent(inviteToken)}`);
  }

  if (!isResolved) {
    return null;
  }

  return (
    <main className={`app-frame survey-done-page ${isVisible ? "is-visible" : ""}`}>
      <section className="survey-done-shell">
        <header className="survey-done-header">
          <h1>Thank you.</h1>
        </header>

        <p className="survey-done-copy">You may check your ticket now</p>

        <button className="survey-done-home" onClick={handleMyTicketClick} type="button">
          My Ticket
        </button>
      </section>
    </main>
  );
}
