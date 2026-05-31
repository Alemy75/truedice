import { describe, it, expect } from "vitest";
import {
  formatEth,
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
