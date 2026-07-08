"use client";

import { useState } from "react";

const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "http://127.0.0.1:3010";

export function RegisterForm() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsSubmitting(true);
    setStatus("");
    setError("");

    try {
      const response = await fetch(`${controlBaseUrl}/api/invites`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Unable to save your registration.");
      }

      form.reset();
      setStatus("Your registration has been saved.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save your registration.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <label className="register-field">
        <span>first name</span>
        <input autoComplete="given-name" name="firstName" required type="text" />
      </label>

      <label className="register-field">
        <span>last name</span>
        <input autoComplete="family-name" name="lastName" required type="text" />
      </label>

      <label className="register-field">
        <span>phone number</span>
        <input autoComplete="tel" inputMode="tel" name="phoneNumber" required type="tel" />
      </label>

      <label className="register-field">
        <span>profile photo</span>
        <input accept="image/*" name="profilePhoto" type="file" />
      </label>

      {status ? <p className="register-status">{status}</p> : null}
      {error ? <p className="register-status register-status-error">{error}</p> : null}

      <button className="register-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "signing up..." : "sign up"}
      </button>
    </form>
  );
}
