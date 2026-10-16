"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#F5F5F5",
          color: "#111827",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <main style={{ maxWidth: 560, margin: "12vh auto", padding: 24 }}>
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#6B7280" }}>UniBaazar could not load this page.</p>
          {error.digest ? (
            <p style={{ color: "#6B7280", fontSize: 12 }}>Reference {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              background: "#F95B09",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "12px 16px",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
