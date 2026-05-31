"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Modal } from "./Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
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
    <Modal
      open={open}
      onClose={onClose}
      title="Deposit ETH"
      subtitle="Your balance funds bets. Withdraw any time."
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
          Need Sepolia ETH? Get some at{" "}
          <a
            href="https://sepoliafaucet.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary-hover"
          >
            sepoliafaucet.com
          </a>
          .
        </p>
      </div>
    </Modal>
  );
}
