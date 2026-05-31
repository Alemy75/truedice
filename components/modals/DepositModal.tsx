"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Modal } from "./Modal";
import { useCasinoContract } from "@/hooks/useCasinoContract";

const PRESETS = ["0.01", "0.05", "0.1"];

export function DepositModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const contract = useCasinoContract();
  const [amount, setAmount] = useState("0.0100");
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: confirming } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  async function onSubmit() {
    setError(null);
    let value: bigint;
    try {
      value = parseEther(amount as `${number}`);
    } catch {
      setError("Invalid amount");
      return;
    }
    if (value <= 0n) {
      setError("Amount must be greater than 0");
      return;
    }
    try {
      const hash = await writeContractAsync({
        ...contract,
        functionName: "deposit",
        value,
      });
      setTxHash(hash);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const ctaLabel = isPending
    ? "CONFIRM IN WALLET"
    : confirming
      ? "DEPOSITING…"
      : `DEPOSIT ${Number(amount || "0").toFixed(4)} ETH`;

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Deposit ETH">
      <h2 className="display" style={{ fontSize: 24, fontWeight: 600 }}>
        Deposit ETH
      </h2>
      <p className="text-muted" style={{ fontSize: 14, marginTop: 4 }}>
        Your balance funds bets. Withdraw any time.
      </p>

      <div className="field-wrap" style={{ marginTop: 24 }}>
        <input
          className="field has-suffix"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Deposit amount"
        />
        <span className="field-suffix">ETH</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className="btn btn-secondary btn-sm mono"
            style={{ flex: 1 }}
            onClick={() => setAmount(Number(p).toFixed(4))}
          >
            {p}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="mono text-danger"
          style={{ fontSize: 13, marginTop: 12 }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block mono"
        style={{
          height: 56,
          marginTop: 24,
          fontFamily: "var(--font-sans)",
          width: "100%",
        }}
        onClick={onSubmit}
        disabled={isPending || confirming}
      >
        {ctaLabel}
      </button>

      <p
        className="text-subtle"
        style={{ fontSize: 12, marginTop: 16 }}
      >
        Need Sepolia ETH? Get some at{" "}
        <a
          className="escan"
          href="https://sepoliafaucet.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--color-primary)" }}
        >
          <span className="escan-label">sepoliafaucet.com</span> ↗
        </a>
      </p>
    </Modal>
  );
}
