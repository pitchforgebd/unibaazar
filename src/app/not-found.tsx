import Link from "next/link";

// This is the outermost fallback, reached only when a request doesn't even
// resolve to a valid locale segment (so there's no next-intl context to read
// a translation from — see src/app/[locale]/layout.tsx's notFound() call).
// Deliberately plain next/link, not the locale-aware one: this page exists
// precisely for the case where a locale couldn't be determined. The normal
// in-app 404 is src/app/[locale]/(store)/not-found.tsx, which is properly
// translated and themed.
export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif" }}>
        <main style={{ maxWidth: 480, margin: "15vh auto", textAlign: "center" }}>
          <h1 style={{ fontSize: 28 }}>Page not found</h1>
          <p style={{ color: "#6B7280" }}>That page is not on UniBaazar.</p>
          <Link href="/" style={{ color: "#AA3B06" }}>
            Go home
          </Link>
        </main>
      </body>
    </html>
  );
}
