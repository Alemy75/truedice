/* ============================================================
   TRUE DICE — Shared behavior
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Wallet state (persisted across pages) ---------- */
  const DEFAULT_STATE = { connected: false, address: '0x7a3F19c4D6b821E0aA45c9F2b3E84D7c1f90d2f', balance: 0.05 };
  const TD = {
    get state() {
      try { return Object.assign({}, DEFAULT_STATE, JSON.parse(localStorage.getItem('td_state') || '{}')); }
      catch (e) { return Object.assign({}, DEFAULT_STATE); }
    },
    set(patch) {
      const next = Object.assign(this.state, patch);
      localStorage.setItem('td_state', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('td:state', { detail: next }));
      return next;
    }
  };
  window.TD = TD;

  /* ---------- Helpers ---------- */
  TD.shortAddr = (a) => a.slice(0, 5) + '...' + a.slice(-3);
  TD.fmtEth = (n, d = 4) => Number(n).toFixed(d);

  /* ---------- Jazzicon (deterministic warm swatch) ---------- */
  TD.jazzicon = function (seedStr, size = 16) {
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
    const golds = ['#D4AF37', '#C9A961', '#B8941F', '#E5C76B', '#8B6F2C', '#A8893B'];
    const c1 = golds[h % golds.length];
    const c2 = golds[(h >> 4) % golds.length];
    const ang = h % 360;
    const el = document.createElement('span');
    el.className = 'jazz';
    el.style.width = el.style.height = size + 'px';
    el.style.background = `conic-gradient(from ${ang}deg, ${c1}, ${c2}, ${c1})`;
    return el;
  };

  /* ---------- Toast ---------- */
  let toastStack;
  TD.toast = function (html, opts = {}) {
    if (!toastStack) {
      toastStack = document.createElement('div');
      toastStack.className = 'toast-stack';
      document.body.appendChild(toastStack);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    const dotCls = opts.dot ? `<span class="dot dot-${opts.dot}" style="margin-right:2px"></span>` : '';
    t.innerHTML = dotCls + `<div style="flex:1">${html}</div>`;
    toastStack.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    const dur = opts.duration || 4200;
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 250);
    }, dur);
    return t;
  };

  /* ---------- Copy to clipboard ---------- */
  TD.copy = function (text, label) {
    const done = () => TD.toast((label || 'Copied') + ' · <span class="mono">' + TD.shortAddr(text) + '</span>', { dot: 'gold', duration: 2400 });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else { done(); }
  };

  /* ---------- Modal control ---------- */
  TD.openModal = function (id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
  };
  TD.closeModal = function (id) {
    const m = id ? document.getElementById(id) : document.querySelector('.modal-backdrop.open');
    if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
  };

  /* ---------- Init on DOM ready ---------- */
  function init() {
    /* Backdrop click + esc to close modals */
    document.querySelectorAll('.modal-backdrop').forEach((bd) => {
      bd.addEventListener('mousedown', (e) => { if (e.target === bd) TD.closeModal(bd.id); });
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') TD.closeModal(); });

    /* Nav blur on scroll */
    const nav = document.querySelector('[data-nav]');
    if (nav) {
      const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* Copy targets */
    document.querySelectorAll('[data-copy]').forEach((el) => {
      el.addEventListener('click', () => TD.copy(el.getAttribute('data-copy'), el.getAttribute('data-copy-label')));
    });

    /* Render jazzicons placed declaratively */
    document.querySelectorAll('[data-jazz]').forEach((el) => {
      const size = parseInt(el.getAttribute('data-jazz-size') || '16', 10);
      el.prepend(TD.jazzicon(el.getAttribute('data-jazz'), size));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
