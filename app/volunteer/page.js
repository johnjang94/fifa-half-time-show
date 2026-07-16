"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { SessionGuard } from "../../components/session-guard";
import { SESSION_KEY } from "../../components/session-lifecycle";
import { usePersistentInviteToken } from "../../components/use-persistent-invite-token";

const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const VOLUNTEER_OPTIONS = [
  "I can bring corn and mushroom",
  "I can bring some beverages",
  "I would like to bring some snack to share with others",
  "I would like to bring some card deck for entertainment",
];

export default function VolunteerPage() {
  return (
    <Suspense fallback={null}>
      <VolunteerPageInner />
    </Suspense>
  );
}

function VolunteerPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { inviteToken, isResolved } = usePersistentInviteToken(searchParams?.get("invite"));
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [interests, setInterests] = useState([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isResolved) {
      return;
    }

    if (!inviteToken) {
      router.replace("/");
      return;
    }

    if (!sessionStorage.getItem(SESSION_KEY)) {
      router.replace("/");
    }
  }, [inviteToken, isResolved, router]);

  if (!isResolved) {
    return null;
  }

  if (typeof window !== "undefined" && !sessionStorage.getItem(SESSION_KEY)) {
    return null;
  }

  if (!inviteToken) {
    return null;
  }

  function handleInterestChange(event) {
    setError("");
    const selected = Array.from(event.target.selectedOptions, (option) => option.value);
    const nextInterests = VOLUNTEER_OPTIONS.filter((option) => selected.includes(option)).slice(0, 2);
    setInterests(nextInterests);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting || interests.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${controlBaseUrl}/api/volunteer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteToken,
          interests,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Unable to save your volunteer application.");
      }

      router.push(`/volunteer-thank-you?invite=${encodeURIComponent(inviteToken)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your volunteer application.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={`app-frame portal-page volunteer-page ${isVisible ? "is-visible" : ""}`}>
      <SessionGuard />
      <section className="portal-shell volunteer-shell">
        <div className="activity-hub-top-row">
          <Link
            aria-label="Back to activity hub"
            className="activity-hub-back-button"
            href={`/activity-hub?invite=${encodeURIComponent(inviteToken)}`}
          >
            <FiArrowLeft />
          </Link>
        </div>

        <header className="portal-header volunteer-header">
          <h1>Volunteer Application</h1>
        </header>

        <p className="volunteer-lead">
          Thank you for pulling over your sleeves for our party. Your hands are much appreciated!
        </p>

        <form className="portal-card volunteer-form-card" onSubmit={handleSubmit}>
          <div className="portal-card-body volunteer-form-body">
            <label className="volunteer-question">
              <span className="portal-card-copy volunteer-question-text">
                What are you interested in bringing to the party? (serving for 10 people)
              </span>
              <select
                className="survey-control volunteer-multiselect"
                multiple
                onChange={handleInterestChange}
                size={4}
                value={interests}
              >
                {VOLUNTEER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <p className="volunteer-helper">Choose up to 2 options.</p>

            <div className="survey-submit-row volunteer-submit-row">
              {error ? <p className="survey-error">{error}</p> : null}
              <button
                className={`survey-submit volunteer-submit ${interests.length > 0 ? "is-ready" : ""}`}
                disabled={interests.length === 0 || isSubmitting}
                type="submit"
              >
                {isSubmitting ? "submitting..." : "submit"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
