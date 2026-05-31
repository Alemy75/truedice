"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { truncateAddress } from "@/lib/format";

interface AddressChipProps {
  address: string;
  className?: string;
  showCopy?: boolean;
}

/**
 * Truncated address chip with optional click-to-copy. Uses the global
 * .mono class for the typeface; everything else is inline-styled so the
 * component is self-contained (no Tailwind utilities).
 */
export function AddressChip({
  address,
  className,
  showCopy = true,
}: AddressChipProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available
    }
  }

  const cls = ["mono", "addr-chip", className].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      onClick={showCopy ? handleCopy : undefined}
      className={cls}
      title={address}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 14,
        color: "var(--color-foreground)",
        transition: "color 150ms ease-out",
        cursor: showCopy ? "pointer" : "default",
      }}
    >
      {truncateAddress(address)}
      {showCopy &&
        (copied ? (
          <Check style={{ width: 14, height: 14, color: "var(--color-primary)" }} />
        ) : (
          <Copy style={{ width: 14, height: 14, color: "var(--color-foreground-subtle)" }} />
        ))}
    </button>
  );
}
