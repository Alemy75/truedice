"use client";

import { useEffect, useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Modal } from "./Modal";
import { useCasinoContract } from "@/hooks/useCasinoContract";
import { useCasinoBalance } from "@/hooks/useBalance";
import { formatEth } from "@/lib/format";
import { useToast } from "@/components/toast/ToastProvider";

const PRESETS = ["0.01", "0.05", "0.1"];
const ETHERSCAN_BASE = "https://sepolia.etherscan.io";

export function WithdrawModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const contract = useCasinoContract();
  const { data: balance } = useCasinoBalance();
  const { showToast } = useToast();
  const [amount, setAmount] = useState("0.0100");
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [submittedAmount, setSubmittedAmount] = useState<string>("0");
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setTxHash(undefined);
      setError(null);
    }
  }, [open]);

  // On successful confirmation: close modal + show success toast.
  useEffect(() => {
    if (isSuccess && txHash) {
      showToast({
        message: `Withdrew ${submittedAmount} ETH`,
        description: "Funds are now in your connected wallet.",
        variant: "success",
        link: { href: `${ETHERSCAN_BASE}/tx/${txHash}`, label: "View on Etherscan" },
      });
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, txHash]);

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
    if (balance !== undefined && value > (balance as bigint)) {
      setError("Exceeds balance");
      return;
    }
    try {
      setSubmittedAmount(Number(amount).toFixed(4));
      const hash = await writeContractAsync({
        ...contract,
        functionName: "withdraw",
        args: [value],
      });
      setTxHash(hash);
    } catch (e) {
      const msg = (e as Error).message;
      if (/user rejected|denied/i.test(msg)) {
        setError("Transaction rejected in wallet");
      } else {
        setError(msg);
      }
    }
  }

  function setMax() {
    if (balance !== undefined) setAmount(formatEth(balance as bigint, 6));
  }

  const ctaLabel = isPending
    ? "CONFIRM IN WALLET"
    : confirming
      ? "WITHDRAWING…"
      : `WITHDRAW ${Number(amount || "0").toFixed(4)} ETH`;

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Withdraw ETH">
      <h2 className="display" style={{ fontSize: 24, fontWeight: 600 }}>
        Withdraw ETH
      </h2>
      <p className="text-muted" style={{ fontSize: 14, marginTop: 4 }}>
        Available ·{" "}
        <span
          className="mono"
          style={{ color: "var(--color-foreground)" }}
        >
          {balance !== undefined ? formatEth(balance as bigint, 6) : "—"} ETH
        </span>
      </p>

      <div className="field-wrap" style={{ marginTop: 24 }}>
        <input
          className="field has-suffix"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Withdraw amount"
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
        <button
          type="button"
          className="btn btn-secondary btn-sm mono"
          style={{ flex: 1 }}
          onClick={setMax}
        >
          Max
        </button>
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
        Funds return to your connected wallet in one transaction.
      </p>
    </Modal>
  );
}
