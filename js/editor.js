// Mario Wall — "Map my wall" editor.
// Drag on empty space = draw a box. Click = select. Drag = move. Handles = resize (boxes) / scale (characters).
// Right palette: drag (or tap) characters & elements onto the wall. Left panel: boxes, skins, wall-fit tools.
(function (g) {
  'use strict';
  const MW = g.MW;
  const { Art, Engine } = MW;
  const { BY_TYPE, ELEMENTS, SKINS, TIPS } = Art;
  const { elRectU, boxU, newId, H } = Engine;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const $ = s => document.querySelector(s);
  const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  class Editor {
    constructor(app) {
      this.app = app; this.stage = app.stage; this.sel = null; this.drag = null; this.hist = []; this.hi = -1;
      this.brush = 'brick'; this.prefs = Object.assign({ grid: false, snap: false, photo: true, photoOpacity: 0.55, glow: true, hud: true }, app.loadPrefs());
      this.tab = 'heroes';
      this.buildPanels();
      this.bindStage();
    }
    get Wu() { return this.stage.view.Wu; }
    // ------------------------------------------------------------ lifecycle
    open(layout) {
      this.layout = layout; this.sel = null; this.hist = []; this.hi = -1; this.autoBoxes = JSON.stringify(layout.boxes); this.commit(true);
      this.refresh(); this.syncPrefs();
    }
    // ------------------------------------------------------------ history
    commit(initial) {
      const snap = JSON.stringify(this.layout);
      if (!initial && this.hist[this.hi] === snap) return;
      this.hist = this.hist.slice(0, this.hi + 1); this.hist.push(snap);
      if (this.hist.length > 100) this.hist.shift();
      this.hi = this.hist.length - 1;
      if (!initial) this.app.saveLayout(this.layout);
      this.updateUndo();
    }
    undo() { if (this.hi > 0) { this.hi--; this.restore(); } }
    redo() { if (this.hi < this.hist.length - 1) { this.hi++; this.restore(); } }
    restore() {
      this.layout = JSON.parse(this.hist[this.hi]); this.app.layout = this.layout;
      if (this.sel && !this.find(this.sel)) this.sel = null;
      this.stage.setPin(this.layout.pin); this.app.saveLayout(this.layout); this.refresh(); this.updateUndo();
    }
    updateUndo() { $('#undo').disabled = this.hi <= 0; $('#redo').disabled = this.hi >= this.hist.length - 1; }
    // ------------------------------------------------------------ model helpers
    find(sel) { if (!sel) return null; const arr = sel.kind === 'box' ? this.layout.boxes : this.layout.els; return arr.find(o => o.id === sel.id) || null; }
    selected() { return this.find(this.sel); }
    refresh() {
      this.app.game.setLayout(this.layout);
      const hasBoxes = this.layout.boxes.length > 0;
      document.body.classList.toggle('has-boxes', hasBoxes);
      this.renderSelbar(); this.renderSkins();
      const s = this.selected();
      $('#bDup').disabled = !s; $('#bDel').disabled = !s || (this.sel.kind === 'el' && s.type === 'mario');
      $('#bClear').disabled = !hasBoxes && this.layout.els.length <= 1;
    }
    changed() { this.refresh(); this.commit(); }
    marioCount() { return this.layout.els.filter(e => e.type === 'mario').length; }
    // ------------------------------------------------------------ actions
    addBox(rect, skin) {
      const Wu = this.Wu, b = { id: newId('b'), x: rect.x / Wu, y: rect.y / H, w: rect.w / Wu, h: rect.h / H, skin: skin || this.brush };
      this.layout.boxes.push(b); this.sel = { kind: 'box', id: b.id }; this.changed(); return b;
    }
    addElement(type, ux, uy) {
      const d = BY_TYPE[type];
      if (type === 'mario' && this.marioCount()) {
        const m = this.layout.els.find(e => e.type === 'mario');
        if (ux != null) { const p = this.magnet(ux, uy); m.x = p.x / this.Wu; m.y = p.y / H; this.guide = null; }
        else this.app.toast('Mario is already on your wall');
        this.sel = { kind: 'el', id: m.id }; this.changed(); return;
      }
      if (ux == null) { const p = this.autoSpot(type); ux = p.x; uy = p.y; }
      const p = this.magnet(ux, uy);
      const el = { id: newId('e'), type, x: clamp(p.x, 2, this.Wu - 2) / this.Wu, y: clamp(p.y, d.h * 0.5, H) / H, s: 1, flip: false };
      this.layout.els.push(el); this.sel = { kind: 'el', id: el.id }; this.guide = null; this.changed();
    }
    autoSpot(type) {
      const Wu = this.Wu, boxes = this.layout.boxes.map(b => boxU(b, Wu)).filter(b => b.skin !== 'lava');
      const d = BY_TYPE[type], air = { boo: 1, bullet: 1, cloud: 1, cheep: 1, qblock: 1, brick: 1, coin: 1 };
      if (boxes.length && !air[type]) {
        const b = boxes[Math.floor(Math.random() * boxes.length)];
        return { x: b.x + 6 + Math.random() * Math.max(1, b.w - 12), y: b.y };
      }
      return { x: Wu * (0.3 + Math.random() * 0.4), y: 60 + Math.random() * 50 + d.h / 2 };
    }
    // snap feet to the top of a box when close
    magnet(ux, uy) {
      const Wu = this.Wu; let best = null, bd = 7;
      for (const b of this.layout.boxes) {
        const r = boxU(b, Wu);
        if (ux >= r.x - 2 && ux <= r.x + r.w + 2 && Math.abs(uy - r.y) < bd) { bd = Math.abs(uy - r.y); best = r; }
      }
      if (this.prefs.snap) ux = Math.round(ux / 4) * 4;
      this.guide = best ? { x: best.x, y: best.y, w: best.w } : null;
      return { x: ux, y: best ? best.y : uy };
    }
    duplicate() {
      const s = this.selected(); if (!s) return;
      if (this.sel.kind === 'el' && s.type === 'mario') { this.app.toast('Only one Mario'); return; }
      const c = Object.assign({}, s, { id: newId(this.sel.kind === 'box' ? 'b' : 'e') });
      c.x = Math.min(c.x + 10 / this.Wu, 0.98);
      if (this.sel.kind === 'box') this.layout.boxes.push(c); else this.layout.els.push(c);
      this.sel = { kind: this.sel.kind, id: c.id }; this.changed();
    }
    remove() {
      const s = this.selected(); if (!s) return;
      if (this.sel.kind === 'el' && s.type === 'mario') { this.app.toast('Mario always stays ⭐'); return; }
      if (this.sel.kind === 'box') this.layout.boxes = this.layout.boxes.filter(o => o.id !== s.id);
      else this.layout.els = this.layout.els.filter(o => o.id !== s.id);
      this.sel = null; this.changed();
    }
    clearAll() {
      const m = this.layout.els.find(e => e.type === 'mario');
      this.layout.auto = false; this.layout.boxes = []; this.layout.els = m ? [Object.assign(m, { x: 0.12, y: 0.88 })] : [];
      this.sel = null; this.changed();
      this.app.toast('Cleared', 'Undo', () => this.undo());
    }
    magic() {
      const aspect = this.stage.view.Wu / H;
      if (this.layout.auto && JSON.stringify(this.layout.boxes) !== this.autoBoxes) this.layout.auto = false;
      this.layout = Engine.generate(this.layout, aspect); this.autoBoxes = JSON.stringify(this.layout.boxes); this.app.layout = this.layout; this.sel = null; this.changed();
      this.app.toast(this.hist.length > 2 ? 'Rolled a new world' : 'Built! Tap again for another', 'Undo', () => this.undo());
      this.app.burst();
    }
    setSkin(id) {
      this.brush = id;
      const s = this.selected();
      if (s && this.sel.kind === 'box') { s.skin = id; this.changed(); } else this.renderSkins();
    }
    // ------------------------------------------------------------ hit testing
    elRect(el) { const r = elRectU(el, this.Wu); const ex = Math.max(0, (10 - r.w) / 2), ey = Math.max(0, (10 - r.h) / 2); return { x: r.x - ex, y: r.y - ey, w: r.w + 2 * ex, h: r.h + 2 * ey }; }
    handlePts(sel) {
      const o = this.find(sel); if (!o) return [];
      if (sel.kind === 'el') {
        const r = elRectU(o, this.Wu), pts = [{ id: 'scale', x: r.x + r.w, y: r.y }];
        const mo = this.motion(o);
        if (mo.axis) { const e = this.motionEnds(o, mo); pts.unshift({ id: 'mb', x: e[1].x, y: e[1].y }, { id: 'ma', x: e[0].x, y: e[0].y }); }
        return pts;
      }
      const r = boxU(o, this.Wu), mx = r.x + r.w / 2, my = r.y + r.h / 2;
      const P = { nw: [r.x, r.y], n: [mx, r.y], ne: [r.x + r.w, r.y], e: [r.x + r.w, my], se: [r.x + r.w, r.y + r.h], s: [mx, r.y + r.h], sw: [r.x, r.y + r.h], w: [r.x, my] };
      return HANDLES.map(id => ({ id, x: P[id][0], y: P[id][1] }));
    }
    boxesU() { return this.layout.boxes.map(b => boxU(b, this.Wu)); }
    motion(o) { return o.type === 'mario' ? { axis: null, a: 0, b: 0 } : Engine.motionOf(o, this.boxesU(), this.Wu); }
    motionEnds(o, mo) {
      const bx = o.x * this.Wu, by = o.y * H;
      return mo.axis === 'x' ? [{ x: bx + mo.a, y: by }, { x: bx + mo.b, y: by }] : [{ x: bx, y: by + mo.a }, { x: bx, y: by + mo.b }];
    }
    setMotion(axis) {
      const o = this.selected(); if (!o || this.sel.kind !== 'el') return;
      if (!axis) o.m = { axis: null, a: 0, b: 0 };
      else {
        const d = Engine.defaultMotion(o.type, o.x * this.Wu, o.y * H, o.s, this.boxesU());
        o.m = d.axis === axis ? d : axis === 'x' ? { axis: 'x', a: -28, b: 28 } : { axis: 'y', a: -28, b: 0 };
      }
      this.changed();
      if (axis) this.app.toast('Drag the cyan dots to set how far it moves');
    }
    hit(p) {
      const tol = 9 / (this.stage.cssH / H);
      if (this.sel) { const o = this.selected(); for (const h of this.handlePts(this.sel)) {
        const lift = (h.id === 'ma' || h.id === 'mb') && this.motion(o).axis === 'x' ? BY_TYPE[o.type].h * o.s / 2 : 0;
        if (Math.abs(p.x - h.x) <= tol && Math.abs(p.y - (h.y - lift)) <= tol) return { handle: h.id }; } }
      const els = this.app.game.actors.map(a => a.el);
      for (let i = els.length - 1; i >= 0; i--) { const r = this.elRect(els[i]); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return { kind: 'el', id: els[i].id }; }
      for (let i = this.layout.boxes.length - 1; i >= 0; i--) { const r = boxU(this.layout.boxes[i], this.Wu); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return { kind: 'box', id: this.layout.boxes[i].id }; }
      return null;
    }
    // ------------------------------------------------------------ stage pointer
    bindStage() {
      const L = $('#editLayer');
      L.addEventListener('pointerdown', e => this.down(e));
      L.addEventListener('pointermove', e => this.move(e));
      L.addEventListener('pointerup', e => this.up(e));
      L.addEventListener('pointercancel', e => this.up(e));
      L.addEventListener('dblclick', e => { const h = this.hit(this.stage.toUnits(e.clientX, e.clientY)); if (h && h.kind === 'el') { const o = this.find(h); o.flip = !o.flip; this.changed(); } });
    }
    down(e) {
      if (e.button !== 0) return;
      const p = this.stage.toUnits(e.clientX, e.clientY), h = this.hit(p);
      e.currentTarget.setPointerCapture(e.pointerId);
      this.downAt = { cx: e.clientX, cy: e.clientY };
      if (h && h.handle) {
        const o = this.selected();
        if (h.handle === 'ma' || h.handle === 'mb') { o.m = Object.assign({}, this.motion(o)); this.drag = { mode: 'motion', handle: h.handle, p0: p, orig: Object.assign({}, o) }; return; }
        this.drag = { mode: h.handle === 'scale' ? 'scale' : 'resize', handle: h.handle, p0: p, orig: Object.assign({}, o) }; return;
      }
      if (h) { this.sel = h; this.drag = { mode: 'move', p0: p, orig: Object.assign({}, this.find(h)) }; this.refresh(); return; }
      this.sel = null; this.refresh();
      this.drag = { mode: 'draw', p0: p, cur: p };
    }
    move(e) {
      const p = this.stage.toUnits(e.clientX, e.clientY);
      if (!this.drag) { const h = this.hit(p); e.currentTarget.style.cursor = !h ? 'crosshair' : h.handle ? (h.handle === 'ma' || h.handle === 'mb' ? 'move' : h.handle === 'scale' ? 'nesw-resize' : ({ n: 'ns', s: 'ns', e: 'ew', w: 'ew', nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw' })[h.handle] + '-resize') : 'grab'; return; }
      const d = this.drag, dx = p.x - d.p0.x, dy = p.y - d.p0.y, Wu = this.Wu, o = this.selected();
      const sn = v => this.prefs.snap ? Math.round(v / 4) * 4 : v;
      if (d.mode === 'draw') { d.cur = p; return; }
      if (!o) return;
      d.moved = d.moved || Math.hypot(e.clientX - this.downAt.cx, e.clientY - this.downAt.cy) > 3;
      if (!d.moved) return;
      if (d.mode === 'move') {
        e.currentTarget.style.cursor = 'grabbing';
        if (this.sel.kind === 'box') {
          o.x = clamp(sn(d.orig.x * Wu + dx), -o.w * Wu + 4, Wu - 4) / Wu; o.y = clamp(sn(d.orig.y * H + dy), -o.h * H + 4, H - 4) / H;
        } else {
          const q = this.magnet(d.orig.x * Wu + dx, d.orig.y * H + dy);
          o.x = clamp(q.x, 0, Wu) / Wu; o.y = clamp(q.y, 4, H + 8) / H;
        }
      } else if (d.mode === 'resize') {
        let x0 = d.orig.x * Wu, y0 = d.orig.y * H, x1 = x0 + d.orig.w * Wu, y1 = y0 + d.orig.h * H; const hd = d.handle;
        if (hd.includes('w')) x0 = Math.min(sn(x0 + dx), x1 - 6); if (hd.includes('e')) x1 = Math.max(sn(x1 + dx), x0 + 6);
        if (hd.includes('n')) y0 = Math.min(sn(y0 + dy), y1 - 6); if (hd.includes('s')) y1 = Math.max(sn(y1 + dy), y0 + 6);
        o.x = x0 / Wu; o.y = y0 / H; o.w = (x1 - x0) / Wu; o.h = (y1 - y0) / H;
      } else if (d.mode === 'motion') {
        const bx = o.x * Wu, by = o.y * H, v = sn(o.m.axis === 'x' ? p.x - bx : p.y - by);
        if (d.handle === 'ma') o.m.a = Math.round(clamp(v, -400, 0)); else o.m.b = Math.round(clamp(v, 0, 400));
      } else if (d.mode === 'scale') {
        const fx = d.orig.x * Wu, fy = d.orig.y * H, base = BY_TYPE[o.type];
        const d0 = Math.hypot(base.w * d.orig.s / 2, base.h * d.orig.s), d1 = Math.hypot(p.x - fx, p.y - fy);
        o.s = clamp(Math.round(d.orig.s * d1 / d0 * 20) / 20, 0.4, 6);
      }
      this.app.game.setLayout(this.layout); this.renderSelbar();
    }
    up(e) {
      const d = this.drag; this.drag = null; this.guide = null;
      if (!d) return;
      e.currentTarget.style.cursor = 'crosshair';
      if (d.mode === 'draw') {
        const x = Math.min(d.p0.x, d.cur.x), y = Math.min(d.p0.y, d.cur.y), w = Math.abs(d.cur.x - d.p0.x), h = Math.abs(d.cur.y - d.p0.y);
        if (w >= 5 && h >= 4) {
          const sn = v => this.prefs.snap ? Math.round(v / 4) * 4 : v;
          this.addBox({ x: sn(x), y: sn(y), w: Math.max(6, sn(w)), h: Math.max(4, sn(h)) });
        }
        return;
      }
      if (d.moved) this.changed();
    }
    nudge(dx, dy) {
      const o = this.selected(); if (!o) return;
      o.x += dx / this.Wu; o.y += dy / H; this.app.game.setLayout(this.layout); this.renderSelbar();
      clearTimeout(this.nt); this.nt = setTimeout(() => this.commit(), 400);
    }
    key(e) {
      const mod = e.metaKey || e.ctrlKey, k = e.key;
      if (mod && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return true; }
      if (mod && k.toLowerCase() === 'y') { e.preventDefault(); this.redo(); return true; }
      if (mod && k.toLowerCase() === 'd') { e.preventDefault(); this.duplicate(); return true; }
      if (k === 'Delete' || k === 'Backspace') { this.remove(); return true; }
      if (k === 'Escape') { if (document.body.classList.contains('pinning')) this.app.pinMode(false); else { this.sel = null; this.refresh(); } return true; }
      const st = e.shiftKey ? 8 : 1;
      if (k === 'ArrowLeft') { this.nudge(-st, 0); return true; } if (k === 'ArrowRight') { this.nudge(st, 0); return true; }
      if (k === 'ArrowUp') { this.nudge(0, -st); return true; } if (k === 'ArrowDown') { this.nudge(0, st); return true; }
      if (k === 'h' || k === 'H') { this.app.togglePanels(); return true; }
      return false;
    }
    // ------------------------------------------------------------ overlay drawing (in stage space)
    drawOverlay(ctx) {
      const u = this.stage.view.u, Wu = this.Wu, dpr = this.stage.dpr;
      if (this.prefs.grid || document.body.classList.contains('pinning')) {
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= Wu; x += 16) { ctx.moveTo(Math.round(x * u) + 0.5, 0); ctx.lineTo(Math.round(x * u) + 0.5, H * u); }
        for (let y = 0; y <= H; y += 16) { ctx.moveTo(0, Math.round(y * u) + 0.5); ctx.lineTo(Wu * u, Math.round(y * u) + 0.5); }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2 * dpr; ctx.strokeRect(dpr, dpr, Wu * u - 2 * dpr, H * u - 2 * dpr);
        ctx.beginPath(); ctx.moveTo(Wu * u / 2, 0); ctx.lineTo(Wu * u / 2, H * u); ctx.moveTo(0, H * u / 2); ctx.lineTo(Wu * u, H * u / 2); ctx.stroke();
        ctx.restore();
      }
      if (document.body.classList.contains('pinning')) return;
      ctx.save(); ctx.lineWidth = 1 * dpr; ctx.setLineDash([4 * dpr, 4 * dpr]); ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      for (const b of this.layout.boxes) { const r = boxU(b, Wu); ctx.strokeRect(r.x * u + 0.5, r.y * u + 0.5, r.w * u, r.h * u); }
      ctx.restore();
      for (const b of this.layout.boxes) if (b.skin === 'blank') this.hatch(ctx, boxU(b, Wu), u, dpr);
      const selO = this.sel && this.sel.kind === 'el' ? this.selected() : null;
      for (const el of this.layout.els) {
        const mo = this.motion(el); if (!mo.axis) continue;
        const e = this.motionEnds(el, mo), on = el === selO, d = BY_TYPE[el.type], lift = mo.axis === 'x' ? d.h * el.s / 2 : 0;
        ctx.save(); ctx.strokeStyle = on ? '#3cfcd8' : 'rgba(60,252,216,0.35)'; ctx.lineWidth = (on ? 2.5 : 1.5) * dpr; ctx.setLineDash([5 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.moveTo(e[0].x * u, (e[0].y - lift) * u); ctx.lineTo(e[1].x * u, (e[1].y - lift) * u); ctx.stroke(); ctx.setLineDash([]);
        if (on) for (const q of e) Engine.spr(ctx, u, d.img, q.x, q.y, el.s, el.flip ? d.face > 0 : d.face < 0, { alpha: 0.28 });
        ctx.restore();
      }
      const o = this.selected();
      if (o) {
        const r = this.sel.kind === 'box' ? boxU(o, Wu) : elRectU(o, Wu);
        ctx.save(); ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 2 * dpr; ctx.shadowColor = 'rgba(255,210,58,0.6)'; ctx.shadowBlur = 8 * dpr;
        ctx.strokeRect(r.x * u, r.y * u, r.w * u, r.h * u); ctx.restore();
        const hs = 9 * dpr;
        for (const h of this.handlePts(this.sel)) {
          const mot = h.id === 'ma' || h.id === 'mb', lift = mot && this.motion(o).axis === 'x' ? BY_TYPE[o.type].h * o.s / 2 : 0;
          ctx.fillStyle = mot ? '#3cfcd8' : '#ffd23a'; ctx.strokeStyle = '#06201c'; ctx.lineWidth = 2 * dpr;
          ctx.beginPath(); if (h.id === 'scale' || mot) ctx.arc(h.x * u, (h.y - lift) * u, hs * (mot ? 0.9 : 0.75), 0, 7); else ctx.rect(h.x * u - hs / 2, h.y * u - hs / 2, hs, hs);
          ctx.fill(); ctx.stroke();
        }
      }
      if (this.drag && this.drag.mode === 'draw') {
        const d = this.drag, x = Math.min(d.p0.x, d.cur.x), y = Math.min(d.p0.y, d.cur.y), w = Math.abs(d.cur.x - d.p0.x), h = Math.abs(d.cur.y - d.p0.y);
        Engine.drawBox(ctx, u, { x, y, w, h, skin: this.brush }, { t: this.app.game.t, theme: 0 });
        ctx.save(); ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 2 * dpr; ctx.setLineDash([6 * dpr, 4 * dpr]); ctx.strokeRect(x * u, y * u, w * u, h * u); ctx.restore();
      }
      if (this.guide) {
        ctx.save(); ctx.strokeStyle = '#3cfcd8'; ctx.lineWidth = 3 * dpr; ctx.shadowColor = '#3cfcd8'; ctx.shadowBlur = 10 * dpr;
        ctx.beginPath(); ctx.moveTo(this.guide.x * u, this.guide.y * u); ctx.lineTo((this.guide.x + this.guide.w) * u, this.guide.y * u); ctx.stroke(); ctx.restore();
      }
      this.placeSelbar();
    }
    // ------------------------------------------------------------ selection toolbar
    renderSelbar() {
      const bar = $('#selbar'), o = this.selected();
      if (!o) { bar.classList.remove('show'); bar.innerHTML = ''; this.selKey = null; return; }
      const key = this.sel.kind + o.id + (o.skin || '') + (o.flip ? 1 : 0) + (o.m ? o.m.axis : '');
      if (key !== this.selKey) {
        this.selKey = key; const I = this.app.icon;
        const T = (t, d) => ` data-tip="${t}|${d}"`;
        if (this.sel.kind === 'box') {
          bar.innerHTML = '<div class="sb-skins">' + SKINS.map(s => `<button class="sb-skin${s.id === o.skin ? ' on' : ''}" data-skin="${s.id}" data-tip="${s.tip}"></button>`).join('') + '</div><span class="sb-sep"></span>' +
            `<button class="ib" data-act="dup"${T('Duplicate', 'Make a copy of this box right next to it. Shortcut: Ctrl/Cmd + D.')}>${I('copy')}</button><button class="ib danger" data-act="del"${T('Delete', 'Remove this box. Shortcut: Delete or Backspace.')}>${I('trash')}</button>`;
          bar.querySelectorAll('.sb-skin').forEach(b => b.appendChild(this.skinThumb(b.dataset.skin, 34, 22)));
        } else {
          const isM = o.type === 'mario', mo = this.motion(o);
          bar.innerHTML = `<span class="sb-name">${BY_TYPE[o.type].name}</span><span class="sb-sep"></span>` +
            `<button class="ib" data-act="flip"${T('Flip', 'Turn it to face the other way. Double-click on the wall also flips.')}>${I('flip')}</button>` +
            `<button class="ib" data-act="smaller"${T('Smaller', 'Shrink it a step. You can also drag the yellow dot on its corner.')}>${I('minus')}</button>` +
            `<button class="ib" data-act="bigger"${T('Bigger', 'Grow it a step. You can also drag the yellow dot on its corner.')}>${I('plus')}</button>` +
            (isM ? '' : `<span class="sb-sep"></span><div class="sb-motion">` +
              `<button class="ib${!mo.axis ? ' on' : ''}" data-act="still"${T('Stay still', 'It stays where you placed it (it may still do small actions while playing).')}>${I('still')}</button>` +
              `<button class="ib${mo.axis === 'x' ? ' on' : ''}" data-act="mx"${T('Move left and right', 'It walks back and forth. Drag the cyan dots on the wall to set how far it goes each way.')}>${I('horiz')}</button>` +
              `<button class="ib${mo.axis === 'y' ? ' on' : ''}" data-act="my"${T('Move up and down', 'It floats up and down. Drag the cyan dots on the wall to set how far it goes.')}>${I('vert')}</button></div>`) +
            `<span class="sb-sep"></span>` +
            `<button class="ib" data-act="dup" ${isM ? 'disabled' : ''}${T('Duplicate', 'Make a copy next to it. Shortcut: Ctrl/Cmd + D.')}>${I('copy')}</button>` +
            `<button class="ib danger" data-act="del" ${isM ? 'disabled' : ''}${T('Delete', 'Remove it from the wall. Shortcut: Delete or Backspace.')}>${I('trash')}</button>`;
        }
        bar.onclick = ev => {
          const b = ev.target.closest('button'); if (!b) return; const s = this.selected(); if (!s) return;
          if (b.dataset.skin) return this.setSkin(b.dataset.skin);
          const a = b.dataset.act;
          if (a === 'dup') this.duplicate(); else if (a === 'del') this.remove();
          else if (a === 'flip') { s.flip = !s.flip; this.changed(); }
          else if (a === 'still') this.setMotion(null); else if (a === 'mx') this.setMotion('x'); else if (a === 'my') this.setMotion('y');
          else if (a === 'smaller') { s.s = Math.max(0.4, Math.round((s.s - 0.25) * 4) / 4); this.changed(); }
          else if (a === 'bigger') { s.s = Math.min(6, Math.round((s.s + 0.25) * 4) / 4); this.changed(); }
        };
      }
      bar.classList.add('show'); this.placeSelbar();
    }
    placeSelbar() {
      const bar = $('#selbar'), o = this.selected(); if (!o || !bar.classList.contains('show')) return;
      const r = this.sel.kind === 'box' ? boxU(o, this.Wu) : elRectU(o, this.Wu);
      const top = this.stage.toScreen(r.x + r.w / 2, r.y), bot = this.stage.toScreen(r.x + r.w / 2, r.y + r.h);
      const bw = bar.offsetWidth, bh = bar.offsetHeight;
      let x = clamp(top[0] - bw / 2, 12, innerWidth - bw - 12), y = top[1] - bh - 16;
      if (y < 76) y = Math.min(bot[1] + 16, innerHeight - bh - 12);
      bar.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }
    // ------------------------------------------------------------ panels
    skinThumb(id, w, h) {
      const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      const u = c.height / 16; Engine.drawBox(x, u, { x: 0, y: 0, w: c.width / u, h: 16, skin: id }, { t: 0.4, theme: 0, env: id === 'neon' ? 1 : 0 });
      if (id === 'blank') this.hatch(x, { x: 0, y: 0, w: c.width / u, h: 16 }, u, 2, true);
      return c;
    }
    hatch(ctx, r, u, dpr, solid) {
      const X = r.x * u, Y = r.y * u, W = r.w * u, Hh = r.h * u;
      ctx.save(); ctx.beginPath(); ctx.rect(X, Y, W, Hh); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1 * dpr;
      ctx.beginPath(); for (let k = -Hh; k < W; k += 8 * dpr) { ctx.moveTo(X + k, Y + Hh); ctx.lineTo(X + k + Hh, Y); } ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.setLineDash([4 * dpr, 3 * dpr]); ctx.lineWidth = 1.5 * dpr;
      if (solid) ctx.strokeRect(X + dpr, Y + dpr, W - 2 * dpr, Hh - 2 * dpr);
      ctx.restore();
    }
    buildPanels() {
      const I = this.app.icon;
      // skins grid
      const sk = $('#skins');
      sk.innerHTML = SKINS.map(s => `<button class="skin" data-skin="${s.id}" data-tip="${s.tip}"><span class="sw"></span><em>${s.name}</em></button>`).join('');
      sk.querySelectorAll('.skin').forEach(b => { b.querySelector('.sw').appendChild(this.skinThumb(b.dataset.skin, 48, 28)); b.onclick = () => this.setSkin(b.dataset.skin); });
      // palette tabs
      const cats = [['heroes', 'Heroes', 'mario', 'Mario (always on the wall), Luigi who follows him, Toad, Peach and Yoshi.'], ['enemies', 'Enemies', 'goomba', 'Goombas, Koopas, Piranha Plants, Boo, Bowser and more. Mario stomps them while playing.'],
        ['items', 'Items', 'qblock', 'Blocks, coins and power-ups Mario collects: mushroom, 1-Up, star and fire flower.'], ['world', 'World', 'pipe', 'Scenery: pipes, clouds, bushes, hills, the flagpole and a castle.']];
      $('#tabs').innerHTML = cats.map(([id, name, t, d]) => `<button class="tab" data-tab="${id}" data-tip="${name}|${d}"><span class="ti"></span>${name}</button>`).join('');
      $('#tabs').querySelectorAll('.tab').forEach((b, i) => { b.querySelector('.ti').appendChild(this.thumb(cats[i][2], 22)); b.onclick = () => { this.tab = b.dataset.tab; this.renderPalette(); }; });
      this.renderPalette();
      // buttons
      $('#bAdd').onclick = () => { const Wu = this.Wu; this.addBox({ x: Wu / 2 - 32, y: 100, w: 64, h: 16 }); };
      $('#bDup').onclick = () => this.duplicate();
      $('#bDel').onclick = () => this.remove();
      $('#bClear').onclick = () => this.clearAll();
      $('#undo').onclick = () => this.undo(); $('#redo').onclick = () => this.redo();
      $('#magic').onclick = () => this.magic();
      $('#tGrid').onclick = () => { this.prefs.grid = !this.prefs.grid; this.syncPrefs(); };
      $('#tSnap').onclick = () => { this.prefs.snap = !this.prefs.snap; this.syncPrefs(); };
      $('#tGlow').onclick = () => { this.prefs.glow = !this.prefs.glow; this.syncPrefs(); };
      $('#tPin').onclick = () => this.app.pinMode(!document.body.classList.contains('pinning'));
      $('#tPhoto').onclick = () => { if (!this.app.photo) $('#photoInput').click(); else { this.prefs.photo = !this.prefs.photo; this.syncPrefs(); } };
      $('#photoOpacity').oninput = e => { this.prefs.photoOpacity = +e.target.value; this.syncPrefs(); };
      $('#photoReplace').onclick = () => $('#photoInput').click();
      $('#photoRemove').onclick = () => { this.app.setPhoto(null); this.syncPrefs(); };
      $('#photoInput').onchange = e => { const f = e.target.files[0]; if (f) this.app.loadPhoto(f).then(() => { this.prefs.photo = true; this.syncPrefs(); }); e.target.value = ''; };
    }
    syncPrefs() {
      const p = this.prefs, has = !!this.app.photo;
      $('#tGrid').classList.toggle('on', p.grid); $('#tGlow').classList.toggle('on', p.glow); $('#tSnap').classList.toggle('on', p.snap);
      $('#tPhoto').classList.toggle('on', has && p.photo); $('#photoRow').hidden = !has;
      $('#photoOpacity').value = p.photoOpacity;
      const ph = $('#photo'); ph.style.opacity = has && p.photo ? p.photoOpacity : 0;
      this.app.savePrefs(p);
    }
    thumb(type, size) {
      const d = BY_TYPE[type], c = document.createElement('canvas'), dpr = 2; c.width = c.height = size * dpr;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      const sc = Math.min(size * dpr / d.w, size * dpr / d.h) * 0.92, w = d.w * sc, h = d.h * sc;
      x.drawImage(d.img, (c.width - w) / 2, (c.height - h) / 2, w, h); return c;
    }
    renderSkins() {
      const s = this.selected(), cur = s && this.sel.kind === 'box' ? s.skin : this.brush;
      document.querySelectorAll('#skins .skin').forEach(b => b.classList.toggle('on', b.dataset.skin === cur));
      $('#skinHead').textContent = s && this.sel.kind === 'box' ? 'Box skin' : 'New box skin';
    }
    renderPalette() {
      document.querySelectorAll('#tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
      const pal = $('#palette'); pal.innerHTML = '';
      ELEMENTS.filter(e => e.cat === this.tab).forEach(e => {
        const b = document.createElement('button'); b.className = 'pi'; b.dataset.type = e.type; b.dataset.tip = TIPS[e.type] + ' Drag it onto your wall, or tap to drop it.';
        const t = document.createElement('span'); t.className = 'pt'; t.appendChild(this.thumb(e.type, 52));
        b.appendChild(t); const n = document.createElement('em'); n.textContent = e.name; b.appendChild(n);
        if (e.type === 'mario') { const star = document.createElement('i'); star.className = 'must'; star.textContent = '★'; star.title = 'Always on your wall'; b.appendChild(star); }
        b.addEventListener('pointerdown', ev => this.palDown(ev, e));
        pal.appendChild(b);
      });
    }
    // drag from palette
    palDown(ev, def) {
      ev.preventDefault();
      const start = { x: ev.clientX, y: ev.clientY }; let ghost = null;
      const mv = e => {
        if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) {
          ghost = document.createElement('div'); ghost.className = 'drag-ghost';
          const pxu = this.stage.cssH / H, c = this.thumb(def.type, 64);
          c.style.width = def.w * pxu + 'px'; c.style.height = def.h * pxu + 'px'; ghost.appendChild(c); document.body.appendChild(ghost);
          document.body.classList.add('dragging');
        }
        if (ghost) {
          const overUi = this.overUi(e.clientX, e.clientY);
          ghost.classList.toggle('bad', overUi);
          const p = this.stage.toUnits(e.clientX, e.clientY), q = overUi ? p : this.magnet(p.x, p.y);
          if (overUi) this.guide = null;
          const s = this.stage.toScreen(q.x, q.y);
          ghost.style.transform = `translate(${s[0]}px, ${s[1]}px)`;
        }
      };
      const upFn = e => {
        removeEventListener('pointermove', mv); removeEventListener('pointerup', upFn);
        document.body.classList.remove('dragging'); this.guide = null;
        if (ghost) { ghost.remove(); if (!this.overUi(e.clientX, e.clientY)) { const p = this.stage.toUnits(e.clientX, e.clientY); this.addElement(def.type, p.x, p.y); } }
        else this.addElement(def.type);
      };
      addEventListener('pointermove', mv); addEventListener('pointerup', upFn);
    }
    overUi(x, y) {
      const el = document.elementFromPoint(x, y);
      return !!(el && el.closest('.panel, .topbar, #selbar, .pill, .toast'));
    }
  }
  MW.Editor = Editor;
})(window);
