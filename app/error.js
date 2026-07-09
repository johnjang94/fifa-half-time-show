"use client";

export default function ErrorPage({ error, reset }) {
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
          Something went wrong
        </p>
        <h1 style={{ margin: "0.5rem 0 0" }}>Please try again.</h1>
        <p style={{ marginTop: "1rem", opacity: 0.78, lineHeight: 1.6 }}>
          {error?.message ?? "An unexpected error occurred."}
        </p>
        <button
          onClick={() => reset()}
          type="button"
          style={{
            marginTop: "1.5rem",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "999px",
            padding: "0.9rem 1.2rem",
            background: "rgba(255,255,255,0.08)",
            color: "#fffaf3",
          }}
        >
          Retry
        </button>
      </section>
    </main>
  );
}
