/* ============================================================
   TRUE DICE — Dice game logic
   ============================================================ */
(function () {
  'use strict';

  const HOUSE_EDGE = 0.01;          // 1%
  const MAX_PAYOUT = 2.0;           // 1% of a 200 ETH bankroll cap
  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- canvas-confetti (lazy) ---------- */
  let confetti = null;
  (function loadConfetti() {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
    s.onload = () => { confetti = window.confetti; };
    document.head.appendChild(s);
  })();

  /* ---------- derived bet math ---------- */
  function chanceToMult(ch) { return (100 * (1 - HOUSE_EDGE)) / ch; } // 99 / ch
  function chanceToUnder(ch) { return Math.round(ch * 100); }
  function maxBetByBankroll(mult) { return MAX_PAYOUT / mult; }

  /* ---------- state refs ---------- */
  const chance = $('chance');
  const betInput = $('bet');
  const rollBtn = $('rollBtn');
  let rolling = false;

  /* ============================================================
     TOP BAR
     ============================================================ */
  function renderTopbar() {
    const s = TD.state;
    const mount = $('topbar-right');
    if (!s.connected) {
      mount.innerHTML =
        '<span class="net-badge"><span class="dot dot-silver"></span>Sepolia</span>' +
        '<button class="btn btn-primary btn-md" id="connectBtn">Connect Wallet</button>';
      $('connectBtn').onclick = () => TD.openModal('modal-connect');
    } else {
      mount.innerHTML =
        '<span class="net-badge"><span class="dot dot-silver"></span>Sepolia</span>' +
        '<div class="menu-wrap" id="balMenu">' +
          '<button class="menu-trigger" data-menu="balMenu"><span class="text-muted" style="color:var(--color-foreground-muted)">Balance ·</span> <span class="mono">' + TD.fmtEth(s.balance) + ' ETH</span> <span class="caret">▼</span></button>' +
          '<div class="menu">' +
            '<button onclick="TD.openModal(\'modal-deposit\')">Deposit</button>' +
            '<button onclick="TD.openModal(\'modal-withdraw\')">Withdraw</button>' +
          '</div>' +
        '</div>' +
        '<div class="menu-wrap" id="addrMenu">' +
          '<button class="menu-trigger" data-menu="addrMenu"><span data-jz="' + s.address + '"></span> <span class="mono">' + TD.shortAddr(s.address) + '</span> <span class="caret">▼</span></button>' +
          '<div class="menu">' +
            '<button id="copyAddr">Copy address</button>' +
            '<button id="disconnect">Disconnect</button>' +
          '</div>' +
        '</div>';
      mount.querySelectorAll('[data-jz]').forEach((el) => el.prepend(TD.jazzicon(el.getAttribute('data-jz'), 18)));
      $('copyAddr').onclick = () => { TD.copy(s.address, 'Address copied'); closeMenus(); };
      $('disconnect').onclick = () => { TD.set({ connected: false }); TD.toast('Wallet disconnected.', { dot: 'silver' }); closeMenus(); };
    }
    wireMenus();
  }

  function closeMenus() { document.querySelectorAll('.menu-wrap.open').forEach((m) => m.classList.remove('open')); }
  function wireMenus() {
    document.querySelectorAll('[data-menu]').forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const wrap = document.getElementById(b.getAttribute('data-menu'));
        const wasOpen = wrap.classList.contains('open');
        closeMenus();
        if (!wasOpen) wrap.classList.add('open');
      };
    });
  }
  document.addEventListener('click', closeMenus);

  /* ============================================================
     FORM
     ============================================================ */
  function syncChance() {
    const ch = parseFloat(chance.value);
    const mult = chanceToMult(ch);
    const under = chanceToUnder(ch);
    $('chanceVal').textContent = ch.toFixed(2) + ' %';
    $('multVal').textContent = mult.toFixed(4) + ' ×';
    $('underVal').textContent = under;
    $('rUnder').textContent = under;
    updateTrack(under);
    paintSlider();
    validate();
  }

  /* ---------- Result track ---------- */
  const trackEl = $('track');
  const trackWin = $('trackWin');
  const trackThreshold = $('trackThreshold');
  const trackMarker = $('trackMarker');
  function updateTrack(under) {
    const pct = (under / 10000) * 100;
    trackWin.style.width = pct + '%';
    trackThreshold.style.left = pct + '%';
    trackThreshold.setAttribute('data-val', under);
  }
  function paintSlider() {
    const pct = ((parseFloat(chance.value) - 2) / (98 - 2)) * 100;
    chance.style.background =
      'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary) ' + pct + '%, var(--color-border-subtle) ' + pct + '%, var(--color-border-subtle) 100%)';
  }

  function currentMaxBet() {
    const mult = chanceToMult(parseFloat(chance.value));
    return Math.min(TD.state.balance, maxBetByBankroll(mult));
  }

  function validate() {
    const s = TD.state;
    const bet = parseFloat(betInput.value);
    const mult = chanceToMult(parseFloat(chance.value));
    const help = $('ctaHelp');
    let ok = true, msg = '';

    if (!s.connected) { ok = false; }
    else if (isNaN(bet) || bet <= 0) { ok = false; }
    else if (bet > s.balance + 1e-9) { ok = false; msg = 'Insufficient balance. Deposit more to bet this much.'; }
    else if (bet > maxBetByBankroll(mult) + 1e-9) { ok = false; msg = 'Bet exceeds 1% of casino bankroll. Reduce bet or wait for next roll.'; }

    /* profit */
    const profit = $('profitVal');
    if (!isNaN(bet) && bet > 0) {
      const p = bet * (mult - 1);
      profit.textContent = '+' + p.toFixed(4) + ' ETH';
      profit.classList.add('text-gold'); profit.classList.remove('text-subtle');
    } else {
      profit.textContent = '—';
      profit.classList.remove('text-gold'); profit.classList.add('text-subtle');
    }

    help.textContent = msg;
    if (!rolling) {
      rollBtn.disabled = !ok;
      rollBtn.textContent = 'ROLL DICE';
    }
    return ok;
  }

  function applyConnState() {
    const s = TD.state;
    $('formCard').classList.toggle('locked', !s.connected);
    $('balLabel').textContent = TD.fmtEth(s.balance) + ' ETH';
    validate();
  }

  /* quick bet buttons */
  document.querySelectorAll('[data-bet]').forEach((b) => {
    b.onclick = () => {
      let v = parseFloat(betInput.value) || 0;
      const kind = b.getAttribute('data-bet');
      if (kind === 'half') v = v / 2;
      else if (kind === 'double') v = v * 2;
      else if (kind === 'max') v = currentMaxBet();
      v = Math.max(0, v);
      betInput.value = v.toFixed(4);
      validate();
    };
  });

  chance.addEventListener('input', syncChance);
  betInput.addEventListener('input', validate);
  betInput.addEventListener('blur', () => {
    const v = parseFloat(betInput.value);
    if (!isNaN(v)) betInput.value = Math.max(0, v).toFixed(4);
  });

  /* ============================================================
     DICE NUMBER + ROLL FLOW
     ============================================================ */
  const numEl = $('diceNumber');
  const pill = $('phasePill');
  const card = $('canvas');
  const readout = $('readout');
  let shimmerTimer = null;

  function setPhase(dotColor, text, pulse) {
    pill.innerHTML = '<span class="dot' + (pulse ? ' dot-pulse' : '') + '" style="' +
      (dotColor.startsWith('var') || dotColor.startsWith('#') ? 'background:' + dotColor : '') + '"></span>' + text;
  }
  function setPhaseClass(cls, dotClass, text, pulse) {
    pill.innerHTML = '<span class="dot ' + dotClass + (pulse ? ' dot-pulse' : '') + '"></span>' + text;
  }

  function startShimmer() {
    numEl.classList.remove('idle');
    numEl.classList.add('gold-grad', 'shaking');
    /* fade the digits in from nothing */
    numEl.style.opacity = '0';
    requestAnimationFrame(() => { numEl.style.opacity = '1'; });
    if (reduceMotion) { numEl.textContent = '????'; return; }
    let interval = 50;
    const tick = () => {
      const n = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      numEl.textContent = n;
    };
    const loop = () => {
      tick();
      interval = Math.min(250, interval + 4);
      shimmerTimer = setTimeout(loop, interval);
    };
    loop();
  }
  function stopShimmer() { if (shimmerTimer) { clearTimeout(shimmerTimer); shimmerTimer = null; } }

  /* ---------- Odometer digit settle (left → right lock) ---------- */
  function settleDigits(finalStr) {
    return new Promise((resolve) => {
      if (reduceMotion) { numEl.textContent = finalStr; resolve(); return; }
      const lockAt = [140, 320, 520, 740]; // ms each digit locks
      const start = performance.now();
      function frame(now) {
        const t = now - start;
        let out = '';
        let allLocked = true;
        for (let i = 0; i < 4; i++) {
          if (t >= lockAt[i]) out += finalStr[i];
          else { out += Math.floor(Math.random() * 10); allLocked = false; }
        }
        numEl.textContent = out;
        if (allLocked) resolve();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  /* ---------- Count-up (eased) ---------- */
  function countUp(el, to, prefix, suffix, ms) {
    if (reduceMotion) { el.textContent = prefix + to.toFixed(4) + suffix; return; }
    const start = performance.now();
    function f(now) {
      const t = Math.min(1, (now - start) / ms);
      const v = to * (1 - Math.pow(1 - t, 3));
      el.textContent = prefix + v.toFixed(4) + suffix;
      if (t < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }

  /* ---------- Ambient gold embers ---------- */
  const embersCanvas = $('embers');
  let ectx = null, eParticles = [], winBoost = 0, embersReady = false;
  const COLORS = ['#D4AF37', '#E5C76B', '#C9A961'];
  function resizeEmbers() {
    const r = embersCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (embersCanvas.width === w && embersCanvas.height === h) return;
    embersCanvas.width = w;
    embersCanvas.height = h;
  }
  function spawnEmber(n) {
    const w = embersCanvas.width, h = embersCanvas.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (let i = 0; i < n; i++) {
      eParticles.push({
        x: Math.random() * w,
        y: h + Math.random() * 16 * dpr,
        vx: (Math.random() - 0.5) * 0.18 * dpr,
        vy: -(0.18 + Math.random() * 0.55) * dpr,
        r: (0.6 + Math.random() * 1.7) * dpr,
        life: 0, max: 160 + Math.random() * 220,
        col: COLORS[Math.floor(Math.random() * 3)]
      });
    }
  }
  function loopEmbers() {
    if (!embersReady) return;
    requestAnimationFrame(loopEmbers);
    const w = embersCanvas.width, h = embersCanvas.height;
    ectx.clearRect(0, 0, w, h);
    /* ambient spawn (very sparse), heavier during winBoost */
    if (Math.random() < 0.16 + winBoost * 0.8) spawnEmber(1 + Math.floor(winBoost * 4));
    if (winBoost > 0) winBoost = Math.max(0, winBoost - 0.012);
    for (let i = eParticles.length - 1; i >= 0; i--) {
      const p = eParticles[i];
      p.life++; p.x += p.vx; p.y += p.vy; p.vy -= 0.0009 * (Math.min(window.devicePixelRatio || 1, 2));
      if (p.life >= p.max || p.y < -12) { eParticles.splice(i, 1); continue; }
      const a = Math.sin((p.life / p.max) * Math.PI) * (0.30 + winBoost * 0.5);
      ectx.globalAlpha = a;
      ectx.fillStyle = p.col;
      ectx.beginPath(); ectx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ectx.fill();
    }
    ectx.globalAlpha = 1;
  }
  function initEmbers() {
    if (reduceMotion || !embersCanvas) return;
    ectx = embersCanvas.getContext('2d');
    resizeEmbers();
    embersReady = true;
    /* keep the buffer matched to the card's true rendered size at all times */
    if (typeof ResizeObserver !== 'undefined') {
      let rafPending = false;
      const ro = new ResizeObserver(() => {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => { rafPending = false; resizeEmbers(); });
      });
      ro.observe(embersCanvas);
    }
    window.addEventListener('resize', () => { resizeEmbers(); });
    /* re-measure after fonts/layout settle, in case init ran before final layout */
    setTimeout(resizeEmbers, 60);
    setTimeout(resizeEmbers, 400);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resizeEmbers);
    loopEmbers();
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function roll() {
    if (rolling || rollBtn.disabled) return;
    if (!validate()) return;
    rolling = true;

    const bet = parseFloat(betInput.value);
    const ch = parseFloat(chance.value);
    const mult = chanceToMult(ch);
    const under = chanceToUnder(ch);

    card.classList.remove('win', 'loss');
    numEl.classList.remove('idle', 'win', 'snap', 'gold-grad', 'shaking');
    var diceIdle = $('diceIdle'); if (diceIdle) diceIdle.classList.add('hidden');
    numEl.style.opacity = '0';   /* fade out any previous result */
    readout.style.visibility = 'hidden';
    trackMarker.className = 'track-marker';

    /* Phase 1 — confirm in wallet */
    rollBtn.disabled = true;
    rollBtn.textContent = 'CONFIRM IN WALLET';
    setPhaseClass('', '', '');
    pill.innerHTML = '<span class="dot dot-pulse" style="background:var(--color-foreground-muted)"></span>Confirm in wallet…';
    await sleep(950);

    /* Phase 2 — broadcasting */
    rollBtn.textContent = 'BROADCASTING…';
    pill.innerHTML = '<span class="dot dot-pulse" style="background:var(--color-foreground-muted)"></span>Broadcasting transaction…';
    await sleep(1150);

    /* Phase 3 — awaiting VRF */
    rollBtn.textContent = 'AWAITING RANDOMNESS';
    pill.innerHTML = '<span class="dot dot-silver dot-pulse"></span>Awaiting VRF · ≈30s';
    startShimmer();
    trackMarker.className = 'track-marker scanning';
    await sleep(2600);
    stopShimmer();

    /* Settle */
    const result = Math.floor(Math.random() * 10000);
    const won = result < under;
    const requestId = genRequestId();
    const resultStr = result.toString().padStart(4, '0');
    const markerPct = (result / 10000) * 100;

    /* freeze the scanning marker, then glide it to the result and tint win/loss */
    if (!reduceMotion) {
      const frozen = getComputedStyle(trackMarker).left;
      trackMarker.style.left = frozen;
    }
    trackMarker.classList.remove('scanning');
    void trackMarker.offsetWidth;
    trackMarker.classList.add('animate', 'show', won ? 'win' : 'loss');
    requestAnimationFrame(() => { trackMarker.style.left = markerPct + '%'; });

    /* odometer digit settle (left → right), then snap */
    await settleDigits(resultStr);
    numEl.classList.remove('shaking');
    numEl.classList.add('snap');
    setTimeout(() => numEl.classList.remove('snap'), 320);

    $('rResult').textContent = resultStr;
    $('rUnder').textContent = under;
    readout.style.visibility = 'visible';

    const stake = bet;
    if (won) {
      const profit = stake * (mult - 1);
      numEl.classList.add('win');
      card.classList.add('win');
      winBoost = 1;
      pill.innerHTML = '<span class="dot dot-gold"></span>WON +<span id="pillAmt" class="mono">0.0000</span> ETH';
      countUp($('pillAmt'), profit, '', '', 950);
      TD.set({ balance: +(TD.state.balance + profit).toFixed(6) });
      fireConfetti();
      const block = 6238472 + Math.floor(Math.random() * 50);
      TD.toast('Won <span class="mono text-gold">' + profit.toFixed(4) + ' ETH</span> · <span class="mono">Block ' + block + '</span> <a class="escan" href="proof.html?id=' + requestId + '">↗</a>', { dot: 'gold' });
      setTimeout(() => card.classList.remove('win'), 1800);
    } else {
      numEl.classList.remove('gold-grad');
      pill.innerHTML = '<span class="dot dot-crimson"></span>LOST -' + stake.toFixed(4) + ' ETH';
      TD.set({ balance: +(Math.max(0, TD.state.balance - stake)).toFixed(6) });
      if (!reduceMotion) { card.classList.add('loss'); setTimeout(() => card.classList.remove('loss'), 2000); }
      TD.toast('Better luck next roll. <span class="text-subtle">House edge: 1.00%</span>', { dot: 'crimson' });
    }

    /* record bet */
    recordBet({
      time: Date.now(), player: TD.state.address, chance: ch, roll: result,
      under: under, stake: stake, won: won, payout: won ? stake * mult : 0,
      mult: mult, requestId: requestId
    });

    await sleep(2400);
    /* return to idle */
    rolling = false;
    numEl.classList.remove('win', 'shaking');
    pill.innerHTML = '<span class="dot" style="background:var(--color-foreground-subtle)"></span>Idle — Ready to roll';
    rollBtn.textContent = 'ROLL DICE';
    validate();
  }

  function fireConfetti() {
    if (reduceMotion || !confetti) return;
    const rect = card.getBoundingClientRect();
    confetti({
      particleCount: 30, scalar: 0.8, gravity: 1.2, spread: 55, startVelocity: 28,
      ticks: 120, colors: ['#D4AF37', '#E5C76B', '#C9A961'],
      origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: rect.top / window.innerHeight }
    });
  }

  rollBtn.addEventListener('click', roll);

  function genRequestId() {
    let s = '';
    for (let i = 0; i < 21; i++) s += Math.floor(Math.random() * 10);
    return s;
  }

  /* ============================================================
     TABS + DATA
     ============================================================ */
  const PLAYERS = ['0x4c1...9b8','0xe92...0aa','0x18d...77c','0xbb0...341','0x9f2...e5d','0x3aa...c10','0x6d4...8f2','0x7a3...d2f'];
  function seedRows(n, big) {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const ch = [49.5, 25, 75, 33.33, 90, 10, 60][i % 7];
      const under = chanceToUnder(ch);
      const mult = chanceToMult(ch);
      const won = Math.random() < ch / 100;
      const roll = won ? Math.floor(Math.random() * under) : under + Math.floor(Math.random() * (10000 - under));
      const stake = big ? (Math.random() * 3 + 0.5) : (Math.random() * 0.02 + 0.001);
      rows.push({
        time: Date.now() - (i + 1) * 1000 * 60 * (big ? 13 : 2),
        player: PLAYERS[i % PLAYERS.length], chance: ch, roll: roll, under: under,
        stake: stake, won: won, payout: won ? stake * mult : 0, mult: mult, requestId: genRequestId()
      });
    }
    return rows;
  }
  const data = { mine: [], live: seedRows(8, false), high: seedRows(6, true).sort((a, b) => b.payout - a.payout) };

  function relTime(t) {
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return s + 's ago';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    return h + 'h ago';
  }

  function recordBet(b) {
    data.mine.unshift(b);
    data.live.unshift(b);
    if (data.live.length > 14) data.live.pop();
    if (currentTab === 'mine' || currentTab === 'live') renderTab();
    renderTopbar(); applyConnState();
  }

  let currentTab = 'mine';
  function renderTab() {
    const body = $('tabBody');
    const rows = data[currentTab];
    const showPlayer = currentTab !== 'mine';

    if (!rows.length) {
      const msg = currentTab === 'mine'
        ? 'Your bets will appear here. <span class="mono">The chain</span> remembers everything.'
        : 'No bets yet. Be the first to roll.';
      body.innerHTML = '<div class="tab-empty"><div class="ico">◇</div>' + msg + '</div>';
      return;
    }

    let html = '<div style="overflow-x:auto"><table class="dtable"><thead><tr>' +
      '<th>Time</th>' +
      (showPlayer ? '<th>Player</th>' : '') +
      '<th class="num">Chance</th><th class="num">Roll</th><th class="num">Stake</th><th class="num">Payout</th><th class="num">Verify</th>' +
      '</tr></thead><tbody>';

    rows.forEach((r) => {
      html += '<tr>' +
        '<td class="text-muted">' + relTime(r.time) + '</td>' +
        (showPlayer ? '<td><span class="addr" data-jz="' + r.player + '"><span class="addr-text mono">' + r.player + '</span></span></td>' : '') +
        '<td class="num mono">' + r.chance.toFixed(2) + '%</td>' +
        '<td class="num mono">' + r.roll.toString().padStart(4, '0') + ' <span class="' + (r.won ? 'mark-win' : 'mark-loss') + '">' + (r.won ? '✓' : '✗') + '</span></td>' +
        '<td class="num mono">' + r.stake.toFixed(4) + '</td>' +
        '<td class="num mono ' + (r.won ? 'text-gold' : 'text-subtle') + '">' + (r.won ? '+' + (r.payout - r.stake).toFixed(4) : '—') + '</td>' +
        '<td class="num"><a class="verify-btn" href="proof.html?id=' + r.requestId + '" title="Verify on-chain">↗</a></td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    body.innerHTML = html;
    body.querySelectorAll('[data-jz]').forEach((el) => el.prepend(TD.jazzicon(el.getAttribute('data-jz'), 16)));
  }

  document.querySelectorAll('.tab').forEach((t) => {
    t.onclick = () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      currentTab = t.getAttribute('data-tab');
      renderTab();
    };
  });

  /* ============================================================
     INIT
     ============================================================ */
  window.addEventListener('td:state', () => { renderTopbar(); applyConnState(); });

  function init() {
    renderTopbar();
    syncChance();
    applyConnState();
    renderTab();
    trackEl.classList.add('show');
    initEmbers();
    /* connected but empty balance → prompt deposit */
    if (TD.state.connected && TD.state.balance <= 0) {
      setTimeout(() => TD.openModal('modal-deposit'), 400);
    }
  }
  init();
})();
