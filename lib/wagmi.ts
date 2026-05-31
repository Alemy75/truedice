import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http, fallback } from "viem";

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY ?? "";
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

/**
 * Sepolia RPC transports — primary Alchemy (if key provided) with public
 * RPC fallbacks. viem's `fallback()` automatically switches to the next
 * transport if the current one rate-limits or errors. Order matters:
 * first one is tried first.
 *
 * Public fallbacks chosen for reliability + no API key requirement:
 * - publicnode.com: 50 req/sec
 * - sepolia.gateway.tenderly.co: 50 req/sec
 * - 1rpc.io: 100 req/min
 * - rpc.sepolia.org: official Ethereum public node
 */
const sepoliaTransports = [
  ...(ALCHEMY_KEY
    ? [http(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`)]
    : []),
  http("https://ethereum-sepolia-rpc.publicnode.com"),
  http("https://sepolia.gateway.tenderly.co"),
  http("https://1rpc.io/sepolia"),
  http("https://rpc.sepolia.org"),
];

export const wagmiConfig = getDefaultConfig({
  appName: "True Dice",
  projectId: WC_PROJECT_ID,
  chains: [sepolia],
  transports: {
    [sepolia.id]: fallback(sepoliaTransports, {
      rank: false, // try in order rather than load-balance
      retryCount: 1,
      retryDelay: 200,
    }),
  },
  ssr: true,
});
