import { describe, it, expect } from "vitest";
import {
  formatEth,
  formatEthSmart,
  formatPercentBps,
  formatMultiplierBps,
  truncateAddress,
  formatRequestId,
} from "./format";

describe("formatEth", () => {
  it("formats 1 ether with 4 decimals by default", () => {
    expect(formatEth(1_000_000_000_000_000_000n)).toBe("1.0000");
  });
  it("formats 0.001 ether", () => {
    expect(formatEth(1_000_000_000_000_000n)).toBe("0.0010");
  });
  it("respects custom precision", () => {
    expect(formatEth(1_500_000_000_000_000n, 2)).toBe("0.00");
  });
});

describe("formatEthSmart", () => {
  it("zero is just 0.0000", () => {
    expect(formatEthSmart(0n)).toBe("0.0000");
  });
  it("1 ETH at min precision", () => {
    expect(formatEthSmart(1_000_000_000_000_000_000n)).toBe("1.0000");
  });
  it("0.0001 ETH (exactly at 4-decimal cusp)", () => {
    expect(formatEthSmart(100_000_000_000_000n)).toBe("0.0001");
  });
  it("0.00001 ETH bumps to 8 decimals (rounds to 0 at minPrecision=4)", () => {
    expect(formatEthSmart(10_000_000_000_000n)).toBe("0.00001000");
  });
  it("0.00000102 ETH bumps to 8 decimals (small net profit case)", () => {
    expect(formatEthSmart(1_020_000_000_000n)).toBe("0.00000102");
  });
  it("caps at 8 decimals — sub-wei dust still rounds to 0.00000000", () => {
    // 1 wei is below 8 decimals, so it does round to 0.00000000 — this
    // is acceptable since casino amounts are always >> 1 wei.
    expect(formatEthSmart(1n)).toBe("0.00000000");
  });
  it("smallest realistic casino profit (~1e12 wei) displays cleanly", () => {
    // 0.0001 ETH stake × 0.0102 (1.0102x mult net) = 1.02e12 wei profit
    expect(formatEthSmart(1_020_000_000_000n)).toBe("0.00000102");
  });
});

describe("formatPercentBps", () => {
  it("4950 bps → '49.50%'", () => {
    expect(formatPercentBps(4950)).toBe("49.50%");
  });
  it("200 bps → '2.00%'", () => {
    expect(formatPercentBps(200)).toBe("2.00%");
  });
});

describe("formatMultiplierBps", () => {
  it("20000 bps → '2.0000×'", () => {
    expect(formatMultiplierBps(20000)).toBe("2.0000×");
  });
  it("495000 bps → '49.5000×'", () => {
    expect(formatMultiplierBps(495000)).toBe("49.5000×");
  });
});

describe("truncateAddress", () => {
  it("returns 0x..xxxx form", () => {
    expect(truncateAddress("0x7a3f6c89d2f1234567890abcdef1234567890d2f")).toBe(
      "0x7a3f...0d2f"
    );
  });
  it("returns empty for empty string", () => {
    expect(truncateAddress("")).toBe("");
  });
});

describe("formatRequestId", () => {
  it("truncates long ids", () => {
    expect(formatRequestId("78394201845207834928374")).toBe("78394…74");
  });
});
