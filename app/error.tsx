"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

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
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-background">
      <h1 className="font-display font-semibold tracking-[-0.02em] text-[clamp(36px,6vw,56px)] text-foreground">
        Something broke.
      </h1>
      <p className="mt-5 text-foreground-muted text-lg">The chain didn&rsquo;t.</p>
      <Button
        variant="primary"
        size="lg"
        goldRim
        glow
        onClick={reset}
        className="mt-9 uppercase font-bold tracking-wide"
      >
        Refresh
      </Button>
    </main>
  );
}
