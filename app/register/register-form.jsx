"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";
const MAX_PROFILE_PHOTO_BYTES = 50 * 1024 * 1024;
const NAME_PATTERN = /^[A-Za-z]{2,}$/;
const PHONE_PATTERN = /^\d{10}$/;
const SUPPORTED_PROFILE_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes >= 1024 * 1024) {
    const megabytes = bytes / (1024 * 1024);
    return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function resolveProfilePhotoType(file) {
  const mimeType = typeof file.type === "string" ? file.type.trim().toLowerCase() : "";
  if (mimeType) {
    return mimeType;
  }

  const extension = String(file.name ?? "")
    .split(".")
    .pop()
    ?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  return "";
}

function isSupportedProfilePhoto(file) {
  return SUPPORTED_PROFILE_PHOTO_TYPES.has(resolveProfilePhotoType(file));
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to process the selected photo."));
    image.src = source;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function compressProfilePhoto(file) {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof File === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const width = Number(image.naturalWidth || image.width || 0);
    const height = Number(image.naturalHeight || image.height || 0);

    if (!width || !height) {
      return file;
    }

    const maxDimension = 1280;
    const scale = Math.min(1, maxDimension / Math.max(width, height));

    if (scale >= 1) {
      return file;
    }

    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const compressedBlob =
      (await canvasToBlob(canvas, "image/webp", 0.82)) ??
      (await canvasToBlob(canvas, "image/jpeg", 0.82));

    if (!compressedBlob || compressedBlob.size >= file.size) {
      return file;
    }

    const baseName = String(file.name ?? "profile-photo").replace(/\.[^.]+$/, "") || "profile-photo";
    const extension = compressedBlob.type === "image/jpeg" ? "jpg" : "webp";

    return new File([compressedBlob], `${baseName}.${extension}`, {
      type: compressedBlob.type || "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPrivacyAccepted, setIsPrivacyAccepted] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    privacyAccepted: "",
  });
  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [inviteCount, setInviteCount] = useState(0);
  const [capacity, setCapacity] = useState(null);
  const [isFull, setIsFull] = useState(false);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      try {
        const response = await fetch(`${controlBaseUrl}/api/invites`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!cancelled && response.ok && data.ok) {
          setInviteCount(Number(data.inviteCount ?? 0));
          setCapacity(
            data.capacity === null || data.capacity === undefined
              ? null
              : Number(data.capacity),
          );
          setIsFull(Boolean(data.isFull));
          setAvailabilityLoaded(true);
        }
      } catch {
        // Best effort only. Fall back to the default CTA text.
      }
    }

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, []);

  function validateForm(formData) {
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const phoneNumber = String(formData.get("phoneNumber") ?? "").replace(/\D/g, "");
    const privacyAccepted = formData.get("privacyAccepted") === "on";

    const nextFieldErrors = {
      firstName:
        NAME_PATTERN.test(firstName)
          ? ""
          : "Please enter at least 2 letters for the first name.",
      lastName:
        NAME_PATTERN.test(lastName)
          ? ""
          : "Please enter at least 2 letters for the last name.",
      phoneNumber:
        PHONE_PATTERN.test(phoneNumber)
          ? ""
          : "Please enter a 10-digit phone number, like 5551234567.",
      privacyAccepted: privacyAccepted
        ? ""
        : "Please confirm the privacy policy before signing up.",
    };

    return {
      isValid: Object.values(nextFieldErrors).every((message) => !message),
      nextFieldErrors,
    };
  }

  function isFormComplete(values) {
    return (
      NAME_PATTERN.test(values.firstName.trim()) &&
      NAME_PATTERN.test(values.lastName.trim()) &&
      PHONE_PATTERN.test(values.phoneNumber.replace(/\D/g, "")) &&
      isPrivacyAccepted
    );
  }

  const isReady = isFormComplete(formValues);
  const isWaitlistMode = availabilityLoaded && isFull;
  const submitLabel = isSuccess
    ? "redirecting..."
    : isSubmitting
      ? isWaitlistMode
        ? "joining waitlist..."
        : "signing up..."
      : isWaitlistMode
        ? "join the waitlist"
        : "sign up";

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const profilePhoto = formData.get("profilePhoto");

    const { isValid, nextFieldErrors } = validateForm(formData);

    setFieldErrors(nextFieldErrors);

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (profilePhoto instanceof File && profilePhoto.size > 0) {
        if (!isSupportedProfilePhoto(profilePhoto)) {
          throw new Error("Please upload a JPG, PNG, or WebP photo.");
        }

        if (profilePhoto.size > MAX_PROFILE_PHOTO_BYTES) {
          const compressedPhoto = await compressProfilePhoto(profilePhoto);
          if (compressedPhoto.size > MAX_PROFILE_PHOTO_BYTES) {
            throw new Error(
              `That photo is too large. Please use one under ${formatFileSize(MAX_PROFILE_PHOTO_BYTES)}.`,
            );
          }

          formData.set("profilePhoto", compressedPhoto, compressedPhoto.name);
        }
      }

      const response = await fetch(`${controlBaseUrl}/api/invites`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Unable to save your registration.");
      }

      const qrToken = data.qrToken ?? data.id;
      const barcode = typeof data.barcode === "string" ? data.barcode : "";

      form.reset();
      setIsPrivacyAccepted(false);
      setIsSuccess(true);
      window.setTimeout(() => {
        const query = new URLSearchParams({ invite: qrToken });
        if (barcode) {
          query.set("barcode", barcode);
        }
        router.push(`/thank-you?${query.toString()}`);
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
    <form
      className={`register-form ${isSuccess ? "is-fading-out" : ""}`}
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="register-name-row">
        <label className="register-field">
          <span>first name</span>
          <input
            autoComplete="given-name"
            minLength={2}
            name="firstName"
            onChange={(event) =>
              setFormValues((current) => ({ ...current, firstName: event.target.value }))
            }
            pattern="[A-Za-z]{2,}"
            required
            type="text"
            value={formValues.firstName}
          />
          {fieldErrors.firstName ? <p className="register-field-error">{fieldErrors.firstName}</p> : null}
        </label>

        <label className="register-field">
          <span>last name</span>
          <input
            autoComplete="family-name"
            minLength={2}
            name="lastName"
            onChange={(event) =>
              setFormValues((current) => ({ ...current, lastName: event.target.value }))
            }
            pattern="[A-Za-z]{2,}"
            required
            type="text"
            value={formValues.lastName}
          />
          {fieldErrors.lastName ? <p className="register-field-error">{fieldErrors.lastName}</p> : null}
        </label>
      </div>

      <label className="register-field">
        <span>phone number</span>
        <input
          autoComplete="tel"
          inputMode="numeric"
          maxLength={10}
          name="phoneNumber"
          onChange={(event) =>
            setFormValues((current) => ({ ...current, phoneNumber: event.target.value }))
          }
          pattern="\d{10}"
          required
          type="tel"
          value={formValues.phoneNumber}
        />
        {fieldErrors.phoneNumber ? (
          <p className="register-field-error">{fieldErrors.phoneNumber}</p>
        ) : null}
      </label>

      <label className="register-field">
        <span>profile photo</span>
        <input accept="image/jpeg,image/png,image/webp" name="profilePhoto" type="file" />
        <p className="register-field-help">
          JPEG, PNG, or WebP. Large photos are compressed automatically, and the final upload should stay under{" "}
          {formatFileSize(MAX_PROFILE_PHOTO_BYTES)}.
        </p>
      </label>

      <div className="register-privacy">
        <label className="register-privacy-acceptance">
          <input
            checked={isPrivacyAccepted}
            aria-label="Accept the privacy policy"
            name="privacyAccepted"
            onChange={(event) => {
              setIsPrivacyAccepted(event.target.checked);
              setFieldErrors((current) => ({ ...current, privacyAccepted: "" }));
            }}
            type="checkbox"
          />
          <span>I agree</span>
        </label>
        <button
          className="register-privacy-link"
          type="button"
          onClick={() => setIsPrivacyPolicyOpen(true)}
        >
          privacy policy
        </button>
      </div>

      {fieldErrors.privacyAccepted ? (
        <p className="register-field-error">{fieldErrors.privacyAccepted}</p>
      ) : null}

      {error ? <p className="register-status register-status-error">{error}</p> : null}

      <button
        className={`register-button ${isReady ? "is-ready" : ""}`}
        disabled={isSubmitting || isSuccess || !isPrivacyAccepted}
        type="submit"
      >
        {submitLabel}
      </button>

      <p className="register-field-help">
        {availabilityLoaded && capacity !== null
          ? `${inviteCount} of ${capacity} spots are filled.`
          : availabilityLoaded
            ? `${inviteCount} guests are signed up.`
            : "Checking availability..."}
      </p>

      {isPrivacyPolicyOpen ? (
        <div
          className="register-privacy-modal"
          role="presentation"
          onClick={() => setIsPrivacyPolicyOpen(false)}
        >
          <div
            aria-modal="true"
            className="register-privacy-dialog"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="register-privacy-title">privacy policy</p>
            <p className="register-privacy-copy">
              Your personal information will be kept strictly confidential. It will be used only
              to verify and manage your login for the event, and it will be permanently deleted
              after the event ends, with no possibility of recovery.
            </p>
            <button
              className="register-privacy-close"
              type="button"
              onClick={() => setIsPrivacyPolicyOpen(false)}
            >
              close
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
