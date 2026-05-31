"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 24px",
        background: "var(--color-background)",
      }}
    >
      <h1
        className="display"
        style={{
          fontSize: "clamp(36px,6vw,56px)",
          letterSpacing: "-0.02em",
          color: "var(--color-foreground)",
          fontWeight: 600,
        }}
      >
        Something broke.
      </h1>
      <p style={{ marginTop: 20, color: "var(--color-foreground-muted)", fontSize: 18 }}>
        The chain didn&rsquo;t.
      </p>
      <button
        type="button"
        onClick={reset}
        className="btn btn-primary btn-lg"
        style={{ marginTop: 36, textTransform: "uppercase", letterSpacing: "0.04em" }}
      >
        Refresh
      </button>
    </main>
  );
}
