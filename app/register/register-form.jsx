"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "http://127.0.0.1:3010";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  function validateForm(formData) {
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const phoneNumber = String(formData.get("phoneNumber") ?? "").replace(/\D/g, "");

    const nextFieldErrors = {
      firstName:
        /^[A-Za-z]{2,}$/.test(firstName)
          ? ""
          : "first name must be at least 2 letters.",
      lastName:
        /^[A-Za-z]{2,}$/.test(lastName)
          ? ""
          : "last name must be at least 2 letters.",
      phoneNumber:
        /^\d{10}$/.test(phoneNumber)
          ? ""
          : "phone number must be exactly 10 digits.",
    };

    return {
      isValid: Object.values(nextFieldErrors).every((message) => !message),
      nextFieldErrors,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const { isValid, nextFieldErrors } = validateForm(formData);

    setFieldErrors(nextFieldErrors);

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
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

      const qrToken = data.qrToken ?? data.id;
      form.reset();
      setIsSuccess(true);
      window.setTimeout(() => {
        router.push(`/thank-you?invite=${encodeURIComponent(qrToken)}`);
      }, 420);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save your registration.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={`register-form ${isSuccess ? "is-fading-out" : ""}`} onSubmit={handleSubmit}>
      <label className="register-field">
        <span>first name</span>
        <input autoComplete="given-name" minLength={2} name="firstName" pattern="[A-Za-z]{2,}" required type="text" />
        {fieldErrors.firstName ? <p className="register-field-error">{fieldErrors.firstName}</p> : null}
      </label>

      <label className="register-field">
        <span>last name</span>
        <input autoComplete="family-name" minLength={2} name="lastName" pattern="[A-Za-z]{2,}" required type="text" />
        {fieldErrors.lastName ? <p className="register-field-error">{fieldErrors.lastName}</p> : null}
      </label>

      <label className="register-field">
        <span>phone number</span>
        <input autoComplete="tel" inputMode="tel" maxLength={10} name="phoneNumber" pattern="\d{10}" required type="tel" />
        {fieldErrors.phoneNumber ? (
          <p className="register-field-error">{fieldErrors.phoneNumber}</p>
        ) : null}
      </label>

      <label className="register-field">
        <span>profile photo</span>
        <input accept="image/*" name="profilePhoto" type="file" />
      </label>

      {error ? <p className="register-status register-status-error">{error}</p> : null}

      <button className="register-button" disabled={isSubmitting || isSuccess} type="submit">
        {isSuccess ? "redirecting..." : isSubmitting ? "signing up..." : "sign up"}
      </button>
    </form>
  );
}
