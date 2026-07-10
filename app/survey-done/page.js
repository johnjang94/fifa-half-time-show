"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SurveyDonePage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <main className={`app-frame survey-done-page ${isVisible ? "is-visible" : ""}`}>
      <section className="survey-done-shell">
        <header className="survey-done-header">
          <h1>Thank you.</h1>
        </header>

        <p className="survey-done-copy">You may check your ticket now</p>

        <button className="survey-done-home" onClick={() => router.push("/")} type="button">
          home
        </button>
      </section>
    </main>
  );
}
