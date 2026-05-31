/* =========================================================================
   CasinoSpinner — transparent square Canvas animation for "bet in progress"
   Theme: gold dice + gold coins + palm fronds (crypto-casino / golden-palm).
   -------------------------------------------------------------------------
   Two render styles from ONE scene:
     style: 'illustrated'  -> painterly glossy gold
     style: 'pixel'        -> 16-bit pixel-art (low-res render + palette snap)

   Usage:
     const s = new CasinoSpinner(canvas, { style:'illustrated', colors:{...} });
     s.start();    // bet placed -> spin up
     s.stop();     // result in -> ease down to gentle idle
     s.setStyle('pixel'); s.setColors({...}); s.destroy();

   Background is always transparent. Square & resizable (follows the CSS box
   and devicePixelRatio every frame).
   ========================================================================= */
(function (global) {
  'use strict';

  const DEFAULT_COLORS = {
    dieLight: '#FBE07A',  dieMid: '#E3A92A',  dieDark: '#8F5E12',  pip: '#3A2206',
    coinLight: '#FFE98C', coinMid: '#E8B22E', coinDark: '#9C6B12', coinRim: '#7A4F0E',
    leaf: '#7BC62E', leafMid: '#4E9E22', leafDark: '#256A18',
    glow: '#FFB733', accent: '#F2C14E'
  };

  // 16-bit-ish quantization palette (gold ramp + greens + browns + ink/white)
  const PIXEL_PALETTE = [
    '#FFF3C0', '#FBE07A', '#F4CF55', '#E8B22E', '#CE901C', '#A87214', '#7A4F0E',
    '#3A2206', '#5A3410',
    '#B7EA5A', '#7BC62E', '#4E9E22', '#2C7A1C', '#175519',
    '#FFFFFF', '#120C04'
  ].map(hexToRgb);

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  function hexToRgb(c) {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }

  /* ---- 3D helpers ----------------------------------------------------- */
  function rot(v, ax, ay, az) {
    let [x, y, z] = v;
    let cy = Math.cos(ax), sy = Math.sin(ax);
    let y1 = y * cy - z * sy, z1 = y * sy + z * cy; y = y1; z = z1;
    let cx = Math.cos(ay), sx = Math.sin(ay);
    let x1 = x * cx + z * sx, z2 = -x * sx + z * cx; x = x1; z = z2;
    let cz = Math.cos(az), sz = Math.sin(az);
    let x2 = x * cz - y * sz, y2 = x * sz + y * cz; x = x2; y = y2;
    return [x, y, z];
  }

  const FACES = [
    { c: [0, 0, 1],  u: [1, 0, 0],  v: [0, 1, 0],  pips: 1 },
    { c: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0],  pips: 6 },
    { c: [1, 0, 0],  u: [0, 0, -1], v: [0, 1, 0],  pips: 3 },
    { c: [-1, 0, 0], u: [0, 0, 1],  v: [0, 1, 0],  pips: 4 },
    { c: [0, 1, 0],  u: [1, 0, 0],  v: [0, 0, -1], pips: 5 },
    { c: [0, -1, 0], u: [1, 0, 0],  v: [0, 0, 1],  pips: 2 }
  ];
  const PIP_LAYOUT = {
    1: [[0, 0]],
    2: [[-0.5, -0.5], [0.5, 0.5]],
    3: [[-0.58, -0.58], [0, 0], [0.58, 0.58]],
    4: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]],
    5: [[-0.58, -0.58], [0.58, -0.58], [0, 0], [-0.58, 0.58], [0.58, 0.58]],
    6: [[-0.55, -0.6], [-0.55, 0], [-0.55, 0.6], [0.55, -0.6], [0.55, 0], [0.55, 0.6]]
  };

  /* ===================================================================== */
  class CasinoSpinner {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.style = opts.style || 'illustrated';
      this.colors = Object.assign({}, DEFAULT_COLORS, opts.colors || {});
      this.baseSpeed = opts.speed != null ? opts.speed : 1;
      this.pixelRes = opts.pixelRes || 96;

      this.running = false;
      this.spin = 0; this.t = 0;
      this.ax = 0.5; this.ay = 0.4; this.az = 0;
      this.last = 0; this.raf = null;

      // offscreen buffer for pixel mode
      this.buf = document.createElement('canvas');
      this.bctx = this.buf.getContext('2d');

      this._loop = this._loop.bind(this);
      if (opts.autoplay) this.start();
      this._loop(performance.now()); // paint one frame immediately (never blank)
    }

    setColors(c) { this.colors = Object.assign({}, this.colors, c); }
    setStyle(s) { this.style = s; }
    start() { this.running = true; }
    stop() { this.running = false; }
    toggle() { this.running = !this.running; return this.running; }
    destroy() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; }

    _size() {
      const dpr = Math.min(global.devicePixelRatio || 1, 2.5);
      const r = this.canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
        this.canvas.width = w * dpr; this.canvas.height = h * dpr;
      }
      this.dpr = dpr; this.cssW = w; this.cssH = h;
    }

    _loop(now) {
      this.raf = requestAnimationFrame(this._loop);
      const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016);
      this.last = now;
      this.t += dt;

      const target = this.running ? 1 : 0;
      this.spin += (target - this.spin) * (this.running ? 4 : 2.2) * dt;
      this.spin = clamp(this.spin, 0, 1);
      const idle = 0.12;
      const energy = idle + (1 - idle) * this.spin;

      this._size();
      const { ctx, dpr, cssW, cssH } = this;

      // advance rotations once per frame
      const sp = this.baseSpeed * energy;
      this.ax += dt * (0.8 + 2.0 * sp);
      this.ay += dt * (1.2 + 3.2 * sp);
      this.az += dt * (0.15 + 0.5 * sp);

      if (this.style === 'pixel') {
        const N = this.pixelRes;
        if (this.buf.width !== N) { this.buf.width = N; this.buf.height = N; }
        const b = this.bctx;
        b.setTransform(1, 0, 0, 1, 0, 0);
        b.clearRect(0, 0, N, N);
        b.imageSmoothingEnabled = false;
        this._scene(b, N, N, energy);
        this._quantize(b, N, N);
        // blit to main, nearest-neighbour, centred square
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.imageSmoothingEnabled = false;
        const S = Math.min(cssW, cssH);
        ctx.drawImage(this.buf, (cssW - S) / 2, (cssH - S) / 2, S, S);
      } else {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.imageSmoothingEnabled = true;
        this._scene(ctx, cssW, cssH, energy);
      }
    }

    /* ---- the shared scene (drawn in logical px) ----------------------- */
    _scene(ctx, W, H, energy) {
      const C = this.colors;
      const S = Math.min(W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2);

      // warm ambient glow
      const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.52);
      gg.addColorStop(0, this._rgba(C.glow, 0.22 * energy));
      gg.addColorStop(1, this._rgba(C.glow, 0));
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(0, 0, S * 0.52, 0, TAU); ctx.fill();

      // palm fronds behind (gentle sway), framing from the corners
      const sway = Math.sin(this.t * 1.2) * 0.06 + energy * Math.sin(this.t * 4) * 0.03;
      this._frond(ctx, -S * 0.46, S * 0.40, S * 0.54, -0.95 + sway, C);
      this._frond(ctx,  S * 0.46, S * 0.40, S * 0.54, -2.19 - sway, C);
      this._frond(ctx, -S * 0.40, S * 0.10, S * 0.44, -0.45 + sway * 0.7, C);
      this._frond(ctx,  S * 0.40, S * 0.10, S * 0.44, -2.69 - sway * 0.7, C);

      // orbiting coins (behind / front split by depth)
      const dieR = S * 0.20;
      const items = [];
      const n = 3, rx = S * 0.36, ry = S * 0.16;
      for (let i = 0; i < n; i++) {
        const a = this.t * (0.5 + 1.4 * this.baseSpeed * energy) + (i / n) * TAU;
        items.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry, z: Math.sin(a), tilt: Math.cos(a) });
      }
      items.sort((p, q) => p.z - q.z);
      for (const it of items) if (it.z <= 0) this._coin(ctx, it.x, it.y, dieR * 0.4 * (0.72 + 0.28 * (it.z + 1)), it.tilt, C);

      this._die(ctx, S, dieR, energy);

      for (const it of items) if (it.z > 0) this._coin(ctx, it.x, it.y, dieR * 0.4 * (0.72 + 0.28 * (it.z + 1)), it.tilt, C);

      ctx.restore();
    }

    /* ---- 3D gold die -------------------------------------------------- */
    _die(ctx, S, dieR, energy) {
      const C = this.colors;
      const f = 4.2;
      const light = [-0.4, -0.7, 0.9]; const lm = Math.hypot(...light); for (let i = 0; i < 3; i++) light[i] /= lm;

      const projected = FACES.map((face) => {
        const center = rot(face.c, this.ax, this.ay, this.az);
        const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([su, sv]) => {
          const p = [
            face.c[0] + su * face.u[0] + sv * face.v[0],
            face.c[1] + su * face.u[1] + sv * face.v[1],
            face.c[2] + su * face.u[2] + sv * face.v[2]
          ];
          const rp = rot(p, this.ax, this.ay, this.az);
          const s = f / (f - rp[2]);
          return { x: rp[0] * dieR * s, y: rp[1] * dieR * s };
        });
        return { face, normal: center, corners, z: center[2] };
      });
      projected.sort((a, b) => a.z - b.z);

      for (const pf of projected) {
        if (pf.normal[2] <= 0.02) continue;
        const facing = pf.normal[2];
        const shade = clamp(0.4 + 0.6 * Math.max(0, pf.normal[0] * light[0] + pf.normal[1] * light[1] + pf.normal[2] * light[2]), 0, 1);
        const c0 = pf.corners;
        const grd = ctx.createLinearGradient(c0[0].x, c0[0].y, c0[2].x, c0[2].y);
        grd.addColorStop(0, this._mix(C.dieLight, '#ffffff', 0.18 * shade));
        grd.addColorStop(0.55, C.dieMid);
        grd.addColorStop(1, this._mix(C.dieDark, '#000000', (1 - shade) * 0.4));
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.moveTo(c0[0].x, c0[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(c0[i].x, c0[i].y);
        ctx.closePath();
        ctx.save();
        ctx.shadowColor = this._rgba(C.glow, 0.5 * energy); ctx.shadowBlur = 16 * energy * facing;
        ctx.fill(); ctx.restore();
        ctx.lineJoin = 'round'; ctx.strokeStyle = this._rgba(C.dieDark, 0.6);
        ctx.lineWidth = Math.max(1, dieR * 0.035); ctx.stroke();

        const pipR = dieR * 0.15 * (0.72 + 0.28 * facing);
        for (const [pu, pv] of PIP_LAYOUT[pf.face.pips]) {
          const p3 = [
            pf.face.c[0] + pu * pf.face.u[0] + pv * pf.face.v[0],
            pf.face.c[1] + pu * pf.face.u[1] + pv * pf.face.v[1],
            pf.face.c[2] + pu * pf.face.u[2] + pv * pf.face.v[2]
          ];
          const rp = rot(p3, this.ax, this.ay, this.az);
          const s = f / (f - rp[2]);
          ctx.fillStyle = this._rgba(C.pip, 0.92);
          ctx.beginPath(); ctx.arc(rp[0] * dieR * s, rp[1] * dieR * s, pipR, 0, TAU); ctx.fill();
        }
      }
    }

    /* ---- gold coin ---------------------------------------------------- */
    _coin(ctx, x, y, r, tilt, C) {
      ctx.save();
      ctx.translate(x, y);
      const sx = clamp(0.55 + 0.45 * Math.abs(tilt), 0.3, 1); // foreshorten by orbit angle
      ctx.shadowColor = C.glow; ctx.shadowBlur = r * 0.5;
      // thickness
      ctx.fillStyle = C.coinDark;
      ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * sx, r, 0, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      // face
      const g = ctx.createLinearGradient(-r, -r, r, r);
      g.addColorStop(0, C.coinLight); g.addColorStop(0.5, C.coinMid); g.addColorStop(1, C.coinDark);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, r * sx, r, 0, 0, TAU); ctx.fill();
      // rim
      ctx.strokeStyle = C.coinRim; ctx.lineWidth = r * 0.12;
      ctx.beginPath(); ctx.ellipse(0, 0, r * sx * 0.86, r * 0.86, 0, 0, TAU); ctx.stroke();
      // embossed diamond (coin motif)
      ctx.fillStyle = this._rgba(C.coinRim, 0.85);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.42); ctx.lineTo(r * sx * 0.3, 0); ctx.lineTo(0, r * 0.42); ctx.lineTo(-r * sx * 0.3, 0);
      ctx.closePath(); ctx.fill();
      // highlight
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.ellipse(-r * sx * 0.32, -r * 0.34, r * sx * 0.22, r * 0.16, -0.5, 0, TAU); ctx.fill();
      ctx.restore();
    }

    /* ---- palm frond (lush, filled leaflets) --------------------------- */
    _frond(ctx, x, y, len, ang, C) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const g = ctx.createLinearGradient(0, 0, len, -len * 0.1);
      g.addColorStop(0, C.leafDark); g.addColorStop(0.5, C.leafMid); g.addColorStop(1, C.leaf);
      ctx.fillStyle = g; ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // curved rib (arcs upward)
      const ribY = (t) => -len * 0.22 * Math.sin(Math.PI * t * 0.85);
      const ribX = (t) => len * t;

      // leaflets as filled tapered blades on both sides
      const blades = 14;
      for (let i = 1; i <= blades; i++) {
        const t = i / (blades + 1);
        const bx = ribX(t), by = ribY(t);
        const grow = Math.sin(Math.PI * t);                 // longest mid-frond
        const bl = len * (0.30 * grow + 0.05);
        const w = len * 0.05 * grow + len * 0.012;
        const fan = -0.55 + t * 0.35;                       // blades sweep toward tip
        for (const side of [-1, 1]) {
          const dirX = Math.cos(fan) * 0.45, dirY = side * Math.sin(1.1) - Math.cos(fan) * 0.15;
          const tipX = bx + dirX * bl, tipY = by + (side * 0.95 - 0.18) * bl;
          ctx.beginPath();
          ctx.moveTo(bx, by - w);
          ctx.quadraticCurveTo(bx + bl * 0.4, by + side * bl * 0.3, tipX, tipY);
          ctx.quadraticCurveTo(bx + bl * 0.35, by + side * bl * 0.35, bx, by + w);
          ctx.closePath();
          ctx.fill();
        }
      }
      // rib on top
      ctx.lineWidth = Math.max(2, len * 0.022);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let t = 0.05; t <= 1.001; t += 0.1) ctx.lineTo(ribX(t), ribY(t));
      ctx.stroke();
      ctx.restore();
    }

    /* ---- pixel quantization ------------------------------------------- */
    _quantize(ctx, W, H) {
      const img = ctx.getImageData(0, 0, W, H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 90) { d[i + 3] = 0; continue; } // crisp transparent edges
        d[i + 3] = 255;
        let best = 0, bd = 1e9;
        for (let p = 0; p < PIXEL_PALETTE.length; p++) {
          const pc = PIXEL_PALETTE[p];
          const dr = d[i] - pc[0], dg = d[i + 1] - pc[1], db = d[i + 2] - pc[2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bd) { bd = dist; best = p; }
        }
        const pc = PIXEL_PALETTE[best];
        d[i] = pc[0]; d[i + 1] = pc[1]; d[i + 2] = pc[2];
      }
      ctx.putImageData(img, 0, 0);
    }

    /* ---- color utils -------------------------------------------------- */
    _rgba(c, a) { if (c[0] === '#') { const [r, g, b] = hexToRgb(c); return `rgba(${r},${g},${b},${a})`; } return c; }
    _mix(c1, c2, t) {
      const a = hexToRgb(c1), b = hexToRgb(c2);
      return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
    }
  }

  global.CasinoSpinner = CasinoSpinner;
})(window);
