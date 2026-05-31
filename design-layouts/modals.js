/* ============================================================
   TRUE DICE — Shared modals (Connect / Deposit / Withdraw)
   Injected into any page that loads this script.
   ============================================================ */
(function () {
  'use strict';

  const walletMark = (bg, glyph) =>
    `<span style="width:36px;height:36px;border-radius:8px;background:${bg};display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-weight:600;font-size:15px;color:#0A0908;flex:none">${glyph}</span>`;

  const html = `
  <!-- Connect Wallet -->
  <div class="modal-backdrop" id="modal-connect">
    <div class="modal" style="position:relative" role="dialog" aria-modal="true" aria-label="Connect Wallet">
      <button class="modal-close" onclick="TD.closeModal('modal-connect')" aria-label="Close">&times;</button>
      <h2 class="display" style="font-size:24px;font-weight:600">Connect Wallet</h2>
      <p class="text-muted" style="font-size:14px;margin-top:4px">Choose a wallet to play.</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:24px">
        <button class="wallet-opt" data-wallet="MetaMask">${walletMark('#E8821E', 'M')}<span>MetaMask</span><span class="text-subtle" style="margin-left:auto;font-size:12px">Detected</span></button>
        <button class="wallet-opt" data-wallet="WalletConnect">${walletMark('#3B99FC', 'W')}<span>WalletConnect</span></button>
        <button class="wallet-opt" data-wallet="Coinbase Wallet">${walletMark('#0052FF', 'C')}<span>Coinbase Wallet</span></button>
      </div>
      <p class="text-subtle" style="font-size:12px;margin-top:20px">Connecting is free. We never see your private key.</p>
    </div>
  </div>

  <!-- Deposit -->
  <div class="modal-backdrop" id="modal-deposit">
    <div class="modal" style="position:relative" role="dialog" aria-modal="true" aria-label="Deposit ETH">
      <button class="modal-close" onclick="TD.closeModal('modal-deposit')" aria-label="Close">&times;</button>
      <h2 class="display" style="font-size:24px;font-weight:600">Deposit ETH</h2>
      <p class="text-muted" style="font-size:14px;margin-top:4px">Your balance funds bets. Withdraw any time.</p>
      <div class="field-wrap" style="margin-top:24px">
        <input class="field has-suffix" id="deposit-input" inputmode="decimal" value="0.0100" aria-label="Deposit amount">
        <span class="field-suffix">ETH</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-secondary btn-sm mono preset" data-target="deposit-input" data-amt="0.01" style="flex:1">0.01</button>
        <button class="btn btn-secondary btn-sm mono preset" data-target="deposit-input" data-amt="0.05" style="flex:1">0.05</button>
        <button class="btn btn-secondary btn-sm mono preset" data-target="deposit-input" data-amt="0.1" style="flex:1">0.1</button>
        <button class="btn btn-secondary btn-sm mono preset" data-target="deposit-input" data-amt="max" data-maxval="1" style="flex:1">Max</button>
      </div>
      <button class="btn btn-primary btn-block mono" id="deposit-cta" style="height:56px;margin-top:24px;font-family:var(--font-sans)">DEPOSIT 0.0100 ETH</button>
      <p class="text-subtle" style="font-size:12px;margin-top:16px">Need Sepolia ETH? Get some at <a class="escan" href="#" onclick="return false" style="color:var(--color-primary)"><span class="escan-label">sepoliafaucet.com</span> ↗</a></p>
    </div>
  </div>

  <!-- Withdraw -->
  <div class="modal-backdrop" id="modal-withdraw">
    <div class="modal" style="position:relative" role="dialog" aria-modal="true" aria-label="Withdraw ETH">
      <button class="modal-close" onclick="TD.closeModal('modal-withdraw')" aria-label="Close">&times;</button>
      <h2 class="display" style="font-size:24px;font-weight:600">Withdraw ETH</h2>
      <p class="text-muted" style="font-size:14px;margin-top:4px">Available · <span class="mono text-foreground" id="withdraw-avail" style="color:var(--color-foreground)">0.0500 ETH</span></p>
      <div class="field-wrap" style="margin-top:24px">
        <input class="field has-suffix" id="withdraw-input" inputmode="decimal" value="0.0100" aria-label="Withdraw amount">
        <span class="field-suffix">ETH</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-secondary btn-sm mono preset" data-target="withdraw-input" data-amt="0.01" style="flex:1">0.01</button>
        <button class="btn btn-secondary btn-sm mono preset" data-target="withdraw-input" data-amt="0.05" style="flex:1">0.05</button>
        <button class="btn btn-secondary btn-sm mono preset" data-target="withdraw-input" data-amt="0.1" style="flex:1">0.1</button>
        <button class="btn btn-secondary btn-sm mono preset" data-target="withdraw-input" data-amt="max" style="flex:1">Max</button>
      </div>
      <button class="btn btn-primary btn-block mono" id="withdraw-cta" style="height:56px;margin-top:24px;font-family:var(--font-sans)">WITHDRAW 0.0100 ETH</button>
      <p class="text-subtle" style="font-size:12px;margin-top:16px">Funds return to your connected wallet in one transaction.</p>
    </div>
  </div>`;

  const style = `
  <style>
    .wallet-opt {
      display:flex; align-items:center; gap:14px;
      width:100%; padding:14px 16px; border-radius:var(--radius-md);
      background:var(--color-surface-overlay);
      box-shadow: inset 0 0 0 1px var(--color-border);
      font-size:16px; font-weight:500; color:var(--color-foreground);
      transition: box-shadow 150ms ease-out, background 150ms ease-out;
    }
    .wallet-opt:hover { box-shadow: inset 0 0 0 1px var(--color-border-gold); background:#2f2922; }
  </style>`;

  function injectAndWire() {
    document.body.insertAdjacentHTML('beforeend', style + html);

    /* Connect wallet options */
    document.querySelectorAll('.wallet-opt').forEach((b) => {
      b.addEventListener('click', () => {
        TD.set({ connected: true });
        TD.closeModal('modal-connect');
        TD.toast('Wallet connected · <span class="mono">' + TD.shortAddr(TD.state.address) + '</span>', { dot: 'gold' });
      });
    });

    /* Presets */
    document.querySelectorAll('.preset').forEach((b) => {
      b.addEventListener('click', () => {
        const input = document.getElementById(b.getAttribute('data-target'));
        let amt = b.getAttribute('data-amt');
        if (amt === 'max') {
          amt = b.id && b.getAttribute('data-maxval') ? b.getAttribute('data-maxval')
              : (b.getAttribute('data-target') === 'withdraw-input' ? TD.state.balance : 1);
        }
        input.value = Number(amt).toFixed(4);
        input.dispatchEvent(new Event('input'));
      });
    });

    /* Live CTA labels */
    const wire = (inputId, ctaId, verb) => {
      const input = document.getElementById(inputId);
      const cta = document.getElementById(ctaId);
      const upd = () => {
        const v = parseFloat(input.value) || 0;
        cta.textContent = `${verb} ${v.toFixed(4)} ETH`;
      };
      input.addEventListener('input', upd);
      return { input, cta, upd };
    };
    const dep = wire('deposit-input', 'deposit-cta', 'DEPOSIT');
    const wd = wire('withdraw-input', 'withdraw-cta', 'WITHDRAW');

    dep.cta.addEventListener('click', () => {
      const v = parseFloat(dep.input.value) || 0;
      if (v <= 0) return;
      TD.set({ balance: +(TD.state.balance + v).toFixed(6) });
      TD.closeModal('modal-deposit');
      TD.toast('Deposited <span class="mono text-gold">' + v.toFixed(4) + ' ETH</span>', { dot: 'gold' });
    });
    wd.cta.addEventListener('click', () => {
      const v = parseFloat(wd.input.value) || 0;
      if (v <= 0 || v > TD.state.balance) {
        TD.toast('Amount exceeds available balance.', { dot: 'crimson' }); return;
      }
      TD.set({ balance: +(TD.state.balance - v).toFixed(6) });
      TD.closeModal('modal-withdraw');
      TD.toast('Withdrew <span class="mono">' + v.toFixed(4) + ' ETH</span>', { dot: 'silver' });
    });

    /* Keep withdraw available in sync when opening */
    window.addEventListener('td:state', () => {
      const avail = document.getElementById('withdraw-avail');
      if (avail) avail.textContent = TD.fmtEth(TD.state.balance) + ' ETH';
    });
    const avail = document.getElementById('withdraw-avail');
    if (avail) avail.textContent = TD.fmtEth(TD.state.balance) + ' ETH';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectAndWire);
  else injectAndWire();
})();
