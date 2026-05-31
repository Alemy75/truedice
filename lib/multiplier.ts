export const HOUSE_EDGE_BPS = 100;
export const MIN_ROLL_UNDER = 200;
export const MAX_ROLL_UNDER = 9800;
export const MAX_BET_BPS_OF_BANKROLL = 100; // 1% of bankroll cap per bet
// Mirrors CasinoDice.sol::MIN_BET — must stay in sync with the deployed
// contract. The contract reverts BetTooSmall if stake < MIN_BET.
export const MIN_BET_WEI = 100_000_000_000_000n; // 0.0001 ETH

export function calcMultiplierBps(rollUnder: number): number {
  if (rollUnder < MIN_ROLL_UNDER || rollUnder > MAX_ROLL_UNDER) {
    throw new Error(`rollUnder out of range: ${rollUnder}`);
  }
  return Math.floor((10000 * (10000 - HOUSE_EDGE_BPS)) / rollUnder);
}

export function calcWinChanceBps(rollUnder: number): number {
  return rollUnder;
}

export function calcProfitOnWin(stakeWei: bigint, multiplierBps: number): bigint {
  const payout = (stakeWei * BigInt(multiplierBps)) / 10000n;
  return payout - stakeWei;
}

export function calcPayoutOnWin(stakeWei: bigint, multiplierBps: number): bigint {
  return (stakeWei * BigInt(multiplierBps)) / 10000n;
}
