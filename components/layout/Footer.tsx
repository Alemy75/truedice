import Link from "next/link";
import { truncateAddress } from "@/lib/format";

const CONTRACT = process.env.NEXT_PUBLIC_CASINO_CONTRACT as `0x${string}` | undefined;
const ETHERSCAN_BASE = "https://sepolia.etherscan.io";

/**
 * Site-wide footer.
 *
 * Mirrors the original Claude Design footer mockup 1:1.
 * Uses global CSS (.footer, .footer-grid, .footer-bottom, .brand-logo,
 * .addr, .escan) defined in app/globals.css.
 */
export function Footer({ id }: { id?: string }) {
  return (
    <footer className="footer" id={id}>
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="brand-logo footer-logo" aria-label="True Dice">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo.webp" alt="True Dice" />
            </Link>
            <p
              className="text-muted"
              style={{ fontSize: 14, marginTop: 14, maxWidth: 280 }}
            >
              Provably fair, on-chain dice. No house secrets.
            </p>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Contract
            </div>
            {CONTRACT ? (
              <>
                <span className="addr">
                  <span className="addr-text mono">{truncateAddress(CONTRACT)}</span>
                </span>
                <div style={{ marginTop: 10 }}>
                  <a
                    className="escan"
                    href={`${ETHERSCAN_BASE}/address/${CONTRACT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="escan-label" style={{ fontSize: 13 }}>
                      View on Etherscan
                    </span>{" "}
                    ↗
                  </a>
                </div>
              </>
            ) : (
              <span className="mono text-subtle">—</span>
            )}
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Resources
            </div>
            <div className="footer-links">
              <a
                href="https://github.com/Alemy75/truedice"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub ↗
              </a>
              <Link href="/about">Provably Fair ↗</Link>
              <Link href="/about">About ↗</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 True Dice · A TrueLabel product</span>
          <span>Testnet only. Not available where prohibited.</span>
        </div>
      </div>
    </footer>
  );
}
