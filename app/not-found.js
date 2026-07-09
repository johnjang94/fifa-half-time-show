"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#05090d",
        color: "#fffaf3",
        textAlign: "center",
      }}
    >
      <section style={{ maxWidth: "32rem" }}>
        <p style={{ letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.72 }}>
          Page missing
        </p>
        <h1 style={{ margin: "0.5rem 0 0" }}>This page does not exist.</h1>
        <p style={{ marginTop: "1rem", opacity: 0.78, lineHeight: 1.6 }}>
          Let&apos;s take you back to the beginning.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            marginTop: "1.5rem",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "999px",
            padding: "0.9rem 1.2rem",
            background: "rgba(255,255,255,0.08)",
            color: "#fffaf3",
            textDecoration: "none",
          }}
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
