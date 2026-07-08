"use client";

import { useEffect, useMemo, useState } from "react";

const initialFormState = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
};

const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "http://127.0.0.1:3010";

export function GuestExperience() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [isFull, setIsFull] = useState(false);
  const [capacityLoaded, setCapacityLoaded] = useState(false);

  const pitchMarks = useMemo(
    () => Array.from({ length: 14 }, (_, index) => index),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInviteState() {
      try {
        const response = await fetch(`${controlBaseUrl}/api/invites`);
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? "Unable to load invite state.");
        }

        if (!cancelled) {
          setIsFull(Boolean(data.isFull));
          setCapacityLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setIsFull(false);
          setCapacityLoaded(true);
        }
      }
    }

    void loadInviteState();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const body = new FormData();
      body.set("firstName", form.firstName);
      body.set("lastName", form.lastName);
      body.set("phoneNumber", form.phoneNumber);

      const response = await fetch(`${controlBaseUrl}/api/invites`, {
        method: "POST",
        body,
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      setStatus("success");
      setMessage(
        data.isWaitlist
          ? "Your request has been added to the waitlist."
          : "Invite request sent. You are on the list.",
      );
      setForm(initialFormState);
      setIsFormOpen(false);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Unable to submit the form.",
      );
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="stadium-glow stadium-glow-left" />
        <div className="stadium-glow stadium-glow-right" />
        <div className="hero-frame">
          <div className="score-strip">
            <span>FIFA x BTS</span>
            <span>Half-Time Show</span>
            <span>Global Invite</span>
          </div>

          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">stadium mode engaged</p>
              <h1>
                A half-time show built like a championship night.
              </h1>
              <p className="lede">
                FIFA sets the pitch. BTS brings the pulse. Guests land in a
                cinematic invite flow designed for phones first, with a bold
                football identity from the first screen to the last button.
              </p>

              <div className="stat-row">
                <div>
                  <strong>Mobile-first</strong>
                  <span>Portrait and foldable-friendly layouts</span>
                </div>
                <div>
                  <strong>Backend-backed</strong>
                  <span>Invite submissions travel to FIFA Control</span>
                </div>
              </div>
            </div>

            <div className="hero-card">
              <div className="card-header">
                <span className="live-dot" />
                Live from the pitch
              </div>
              <div className="card-content">
                <div className="player-badge">FIFA</div>
                <div className="vs-mark">x</div>
                <div className="player-badge player-badge-alt">BTS</div>
              </div>
              <p>
                Lights up. Crowd up. Music up. The invite lands like a
                halftime reveal, then opens the request form.
              </p>
            </div>
          </div>

          <div className="pitch">
            <div className="pitch-lines" aria-hidden="true">
              {pitchMarks.map((mark) => (
                <span
                  key={mark}
                  className="pitch-line"
                  style={{ left: `${(mark / (pitchMarks.length - 1)) * 100}%` }}
                />
              ))}
            </div>
            <div className="center-circle" />
          </div>

          <div className="bottom-cta">
            <button
              className="accept-button"
              onClick={() => setIsFormOpen((value) => !value)}
              type="button"
            >
              {isFull ? "Join the waitlist" : "Join"}
            </button>

            <p className="status-copy">
              {status === "idle" && "Tap to open the guest form."}
              {status === "saving" && "Saving request..."}
              {status === "success" && message}
              {status === "error" && message}
              {status === "idle" && capacityLoaded && isFull
                ? "The invite list is full, so new guests join the waitlist."
                : null}
            </p>
          </div>
        </div>
      </section>

      {isFormOpen ? (
        <section className="form-panel" aria-label="Invite request form">
          <div className="form-card">
            <div className="form-title">
              <h2>Guest request</h2>
              <p>Enter the details needed to send your invitation record.</p>
            </div>

            <form className="invite-form" onSubmit={handleSubmit}>
              <label>
                <span>First name</span>
                <input
                  autoComplete="given-name"
                  name="firstName"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  required
                  value={form.firstName}
                />
              </label>

              <label>
                <span>Last name</span>
                <input
                  autoComplete="family-name"
                  name="lastName"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  required
                  value={form.lastName}
                />
              </label>

              <label>
                <span>Phone number</span>
                <input
                  autoComplete="tel"
                  name="phoneNumber"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phoneNumber: event.target.value,
                    }))
                  }
                  placeholder="+1 555 123 4567"
                  required
                  value={form.phoneNumber}
                />
              </label>

              <button className="submit-button" type="submit">
                Send request
              </button>
            </form>
          </div>
        </section>
      ) : null}
    </main>
  );
}
