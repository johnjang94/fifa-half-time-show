import Image from "next/image";
import Link from "next/link";
import heroImage from "../image.png";

export function GuestExperience() {
  return (
    <main className="app-frame page-shell">
      <section className="hero-stage">
        <div className="hero-copy">
          <h1>Watch Party</h1>
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
          <Link className="join-button" href="/overview">
            Join
          </Link>
        </div>
      </section>
    </main>
  );
}
