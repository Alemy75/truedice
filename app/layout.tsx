import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";
import { NetworkBanner } from "@/components/layout/NetworkBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "True Dice — Provably fair on-chain dice",
  description:
    "Verifiable casino dice on Ethereum Sepolia via Chainlink VRF. No house secrets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <Providers>
          <NetworkBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
