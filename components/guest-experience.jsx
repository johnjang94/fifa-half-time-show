"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import heroImage from "../image.png";

export function GuestExperience() {
  const router = useRouter();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const isPhoneNumberComplete = digitsOnly.length === 10;

  function handleLoginSubmit(event) {
    event.preventDefault();
    router.push("/portal");
  }

  return (
    <main className="home-page page-shell">
      <section className="hero-stage">
        <div className="hero-media">
          <Image
            alt="FIFA Half-Time Show background"
            className="hero-image"
            fill
            priority
            sizes="100vw"
            src={heroImage}
          />
          <div className="hero-overlay" aria-hidden="true" />
        </div>

        <div className="hero-content">
          <div className="cta-band">
            <div className={`auth-switch ${isLoginOpen ? "is-open" : ""}`}>
              <div className="auth-state auth-state-login" aria-hidden={isLoginOpen}>
                <button
                  className="login-button"
                  onClick={() => setIsLoginOpen(true)}
                  type="button"
                >
                  Login
                </button>
              </div>

              <form
                className="auth-state auth-state-form"
                onSubmit={handleLoginSubmit}
              >
                <label className="login-field">
                  <span>phone number</span>
                  <input
                    autoComplete="tel"
                    inputMode="tel"
                    name="phoneNumber"
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="Enter phone number"
                    type="tel"
                    value={phoneNumber}
                  />
                </label>

                <button
                  className={`login-submit ${isPhoneNumberComplete ? "is-ready" : ""}`}
                  disabled={!isPhoneNumberComplete}
                  type="submit"
                >
                  enter the party
                </button>
              </form>
            </div>

            <Link className="join-link" href="/overview">
              join the watch party
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
