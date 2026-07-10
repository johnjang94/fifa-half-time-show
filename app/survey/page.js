"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionGuard } from "../../components/session-guard";

const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const SESSION_KEY = "fifa-half-time-show-session";
const SOURCE_OPTIONS = ["Friends", "LinkedIn", "Eventbrite", "Instagram", "X"];
const YES_NO_OPTIONS = ["Yes", "No"];

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

export default function SurveyPage() {
  return (
    <Suspense fallback={null}>
      <SurveyPageInner />
    </Suspense>
  );
}

function SurveyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = useMemo(() => normalize(searchParams?.get("invite")), [searchParams]);
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({
    howDidYouKnow: "",
    referredBy: "",
    dietaryRestrictions: "",
    resident: "",
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!inviteToken) {
      router.replace("/");
      return;
    }

    if (!sessionStorage.getItem(SESSION_KEY)) {
      router.replace("/");
    }
  }, [inviteToken, router]);

  const isFriends = answers.howDidYouKnow === "Friends";
  const isComplete =
    Boolean(answers.howDidYouKnow) &&
    (!isFriends || Boolean(normalize(answers.referredBy))) &&
    Boolean(normalize(answers.dietaryRestrictions)) &&
    Boolean(answers.resident);

  if (typeof window !== "undefined" && (!inviteToken || !sessionStorage.getItem(SESSION_KEY))) {
    return null;
  }

  function updateAnswer(field, value) {
    setError("");
    setAnswers((current) => {
      const next = { ...current, [field]: value };

      if (field === "howDidYouKnow" && value !== "Friends") {
        next.referredBy = "";
      }

      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isComplete || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${controlBaseUrl}/api/survey`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteToken,
          howDidYouKnow: answers.howDidYouKnow,
          referredBy: answers.referredBy,
          dietaryRestrictions: answers.dietaryRestrictions,
          resident: answers.resident,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Unable to save survey.");
      }

      router.push("/survey-done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save survey.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={`app-frame survey-page ${isVisible ? "is-visible" : ""}`}>
      <SessionGuard />
      <section className="survey-shell">
        <header className="survey-header">
          <h1>survey</h1>
        </header>

        <form className="survey-form" onSubmit={handleSubmit}>
          <label className="survey-question">
            <span className="survey-question-text">Q. How did you get to know about this event?</span>
            <select
              className="survey-control"
              onChange={(event) => updateAnswer("howDidYouKnow", event.target.value)}
              value={answers.howDidYouKnow}
            >
              <option value="">Select one</option>
              {SOURCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {isFriends ? (
            <label className="survey-question">
              <span className="survey-question-text">
                Q. If you chose friends, how referred you / invited you to this event?
              </span>
              <input
                className="survey-control"
                onChange={(event) => updateAnswer("referredBy", event.target.value)}
                placeholder="Name"
                type="text"
                value={answers.referredBy}
              />
            </label>
          ) : null}

          <label className="survey-question">
            <span className="survey-question-text">Q. Do you have any dietary restrictions?</span>
            <input
              className="survey-control"
              onChange={(event) => updateAnswer("dietaryRestrictions", event.target.value)}
              placeholder="Type your answer"
              type="text"
              value={answers.dietaryRestrictions}
            />
          </label>

          <label className="survey-question">
            <span className="survey-question-text">
              Q. Are you a resident in this building where the party is hosted?
            </span>
            <select
              className="survey-control"
              onChange={(event) => updateAnswer("resident", event.target.value)}
              value={answers.resident}
            >
              <option value="">Select one</option>
              {YES_NO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="survey-submit-row">
            {error ? <p className="survey-error">{error}</p> : null}
            <button
              className={`survey-submit ${isComplete ? "is-ready" : ""}`}
              disabled={!isComplete || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "submitting..." : "submit"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
