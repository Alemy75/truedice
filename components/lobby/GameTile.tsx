import Link from "next/link";
import { cn } from "@/lib/cn";

interface GameTileProps {
  name: string;
  description?: string;
  href?: string;
  state: "live" | "soon";
  image?: string; // path under /public, e.g. "/assets/games/dice.png"
}

export function GameTile({ name, description, href, state, image }: GameTileProps) {
  const isLive = state === "live";
  const body = (
    <div
      className={cn(
        "group relative aspect-square overflow-hidden rounded-lg p-6 flex flex-col bg-surface",
        "border transition-[box-shadow,border-color,transform] duration-200",
        isLive
          ? "border-primary/75 hover:border-primary hover:shadow-[var(--shadow-glow-primary)] cursor-pointer"
          : "border-primary/40 cursor-not-allowed",
      )}
    >
      {/* Background image */}
      {image && (
        <img
          src={image}
          alt=""
          aria-hidden
          className={cn(
            "absolute inset-0 w-full h-full object-cover z-0",
            !isLive && "grayscale opacity-[0.38]",
          )}
        />
      )}
      {/* Scrim to keep text readable against image */}
      <span
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,4,3,0.55) 0%, rgba(5,4,3,0.05) 38%, rgba(5,4,3,0.45) 72%, rgba(5,4,3,0.92) 100%)",
        }}
      />
      <span
        className={cn(
          "relative z-10 inline-flex items-center gap-[7px] text-[11px] uppercase tracking-[0.10em] font-medium",
          isLive ? "text-foreground-muted" : "text-foreground-muted",
        )}
      >
        <span
          className={cn(
            "status-dot",
            isLive ? "status-dot-gold status-dot-pulse" : "status-dot-silver",
          )}
        />
        {isLive ? "Live" : "Soon"}
      </span>
      <span
        className={cn(
          "relative z-10 mt-auto font-mono uppercase tracking-[0.02em] whitespace-nowrap",
          "text-[clamp(18px,1.7vw,23px)]",
          isLive ? "text-primary" : "text-foreground-muted",
        )}
      >
        {name}
      </span>
      <span className="relative z-10 mt-1.5 text-[13px] text-foreground-muted whitespace-nowrap overflow-hidden text-ellipsis min-h-[18px]">
        {description ?? ""}
      </span>
    </div>
  );

  if (isLive && href) {
    return (
      <Link href={href} aria-label={name}>
        {body}
      </Link>
    );
  }
  return body;
}
