"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { truncateAddress } from "@/lib/format";
import { cn } from "@/lib/cn";

interface AddressChipProps {
  address: string;
  className?: string;
  showCopy?: boolean;
}

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

  return (
    <button
      type="button"
      onClick={showCopy ? handleCopy : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-sm text-foreground hover:text-primary transition-colors",
        showCopy && "cursor-pointer",
        className,
      )}
      title={address}
    >
      {truncateAddress(address)}
      {showCopy &&
        (copied ? (
          <Check className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-foreground-subtle" />
        ))}
    </button>
  );
}
