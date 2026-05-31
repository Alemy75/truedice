import Link from "next/link";
import { Nav } from "@/components/layout/Nav";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="container" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", paddingTop: 140, paddingBottom: 96 }}>
        <h1 className="display" style={{ fontSize: "clamp(40px,7vw,64px)", letterSpacing: "-0.02em", color: "var(--color-foreground)", fontWeight: 600 }}>
          Roll not found.
        </h1>
        <p style={{ marginTop: 20, color: "var(--color-foreground-muted)", fontSize: 18 }}>
          The chain has no record of that path.
        </p>
        <Link href="/" className="btn btn-primary btn-lg" style={{ marginTop: 36, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Back to lobby
        </Link>
      </main>
    </>
  );
}
