import { describe, it, expect } from "vitest";
import {
  calcMultiplierBps,
  calcWinChanceBps,
  calcProfitOnWin,
  HOUSE_EDGE_BPS,
  MIN_ROLL_UNDER,
  MAX_ROLL_UNDER,
} from "./multiplier";

describe("calcMultiplierBps", () => {
  it("rollUnder 4950 → 20000 (2.0x)", () => {
    expect(calcMultiplierBps(4950)).toBe(20000);
  });
  it("rollUnder 200 → 495000 (49.5x)", () => {
    expect(calcMultiplierBps(200)).toBe(495000);
  });
  it("rollUnder 9800 → 10102 (1.0102x)", () => {
    expect(calcMultiplierBps(9800)).toBe(10102);
  });
});

describe("calcWinChanceBps from rollUnder", () => {
  it("inverse of rollUnder for canonical points", () => {
    expect(calcWinChanceBps(4950)).toBe(4950);
  });
});

describe("calcProfitOnWin", () => {
  it("0.001 ETH at 2.0x → 0.001 profit", () => {
    const stake = 1_000_000_000_000_000n; // 0.001 ETH in wei
    const mult = 20000;
    expect(calcProfitOnWin(stake, mult)).toBe(1_000_000_000_000_000n);
  });
  it("0.001 ETH at 49.5x → 0.0485 profit", () => {
    const stake = 1_000_000_000_000_000n;
    const mult = 495000;
    // payout = 0.0495; profit = 0.0485
    expect(calcProfitOnWin(stake, mult)).toBe(48_500_000_000_000_000n);
  });
});

describe("constants", () => {
  it("HOUSE_EDGE_BPS is 100 (1.00%)", () => {
    expect(HOUSE_EDGE_BPS).toBe(100);
  });
  it("MIN_ROLL_UNDER is 200, MAX is 9800", () => {
    expect(MIN_ROLL_UNDER).toBe(200);
    expect(MAX_ROLL_UNDER).toBe(9800);
  });
});
