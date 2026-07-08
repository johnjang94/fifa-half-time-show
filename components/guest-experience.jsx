import Image from "next/image";
import Link from "next/link";
import heroImage from "../image.png";

export function GuestExperience() {
  return (
    <main className="page-shell">
      <section className="hero-stage">
        <Image
          alt="FIFA Half-Time Show background"
          className="hero-image"
          fill
          priority
          sizes="100vw"
          src={heroImage}
        />
        <div className="hero-overlay" aria-hidden="true" />

        <div className="hero-content">
          <h1>Welcome to FIFA Half-Time Show Party</h1>

          <Link className="join-button" href="/overview">
            Join
          </Link>
        </div>
      </section>
    </main>
  );
}
