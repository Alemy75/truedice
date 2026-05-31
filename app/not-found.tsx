import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-24">
        <h1 className="font-display font-semibold tracking-[-0.02em] text-[clamp(40px,7vw,64px)] text-foreground">
          Roll not found.
        </h1>
        <p className="mt-5 text-foreground-muted text-lg">
          The chain has no record of that path.
        </p>
        <Link href="/">
          <Button
            variant="primary"
            size="lg"
            goldRim
            glow
            className="mt-9 uppercase font-bold tracking-wide"
          >
            Back to lobby
          </Button>
        </Link>
      </main>
    </>
  );
}
