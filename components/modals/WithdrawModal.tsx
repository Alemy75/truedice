"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Modal } from "./Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCasinoContract } from "@/hooks/useCasinoContract";
import { useCasinoBalance } from "@/hooks/useBalance";
import { formatEth } from "@/lib/format";

const PRESETS = ["0.01", "0.05", "0.1"];

export function WithdrawModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const contract = useCasinoContract();
  const { data: balance } = useCasinoBalance();
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
    if (balance !== undefined && value > (balance as bigint)) {
      setError("Exceeds balance");
      return;
    }
    try {
      const hash = await writeContractAsync({
        ...contract,
        functionName: "withdraw",
        args: [value],
      });
      setTxHash(hash);
    } catch (e) {
      setError((e as Error).message);
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
    <Modal
      open={open}
      onClose={onClose}
      title="Withdraw ETH"
      subtitle={
        <>
          Available ·{" "}
          <span className="font-mono text-foreground">
            {balance !== undefined ? formatEth(balance as bigint) : "—"} ETH
          </span>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          suffix="ETH"
          inputMode="decimal"
        />
        <div className="flex items-center gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p}
              variant="secondary"
              size="sm"
              onClick={() => setAmount(Number(p).toFixed(4))}
              className="flex-1 font-mono"
            >
              {p}
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={setMax}
            className="flex-1 font-mono"
          >
            Max
          </Button>
        </div>
        {error && (
          <div className="text-sm text-danger-bright font-mono">{error}</div>
        )}
        <Button
          variant="primary"
          size="lg"
          goldRim
          glow
          className="w-full h-14 uppercase font-bold tracking-wide mt-3"
          onClick={onSubmit}
          disabled={isPending || confirming}
        >
          {ctaLabel}
        </Button>
        <p className="text-xs text-foreground-subtle pt-2">
          Funds return to your connected wallet in one transaction.
        </p>
      </div>
    </Modal>
  );
}
