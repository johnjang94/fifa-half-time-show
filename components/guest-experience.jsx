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

  function handleLoginSubmit(event) {
    event.preventDefault();
    router.push("/portal");
  }

  return (
    <main className="app-frame page-shell">
      <section className="hero-stage">
        <div className="hero-copy">
          <p className="hero-title">Watch Party</p>
        </div>

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

        <div className="hero-actions">
          <button
            className="login-button"
            onClick={() => setIsLoginOpen(true)}
            type="button"
          >
            Login
          </button>
          <Link className="join-link" href="/overview">
            Join
          </Link>
        </div>

        {isLoginOpen ? (
          <form className="login-panel" onSubmit={handleLoginSubmit}>
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

            <button className="login-submit" type="submit">
              Login
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
