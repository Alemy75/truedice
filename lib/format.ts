import { formatUnits } from "viem";

export function formatEth(wei: bigint, precision: number = 4): string {
  const v = Number(formatUnits(wei, 18));
  return v.toFixed(precision);
}

export function formatPercentBps(bps: number | bigint): string {
  const n = Number(bps) / 100;
  return `${n.toFixed(2)}%`;
}

export function formatMultiplierBps(bps: number | bigint): string {
  const n = Number(bps) / 10000;
  return `${n.toFixed(4)}×`;
}

export function truncateAddress(addr: string): string {
  if (!addr) return "";
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatRequestId(id: string | bigint): string {
  const s = typeof id === "bigint" ? id.toString() : id;
  if (s.length <= 10) return s;
  return `${s.slice(0, 5)}…${s.slice(-2)}`;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp * 1000);
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
