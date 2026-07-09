"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100svh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "#05090d",
            color: "#fffaf3",
            fontFamily:
              '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Baskerville, Georgia, serif',
            textAlign: "center",
          }}
        >
          <section style={{ maxWidth: "32rem" }}>
            <p style={{ letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.72 }}>
              Something went wrong
            </p>
            <h1 style={{ margin: "0.5rem 0 0" }}>Please refresh and try again.</h1>
          </section>
        </main>
      </body>
    </html>
  );
}
