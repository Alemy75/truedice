import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  type: "tx" | "address" | "block";
  value: string | number | bigint;
  label?: string;
  className?: string;
}

const BASE = "https://sepolia.etherscan.io";

export function EtherscanLink({ type, value, label, className }: Props) {
  const v = typeof value === "bigint" ? value.toString() : String(value);
  const href =
    type === "tx"
      ? `${BASE}/tx/${v}`
      : type === "address"
        ? `${BASE}/address/${v}`
        : `${BASE}/block/${v}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 font-mono text-sm text-foreground hover:text-primary transition-colors",
        className,
      )}
    >
      {label ?? v}
      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
    </a>
  );
}
