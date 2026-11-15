// Mario Wall — renderer, game simulation and random level builder.
// Coordinates: layout is normalised (0..1). The engine works in "art pixels" (units): the stage is 180 units tall,
// Wu = 180 * aspect units wide. Element x/y are the FEET (bottom-centre) of the sprite.
(function (g) {
  'use strict';
  const MW = g.MW = g.MW || {};
  const A = MW.Art, { sprites, tiles, BY_TYPE, CAT_ORDER, THEMES, PAL } = A;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  let uid = 1; const newId = p => p + Date.now().toString(36) + (uid++).toString(36);

  // ---------------------------------------------------------------- geometry
  const H = 180;
  const NOWALK = { lava: 1, water: 1 };
  const boxU = (b, Wu) => ({ x: b.x * Wu, y: b.y * H, w: b.w * Wu, h: b.h * H, skin: b.skin, id: b.id });
  function elRectU(el, Wu) {
    const d = BY_TYPE[el.type], w = d.w * el.s, h = d.h * el.s;
    return { x: el.x * Wu - w / 2, y: el.y * H - h, w, h };
  }
  function surfaceUnder(x, y, boxes, tol = 3) {
    let best = null;
    for (const b of boxes) if (!NOWALK[b.skin] && x >= b.x - 1 && x <= b.x + b.w + 1 && Math.abs(y - b.y) <= tol) if (!best || b.w > best.w) best = b;
    return best;
  }
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const sortEls = els => els.map((e, i) => [e, i]).sort((p, q) => (CAT_ORDER[BY_TYPE[p[0].type].cat] - CAT_ORDER[BY_TYPE[q[0].type].cat]) || (p[1] - q[1])).map(p => p[0]);

  // ---------------------------------------------------------------- drawing helpers
  function spr(ctx, u, img, x, y, s, flip, o) {
    o = o || {};
    const w = img.width * s * (o.sx || 1) * u, h = img.height * s * (o.sy || 1) * u;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha, 0, 1);
    ctx.translate(x * u, y * u);
    if (o.vflip) { ctx.translate(0, -h / 2); ctx.scale(1, -1); ctx.translate(0, h / 2); }
    if (o.rot) { ctx.translate(0, -h / 2); ctx.rotate(o.rot); ctx.translate(0, h / 2); }
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }
  const pulse = (x, len) => (x < 0 || x > len) ? 0 : Math.sin(x / len * Math.PI);

  function drawBox(ctx, u, r, fx) {
    const X = r.x * u, Y = r.y * u, W = r.w * u, Ht = r.h * u, th = fx.theme || 0, t = fx.t || 0;
    if (W < 1 || Ht < 1) return;
    const skin = r.skin;
    if (skin === 'blank') return;
    if (skin === 'brick' || skin === 'q' || skin === 'ground' || skin === 'stone' || skin === 'ice' || skin === 'gold' || skin === 'castle') {
      const rows = Math.max(1, Math.round(r.h / 16)), ts = Ht / rows, cols = Math.max(1, Math.round(W / ts)), tw = W / cols;
      const shimmer = [0, 0, 0, 1, 2, 1][Math.floor(t * 7) % 6];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        let img;
        if (skin === 'brick' && fx.pswitch) { const k = Math.max(0.15, Math.abs(Math.cos(t * 4 + i * 0.5))), cw = tw * 0.62 * k, ch = ts * 0.85; ctx.drawImage(sprites.coin, X + i * tw + (tw - cw) / 2, Y + j * ts + (ts - ch) / 2, cw, ch); continue; }
        if (skin === 'brick') img = tiles.brick[th];
        else if (skin === 'ground') img = tiles.ground[th];
        else if (skin === 'stone') img = tiles.stone[th];
        else if (skin === 'ice') img = tiles.ice;
        else if (skin === 'gold') img = tiles.gold[(Math.floor(t * 3 + i * 0.35 + j * 0.2) % 5 === 0) ? 1 : 0];
        else if (skin === 'castle') img = tiles.castle;
        else img = tiles.q[shimmer];
        let off = 0;
        if (skin === 'q' && r.bumpI === i && j === 0) off = -3 * u * pulse(t - r.bumpT, 0.2);
        ctx.drawImage(img, X + i * tw, Y + j * ts + off, tw + 0.6, ts + 0.6);
      }
      if (skin === 'ice') { // glint sweeping across
        ctx.save(); ctx.beginPath(); ctx.rect(X, Y, W, Ht); ctx.clip();
        const gx = X + (((t * 0.35) % 1.6) - 0.3) * W; ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.moveTo(gx, Y); ctx.lineTo(gx + 6 * u, Y); ctx.lineTo(gx + 6 * u - Ht, Y + Ht); ctx.lineTo(gx - Ht, Y + Ht); ctx.fill(); ctx.restore();
      }
      if (skin === 'castle') { ctx.fillStyle = '#000'; const n = Math.max(1, Math.round(W / (8 * u))), cw = W / n; for (let k = 0; k < n; k += 2) ctx.fillRect(X + (k + 0.5) * cw, Y - 0.5, cw, Math.min(4 * u, Ht * 0.35)); }
    } else if (skin === 'water') {
      ctx.save(); ctx.beginPath(); ctx.rect(X, Y, W, Ht); ctx.clip();
      ctx.fillStyle = '#0038a8'; ctx.fillRect(X, Y + 3 * u, W, Ht);
      const step = Math.max(2, u * 2);
      for (let x = 0; x < W; x += step) {
        const wv = Math.round(Math.sin(x / u * 0.16 + t * 2.4) * 1.4 + Math.sin(x / u * 0.05 - t * 1.1)) * u;
        ctx.fillStyle = '#0870e8'; ctx.fillRect(X + x, Y + 2 * u + wv, step + 0.5, Ht);
        ctx.fillStyle = '#3cbcfc'; ctx.fillRect(X + x, Y + 2 * u + wv, step + 0.5, u);
        if (Math.sin(x / u * 0.4 + t * 3) > 0.85) { ctx.fillStyle = PAL.white; ctx.fillRect(X + x, Y + 1.2 * u + wv, step + 0.5, u * 0.8); }
      }
      ctx.fillStyle = 'rgba(168,228,252,0.8)';
      for (let k = 0; k < Math.max(2, r.w / 12); k++) { const bx = (k * 0.618) % 1, ph = (t * 0.45 + k * 0.29) % 1; ctx.fillRect(X + bx * W + Math.sin(ph * 12) * u, Y + Ht - ph * (Ht - 4 * u), u * 1.4, u * 1.4); }
      ctx.restore();
    } else if (skin === 'grass' || skin === 'mushroom' || skin === 'bridge' || skin === 'rainbow') {
      const rw = Math.max(6, Math.round(r.w)), rh = Math.max(4, Math.round(r.h));
      ctx.save(); ctx.beginPath(); ctx.rect(X, Y, W, Ht); ctx.clip(); ctx.translate(X, Y); ctx.scale(W / rw, Ht / rh);
      const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      if (skin === 'grass') {
        R('#8c4a1c', 0, 0, rw, rh); R('#6b3410', 0, rh - 2, rw, 2);
        for (let k = 0; k < rw * rh / 18; k++) { const px = (k * 7.31) % rw | 0, py = 6 + ((k * 3.7) % Math.max(1, rh - 7)) | 0; R('#c87840', px, py, 2, 1); }
        const gh = Math.min(5, Math.max(3, rh * 0.35) | 0); R('#005800', 0, gh, rw, 1); R('#00a800', 0, 0, rw, gh); R('#80d010', 0, 0, rw, 1);
        for (let x = 1; x < rw; x += 4) { R('#80d010', x, gh, 1, 2); R('#00a800', x + 2, gh, 1, 1); }
      } else if (skin === 'mushroom') {
        const cap = Math.max(3, rh - 3); R('#fce0a8', 2, cap, rw - 4, rh - cap); R('#c88850', 2, rh - 1, rw - 4, 1);
        R('#981800', 0, 1, rw, cap - 1); R('#d82800', 1, 0, rw - 2, cap - 1); R('#fc7460', 2, 0, rw - 4, 1);
        ctx.fillStyle = PAL.white; for (let x = 4; x < rw - 3; x += 10) { A.disk(ctx, x + 2, Math.max(2, cap / 2 | 0), Math.max(1, Math.min(3, cap / 3 | 0))); }
      } else if (skin === 'bridge') {
        R('#c87840', 0, 2, rw, Math.max(2, rh - 2)); for (let x = 0; x < rw; x += 5) R('#6b3410', x, 2, 1, rh);
        R('#fce0a8', 0, 2, rw, 1); R('#6b3410', 0, rh - 1, rw, 1); R('#e0a060', 0, 0, rw, 1);
        for (let x = 0; x < rw; x += 10) R('#6b3410', x, 0, 1, 3);
      } else {
        const cols = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#0a84ff', '#5856d6', '#ff2d92'], sw = 4, off = (t * 12) % (sw * cols.length);
        for (let x = -rh - sw * cols.length; x < rw + rh; x += sw) { const ci = Math.floor((x + off + 1000 * sw * cols.length) / sw) % cols.length; ctx.fillStyle = cols[ci]; ctx.beginPath(); ctx.moveTo(x - off % sw, 0); ctx.lineTo(x - off % sw + sw, 0); ctx.lineTo(x - off % sw + sw - rh, rh); ctx.lineTo(x - off % sw - rh, rh); ctx.fill(); }
        R('rgba(255,255,255,0.45)', 0, 0, rw, 1);
        for (let k = 0; k < rw / 10; k++) if (Math.sin(t * 5 + k * 2.3) > 0.7) { const sx = (k * 9.7) % rw, sy = (k * 3.3) % rh; R(PAL.white, sx, sy, 1, 1); R('rgba(255,255,255,.6)', sx - 1, sy, 3, 1); }
      }
      ctx.restore();
    } else if (skin === 'pipe' || skin === 'cloud') {
      const rw = Math.max(6, Math.round(r.w)), rh = Math.max(6, Math.round(r.h));
      ctx.save(); ctx.translate(X, Y); ctx.scale(W / rw, Ht / rh);
      if (skin === 'pipe') A.pipeInto(ctx, 0, 0, rw, rh);
      else { A.puffs(ctx, rw, rh, PAL.white, PAL.ugLight, '#a8e4fc', false); }
      ctx.restore();
    } else if (skin === 'neon') {
      const T = THEMES[th], col = (fx.beatI || 0) % 2 ? T.neon2 : T.neon, lw = Math.max(2, u * 0.9);
      ctx.save();
      ctx.fillStyle = col; ctx.globalAlpha = 0.07 + 0.12 * (fx.env || 0); ctx.fillRect(X, Y, W, Ht);
      ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.shadowColor = col; ctx.shadowBlur = u * (2.5 + 4 * (fx.env || 0));
      ctx.strokeRect(X + lw / 2, Y + lw / 2, W - lw, Ht - lw);
      const sy = Y + ((t * 0.45) % 1) * Ht;
      ctx.globalAlpha = 0.55; ctx.fillRect(X + lw, sy, W - 2 * lw, Math.max(1, u * 0.5));
      ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
      const c = Math.max(3, u * 1.6);
      [[X, Y], [X + W - c, Y], [X, Y + Ht - c], [X + W - c, Y + Ht - c]].forEach(([a, b]) => ctx.fillRect(a, b, c, c));
      ctx.restore();
    } else if (skin === 'lava') {
      ctx.save(); ctx.beginPath(); ctx.rect(X, Y, W, Ht); ctx.clip();
      ctx.fillStyle = '#a81000'; ctx.fillRect(X, Y, W, Ht);
      const step = Math.max(2, u * 2);
      for (let x = 0; x < W; x += step) {
        const wv = Math.round((Math.sin(x / u * 0.18 + t * 3) * 1.5 + Math.sin(x / u * 0.07 - t * 1.7)) ) * u;
        ctx.fillStyle = PAL.lava; ctx.fillRect(X + x, Y + 2 * u + wv, step + 0.5, Ht);
        ctx.fillStyle = '#fcb800'; ctx.fillRect(X + x, Y + 2 * u + wv, step + 0.5, u);
      }
      ctx.fillStyle = '#fce0a8';
      for (let k = 0; k < Math.max(2, r.w / 14); k++) {
        const bx = ((k * 37.7) % 1 + (k * 0.618) % 1) % 1, ph = (t * 0.6 + k * 0.37) % 1;
        ctx.fillRect(X + bx * W, Y + Ht - ph * Ht, u * 1.2, u * 1.2);
      }
      ctx.restore();
    }
    if (fx.flash) { ctx.fillStyle = 'rgba(255,255,255,' + (fx.flash * 0.55).toFixed(3) + ')'; ctx.fillRect(X, Y, W, Ht); }
    else if (fx.env && skin !== 'neon' && !NOWALK[skin] && skin !== 'rainbow') { ctx.fillStyle = 'rgba(255,255,255,' + (fx.env * 0.06).toFixed(3) + ')'; ctx.fillRect(X, Y, W, Ht); }
  }

  // ---------------------------------------------------------------- motion
  // Every element can travel along one axis between offsets a (<= 0) and b (>= 0) from where it was placed.
  const SPEED = { goomba: 13, koopa: 11, spiny: 12, buzzy: 10, shyguy: 12, bobomb: 9, drybones: 9, hammer: 8, cheep: 18, boo: 8, bullet: 42, mushroom: 10, yoshi: 14, toad: 12, luigi: 16, peach: 10, wario: 12, waluigi: 14, daisy: 10, rosalina: 8, toadette: 12, captain: 11, dk: 10, yoshiRed: 14, yoshiBlue: 14, lakitu: 18, star: 16, flower: 0, oneup: 12 };
  const FLOAT = { boo: 1, cheep: 1, lakitu: 1 };
  function surfaceBelow(x, y, boxes) {
    let best = null;
    for (const b of boxes) if (!NOWALK[b.skin] && x >= b.x && x <= b.x + b.w && b.y >= y - 0.5 && (!best || b.y < best.y)) best = b;
    return best;
  }
  function patrolOn(sf, x, hw) { return { axis: 'x', a: Math.min(0, sf.x + hw - x), b: Math.max(0, sf.x + sf.w - hw - x) }; }
  function defaultMotion(type, bx, by, s, boxes) {
    const d = BY_TYPE[type], hw = d.w * s / 2;
    if (type === 'hammer') return { axis: 'x', a: -14, b: 14 };
    if (type === 'blooper') return { axis: 'y', a: -36, b: 0 };
    if (type === 'goomba' || type === 'koopa' || type === 'spiny' || type === 'buzzy' || type === 'shyguy' || type === 'bobomb' || type === 'drybones') {
      const sf = surfaceUnder(bx, by, boxes, 4);
      return sf ? patrolOn(sf, bx, hw) : { axis: 'x', a: -24, b: 24 };
    }
    if (type === 'thwomp') { const sf = surfaceBelow(bx, by + 1, boxes); return { axis: 'y', a: 0, b: sf ? Math.max(8, Math.round(sf.y - by)) : 60 }; }
    if (type === 'podoboo') return { axis: 'y', a: -60, b: 0 };
    if (type === 'chomp') return { axis: 'x', a: -36, b: 0 };
    if (type === 'lakitu') return { axis: 'x', a: -60, b: 60 };
    if (type === 'cheep') return { axis: 'x', a: -28, b: 28 };
    if (type === 'boo') return { axis: 'y', a: -8, b: 8 };
    if (type === 'bullet') return { axis: 'x', a: -230, b: 0 };
    return { axis: null, a: 0, b: 0 };
  }
  const motionOf = (el, boxes, Wu) => (el.m ? el.m : defaultMotion(el.type, el.x * Wu, el.y * H, el.s, boxes));

  // ---------------------------------------------------------------- game
  const ENEMY = { buzzy: 1, shyguy: 1, bobomb: 1, blooper: 1, hammer: 1, drybones: 1, goomba: 1, koopa: 1, boo: 1, bullet: 1, cheep: 1, piranha: 1, bowser: 1, spiny: 1, podoboo: 1, chomp: 1, lakitu: 1, thwomp: 1 };
  const STOMPABLE = { buzzy: 1, shyguy: 1, bobomb: 1, blooper: 1, hammer: 1, drybones: 1, goomba: 1, koopa: 1, boo: 1, bullet: 1, cheep: 1, lakitu: 1, bowser: 1 };
  const ITEM = { coin: 1, mushroom: 1, oneup: 1, star: 1, flower: 1, leaf: 1, iceflower: 1, mega: 1, redcoin: 1, key: 1, pmoon: 1 };
  const FRIENDS = { toad: 1, peach: 1, yoshi: 1, daisy: 1, rosalina: 1, toadette: 1, captain: 1, dk: 1, yoshiRed: 1, yoshiBlue: 1 };
  const ACT = { snowman: 1, palm: 1, qblock: 1, brick: 1, toad: 1, peach: 1, yoshi: 1, daisy: 1, rosalina: 1, toadette: 1, captain: 1, dk: 1, yoshiRed: 1, yoshiBlue: 1, luigi: 1, wario: 1, waluigi: 1, coin: 1, cloud: 1, bush: 1, tree: 1, castle: 1, flag: 1 };
  const HEROES = { luigi: 1, wario: 1, waluigi: 1 };

  class Game {
    constructor(view, layout, play) {
      this.view = view; this.play = !!play; this.t = 0; this.parts = []; this.shots = [];
      this.theme = 0; this.prevTheme = 0; this.themeT = -9; this.flash = 0; this.lastBeatT = -9; this.beatI = 0; this.period = 0.5;
      this.sfx = () => {}; this.coins = 0; this.score = 0; this.shake = 0; this.pswitch = 0; this.banner = null; this.hud = false;
      this.setLayout(layout);
    }
    setLayout(layout) {
      this.layout = layout;
      const Wu = this.view.Wu;
      this.boxes = layout.boxes.map(b => boxU(b, Wu));
      this.actors = sortEls(layout.els).map(el => this.makeActor(el, el.x * Wu, el.y * H));
      this.mario = this.actors.find(a => a.type === 'mario') || null;
      this.follower = this.actors.find(a => a.type === 'luigi' && !(a.m && a.m.axis)) || null;
      if (this.mario) this.buildRoute();
    }
    makeActor(el, x, y) {
      const d = BY_TYPE[el.type];
      const a = { el, type: el.type, d, bx: x, by: y, s: el.s, face: d.face, x, y, alive: true, respawn: 0, cd: 0, st: '', stT: 0, seed: Math.random() * 6.28, o: 0, ph: 0 };
      a.dir = el.flip ? -d.face : d.face;
      a.m = el.type === 'mario' ? { axis: null, a: 0, b: 0 } : motionOf(el, this.boxes, this.view.Wu);
      a.mdir = a.m.axis === 'x' ? (a.dir || 1) : -1;
      return a;
    }
    setTheme(k) { if (k === this.theme) return; this.prevTheme = this.theme; this.theme = k; this.themeT = this.t; }
    // Mario walks along the box he is on, then makes ONE jump to the nearest unvisited box ahead; turns around at the end.
    buildRoute() {
      const m = this.mario, Wu = this.view.Wu;
      this.walk = this.boxes.filter(b => !NOWALK[b.skin] && b.w >= 6);
      if (!this.walk.length) this.walk = [{ x: 8, y: m.by, w: Wu - 16, h: 4, skin: 'blank', virtual: true }];
      for (const b of this.walk) b.bonus = this.actors.filter(a => (ITEM[a.type] || a.type === 'qblock' || a.type === 'spring' || a.type === 'pswitch') && a.bx >= b.x && a.bx <= b.x + b.w && a.by <= b.y + 2 && a.by > b.y - 40).length;
      const home = surfaceUnder(m.bx, m.by, this.walk, 4);
      m.x = m.bx; m.y = m.by; m.cur = { box: home }; m.move = null;
      this.rdir = m.bx < Wu / 2 ? 1 : -1; this.visited = new Set(home ? [home] : []);
      m.big = 0; m.star = 0; m.fire = 0; m.ice = 0; m.leaf = 0; m.mega = 0; m.bounce = 0; m.frame = 'stand'; m.moved = false; m.landT = -9;
      this.redTotal = this.actors.filter(a => a.type === 'redcoin').length; this.redGot = 0; this.trail = []; this.route = this.walk;
    }
    planNext(depth = 0) {
      const m = this.mario, dir = this.rdir, cx = m.x, cur = m.cur && m.cur.box;
      const ahead = b => (dir > 0 ? b.x + b.w - 8 > cx + 6 : b.x + 8 < cx - 6);
      const gapTo = b => Math.max(0, dir > 0 ? b.x - cx : cx - (b.x + b.w));
      let best = null, bs = 1e9;
      for (const b of this.walk) {
        if (b === cur || this.visited.has(b) || !ahead(b) || Math.abs(b.y - m.y) > 130) continue;
        const sc = gapTo(b) + Math.abs(b.y - m.y) * 0.35 - (b.bonus || 0) * 14;
        if (sc < bs) { bs = sc; best = b; }
      }
      if (best) {
        const lo = best.x + 7, hi = best.x + best.w - 7;
        const landX = dir > 0 ? Math.max(lo, Math.min(hi, cx + 22)) : Math.min(hi, Math.max(lo, cx - 22));
        if (cur) {
          let take = Math.max(cur.x + 5, Math.min(cur.x + cur.w - 5, landX - dir * 26));
          take = dir > 0 ? Math.max(cx, take) : Math.min(cx, take);
          if (Math.abs(take - cx) > 6) return { x: take, y: cur.y, box: cur, type: 'walk' };
        }
        this.visited.add(best);
        return { x: landX, y: best.y, box: best, type: 'jump' };
      }
      if (cur) {
        const edge = dir > 0 ? cur.x + cur.w - 7 : cur.x + 7;
        if ((edge - cx) * dir > 6) return { x: edge, y: cur.y, box: cur, type: 'walk' };
      }
      if (depth > 1) return null;
      this.rdir *= -1; this.visited = new Set(cur ? [cur] : []);
      return this.planNext(depth + 1);
    }
    // ---- beat / events ----
    onBeat(b, clock) {
      this.lastBeatT = this.t; this.beatI = b.i; this.period = b.period || this.period;
      if (b.inBar === 0 && this.play && clock.kind !== 'listen') this.setTheme(Math.floor(b.bar / 8) % THEMES.length);
      if (!this.play) return;
      if (clock.kind === 'listen' && b.inBar === 0 && b.bar > 0 && b.bar % 16 === 0) this.setTheme((this.theme + 1) % THEMES.length);
      const m = this.mario;
      if (m && (!m.move || this.t >= m.move.t0 + m.move.dur - 0.03)) this.startMove(b);
      if (m && (m.fire > 0 || m.ice > 0) && b.inBar % 2 === 0) this.fireball();
      const pool = this.actors.filter(a => a.alive && !a.st && ACT[a.type] && a !== this.follower);
      const doAct = () => { if (pool.length) this.activity(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); };
      if (b.inBar === 0) { doAct(); if (b.bar % 2 === 1) doAct(); }
      else if (clock.kind === 'listen' && b.strength > 0.85 && Math.random() < 0.4) doAct();
      let k = 0;
      for (const a of this.actors) {
        if (!a.alive || a.st) continue;
        k++;
        if (a.type === 'bowser' && b.inBar === 0 && b.bar % 2 === 0)
          this.shots.push({ kind: 'flame', x: a.x + a.dir * a.d.w * a.s * 0.35, y: a.y - a.d.h * a.s * 0.62, vx: a.dir * 55, life: 2.6, max: 2.6 });
        if (a.type === 'thwomp' && b.inBar === (k % 2) * 2 && (b.bar + k) % 2 === 0) { a.slamT = this.t; a.landed = false; }
        if (a.type === 'podoboo' && (b.i + k) % 2 === 0) a.jumpT = this.t;
        if (a.type === 'chomp' && b.inBar % 2 === 0) a.lungeT = this.t;
        if (a.type === 'lakitu' && b.inBar === 0 && b.bar % 4 === 1) this.dropSpiny(a);
        if (a.type === 'bobomb' && b.inBar === 0 && (b.bar + k) % 4 === 0 && !a.litT) a.litT = this.t;
        if (a.type === 'hammer') { if (b.inBar === 0) this.shots.push({ kind: 'hammer', x: a.x + a.dir * 4, y: a.y - 20 * a.s, vx: a.dir * rnd(35, 55), vy: -125, rot: 0, life: 1.8, max: 1.8 }); if (b.inBar === 2) a.hopT = this.t; }
        if (a.type === 'blooper' && b.i % 2 === 0) a.dartT = this.t;
      }
      if (b.inBar === 0 && b.bar % 2 === 0) for (const r of this.boxes) if (r.skin === 'q') {
        const rows = Math.max(1, Math.round(r.h / 16)), ts = r.h / rows, cols = Math.max(1, Math.round(r.w / ts)), i = Math.floor(Math.random() * cols);
        r.bumpI = i; r.bumpT = this.t; const cx = r.x + (i + 0.5) * (r.w / cols);
        if (Math.random() < 0.12) this.spawnItem(cx, r.y); else this.popCoin(cx, r.y);
      }
    }
    activity(a) {
      const t = this.t;
      if (a.type === 'qblock') { a.bump = t; if (Math.random() < 0.18) this.spawnItem(a.x, a.y - a.d.h * a.s); else this.popCoin(a.x, a.y - a.d.h * a.s); }
      else if (a.type === 'brick') { a.bump = t; this.sfx('bump'); }
      else if (a.type === 'coin') this.sparks(a.x, a.y - 7 * a.s, 6, [PAL.gold, PAL.white], 26);
      else if (a.type === 'cloud' || a.type === 'bush' || a.type === 'tree' || a.type === 'palm') a.pulseT = t;
      else if (a.type === 'castle') a.glowT = t;
      else if (a.type === 'flag') a.waveT = t;
      else if (a.type === 'dk') { a.hopT = t; a.stompT = t; setTimeout(() => { this.shake = Math.max(this.shake, 0.25); this.sfx('boom'); this.puff(a.x - 8, a.by, 3); this.puff(a.x + 8, a.by, 3); }, 300); }
      else if (a.type === 'rosalina') { a.hopT = t; for (let k = 0; k < 10; k++) this.parts.push({ k: 'spark', x: a.x + rnd(-12, 12), y: a.y - rnd(4, 30), vx: rnd(-8, 8), vy: rnd(-20, -6), g: 0, col: pick([PAL.gold, PAL.white, '#7ad4fc', PAL.pink]), life: rnd(0.6, 1.1), max: 1.1 }); }
      else { a.hopT = t; if (a.type === 'peach' || a.type === 'daisy') this.hearts(a.x, a.y - a.d.h * a.s, 1); }
    }
    onDrop() {
      if (!this.play) return;
      this.flash = 1; this.setTheme((this.theme + 1) % THEMES.length); this.shake = 0.35;
      if (this.mario) this.mario.star = Math.max(this.mario.star, 6);
      for (let k = 0; k < 5; k++) this.firework(rnd(20, this.view.Wu - 20), rnd(20, 90));
      this.sfx('boom');
    }
    // ---- temporary actors (power-ups from blocks, Lakitu's spinies) ----
    spawn(type, x, y, opts = {}) {
      const el = { id: 'tmp', type, x: x / this.view.Wu, y: y / H, s: 1, flip: false };
      const a = this.makeActor(el, x, y);
      a.m = { axis: null, a: 0, b: 0 }; a.temp = true; a.life = opts.life || 10;
      a.fall = { vy: opts.vy || 0, vx: opts.vx || 0, rise: opts.rise || 0, t0: this.t, y0: y };
      this.actors.push(a); return a;
    }
    spawnItem(x, y) {
      const type = pick(['mushroom', 'mushroom', 'star', 'flower', 'oneup']);
      this.spawn(type, x, y, { rise: 16, vx: pick([-22, 22]), life: 11 }); this.sfx('power');
    }
    dropSpiny(lak) { this.spawn('spiny', lak.x, lak.y - 18, { vy: -40, vx: 0, life: 9 }); }
    land(a) {
      const sf = surfaceBelow(a.x, a.fall.lastY, this.boxes);
      if (sf && a.y >= sf.y) {
        a.y = a.by = sf.y; a.bx = a.x; a.o = 0; a.fall = null;
        const hw = a.d.w * a.s / 2;
        if (a.type !== 'flower') { a.m = patrolOn(sf, a.x, hw); a.mdir = pick([-1, 1]); }
        this.puff(a.x, a.y, 2);
      }
    }
    startMove(b) {
      const m = this.mario, to = this.planNext(); if (!to) return;
      const dx = to.x - m.x, dy = to.y - m.y, dist = Math.hypot(dx, dy), period = b.period || 0.5, type = to.type;
      const beats = type === 'walk' ? Math.max(1, Math.round(dist / 22)) : (Math.abs(dx) > 60 || Math.abs(dy) > 40 ? 2 : 1);
      let Hh = 0;
      if (type === 'jump') { const top = Math.min(m.y, to.y), c = Math.max(4, Math.min(14 + Math.abs(dx) * 0.08, top - 8)); Hh = Math.abs(dy) / 2 + c; }
      if (m.leaf > 0) Hh *= 1.3;
      m.move = { x0: m.x, y0: m.y, x1: to.x, y1: to.y, t0: this.t, dur: Math.max(0.2, beats * period * 0.97), type, H: Hh, to };
      if (Math.abs(dx) > 1) m.dir = Math.sign(dx);
      m.moved = true;
    }
    fireball() {
      const m = this.mario; this.sfx('fire');
      this.shots.push({ kind: 'fire', ice: m.ice > 0, x: m.x + m.dir * 6, y: m.y - 8, by: m.y, vx: m.dir * 110, life: 1.1, max: 1.1, ph: 0 });
    }
    addScore(n, x, y) { this.score += n; if (x != null) this.text(x, y, String(n)); }
    courseClear(x, y) {
      this.banner = { text: 'COURSE CLEAR!', t: this.t }; this.sfx('oneup'); this.addScore(5000);
      for (let k = 0; k < 6; k++) setTimeout(() => this.firework(x + rnd(-70, 70), y - rnd(50, 110)), k * 300);
      setTimeout(() => this.setTheme((this.theme + 1) % THEMES.length), 1200);
    }
    // ---- particles ----
    popCoin(x, y) { this.parts.push({ k: 'coin', x, y, vy: -150, life: 0.62, max: 0.62 }); this.sfx('coin'); }
    text(x, y, s, col) { this.parts.push({ k: 'text', x, y, s, col: col || PAL.white, life: 0.9, max: 0.9 }); }
    puff(x, y, n = 4) { for (let i = 0; i < n; i++) this.parts.push({ k: 'puff', x: x + rnd(-5, 5), y: y + rnd(-4, 2), vx: rnd(-14, 14), vy: rnd(-16, -4), life: 0.45, max: 0.45, r: rnd(2, 4) }); }
    sparks(x, y, n, cols, sp = 60) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(sp * 0.4, sp); this.parts.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 60, col: pick(cols), life: rnd(0.4, 0.9), max: 0.9 }); } }
    firework(x, y) { const cols = pick([[PAL.gold, PAL.white], [PAL.red, PAL.orange], [PAL.ugLight, PAL.white], [PAL.lgreen, PAL.gold], [PAL.pink, PAL.white]]); this.sparks(x, y, 30, cols, 75); this.sfx('boom'); }
    hearts(x, y, n = 3) { for (let i = 0; i < n; i++) this.parts.push({ k: 'heart', x: x + rnd(-6, 6), y: y - rnd(0, 6), vy: rnd(-26, -16), life: 1.1, max: 1.1 }); }
    shards(x, y, col) { [[-1, -1], [1, -1], [-1, 0], [1, 0]].forEach(([a, b]) => this.parts.push({ k: 'shard', x, y, vx: a * rnd(25, 45), vy: -70 + b * 30, g: 260, col, rot: 0, life: 0.9, max: 0.9 })); }
    // ---- defeat / collect ----
    defeat(a, how) {
      if (!a.alive || a.st === 'dead') return;
      this.sfx('stomp'); this.addScore(how === 'stomp' ? 100 : 200, a.x, a.y - a.d.h * a.s - 4);
      if (a.type === 'bowser') {
        a.hits = (a.hits || 0) + 1; a.hitT = this.t + 0.5; a.cd = this.t + 1.2;
        if (a.hits >= 3) { a.hits = 0; a.st = 'dead'; a.stT = this.t; a.vy = -60; a.respawn = this.t + 6; this.addScore(5000); for (let k = 0; k < 4; k++) this.firework(a.x + rnd(-30, 30), a.y - rnd(30, 70)); }
        return;
      }
      a.stT = this.t;
      if (how === 'ice') { a.st = 'frozen'; a.respawn = this.t + 5; if (a.temp) a.respawn = 0; this.sparks(a.x, a.y - 8, 10, ['#a8e4fc', PAL.white], 40); return; }
      if (how === 'stomp' && a.type === 'goomba') { a.st = 'squish'; a.respawn = this.t + 3.5; }
      else if (how === 'stomp' && a.type === 'drybones') { a.st = 'crumble'; a.respawn = this.t + 3.2; this.shards(a.x, a.y - 6, '#e8e8e8'); }
      else if (how === 'stomp' && a.type === 'buzzy') { a.st = 'shell'; a.shellV = (this.mario ? this.mario.dir : 1) * 110; a.respawn = this.t + 3.8; }
      else if (how === 'stomp' && a.type === 'koopa') { a.st = 'shell'; a.shellV = (this.mario ? this.mario.dir : 1) * 110; a.respawn = this.t + 3.8; }
      else if (a.type === 'boo') { a.st = 'gone'; this.puff(a.x, a.y - 8, 6); a.respawn = this.t + 4; }
      else { a.st = 'dead'; a.vy = -70; a.respawn = this.t + 4; }
      if (a.temp) a.respawn = 0;
      if (this.mario && how === 'stomp') this.mario.bounce = 1;
    }
    collect(a) {
      const m = this.mario; a.alive = false; a.respawn = a.temp ? 0 : this.t + (a.type === 'coin' ? 5 : 9);
      if (a.type === 'coin') { this.coins++; this.score += 200; this.popCoin(a.x, a.y - 10); this.sparks(a.x, a.y - 7, 6, [PAL.gold, PAL.white], 30); }
      else if (a.type === 'mushroom') { m.big = 10; this.sfx('power'); this.addScore(1000, a.x, a.y - 18); }
      else if (a.type === 'oneup') { this.sfx('oneup'); this.text(a.x, a.y - 18, '1UP', PAL.lgreen); }
      else if (a.type === 'star') { m.star = 8; this.sfx('power'); this.addScore(1000); }
      else if (a.type === 'flower') { m.fire = 10; m.ice = 0; this.sfx('power'); this.addScore(1000, a.x, a.y - 18); }
      else if (a.type === 'iceflower') { m.ice = 10; m.fire = 0; this.sfx('power'); this.addScore(1000, a.x, a.y - 18); }
      else if (a.type === 'leaf') { m.leaf = 12; this.sfx('power'); this.addScore(1000, a.x, a.y - 18); this.puff(m.x, m.y - 8, 4); }
      else if (a.type === 'mega') { m.mega = 6; this.sfx('power'); this.shake = 0.3; this.addScore(1000, a.x, a.y - 18); }
      else if (a.type === 'redcoin') {
        this.redGot++; this.score += 500; this.popCoin(a.x, a.y - 10); this.text(a.x, a.y - 22, this.redGot + '/' + this.redTotal, '#ff6b5e');
        if (this.redGot >= this.redTotal && this.redTotal > 0) { this.redGot = 0; this.banner = { text: 'RED COINS!', t: this.t }; m.star = 8; this.addScore(5000); for (let k = 0; k < 4; k++) setTimeout(() => this.firework(a.x + rnd(-60, 60), a.y - rnd(40, 90)), k * 300); a.respawn = this.t + 12; this.actors.forEach(o => { if (o.type === 'redcoin') { o.alive = false; o.respawn = this.t + 12; } }); }
        else a.respawn = 1e9;
      }
      else if (a.type === 'key') { this.banner = { text: 'KEY GET!', t: this.t }; this.sfx('oneup'); this.actors.forEach(o => { if (o.type === 'door') { o.openT = this.t; this.sparks(o.x, o.y - 16, 16, [PAL.gold, PAL.white], 50); } }); a.respawn = this.t + 15; }
      else if (a.type === 'pmoon') { this.banner = { text: 'POWER MOON!', t: this.t }; this.sfx('oneup'); this.addScore(10000); this.shake = 0.2; for (let k = 0; k < 6; k++) setTimeout(() => this.firework(a.x + rnd(-80, 80), a.y - rnd(40, 100)), k * 260); a.respawn = this.t + 15; }
    }
    // ---- motion ----
    moveActor(a, dt) {
      const mo = a.m, t = this.t; let x = a.bx, y = a.by;
      if (a.fall) {
        const f = a.fall, e = t - f.t0;
        if (f.rise && e < 0.45) { a.x = a.bx; a.y = f.y0 - f.rise * (e / 0.45); f.lastY = a.y; return; }
        if (f.rise && !f.rose) { f.rose = true; f.vy = -60; }
        f.lastY = a.y; f.vy += 320 * dt; a.x += f.vx * dt; a.y += f.vy * dt;
        if (f.vy > 0) this.land(a);
        if (a.y > H + 30) { a.remove = true; }
        if (f.vx) a.dir = Math.sign(f.vx);
        return;
      }
      if (mo && mo.axis) {
        const range = mo.b - mo.a;
        if (a.type === 'bullet') {
          const end = a.dir < 0 ? mo.a : mo.b, len = Math.abs(end) || Math.max(Math.abs(mo.a), Math.abs(mo.b));
          a.o += (a.dir < 0 ? -1 : 1) * SPEED.bullet * dt;
          if (Math.abs(a.o) >= len) { this.puff(a.bx, a.by - 7, 4); a.o = 0; }
        } else if (a.type === 'thwomp') {
          const D = mo.b, e = a.slamT != null ? t - a.slamT : 99;
          a.o = e < 0.18 ? D * Math.pow(e / 0.18, 2) : e < 0.8 ? D : e < 2.2 ? D * (1 - (e - 0.8) / 1.4) : 0;
          if (e >= 0.18 && !a.landed) { a.landed = true; this.shake = Math.max(this.shake, 0.22); this.sfx('boom'); this.puff(a.x - 8, a.by + D, 3); this.puff(a.x + 8, a.by + D, 3); }
        } else if (a.type === 'podoboo') {
          const dur = Math.max(0.5, (this.period || 0.5) * 1.8), e = a.jumpT != null ? (t - a.jumpT) / dur : 9;
          a.o = e < 1 ? mo.a * Math.sin(Math.PI * e) : 0; a.falling = e > 0.5 && e < 1;
          if (e < 1 && Math.random() < 0.4) this.parts.push({ k: 'spark', x: a.x + rnd(-2, 2), y: a.y - 4, vx: 0, vy: 10, g: 0, col: pick([PAL.orange, PAL.gold]), life: 0.3, max: 0.3 });
        } else if (a.type === 'blooper') {
          const darting = a.dartT != null && t - a.dartT < 0.28;
          a.o = clamp(a.o + (darting ? -55 : 9) * dt, mo.a, mo.b); a.darting = darting;
        } else if (a.type === 'chomp') {
          const reach = a.dir < 0 ? mo.a : mo.b || mo.a;
          a.o = reach * pulse(a.lungeT != null ? t - a.lungeT : 9, 0.45);
        } else if (range > 0.5) {
          const sp = (SPEED[a.type] || 14) * (0.7 + (this.energy || 0.5) * 0.6);
          if (FLOAT[a.type] || mo.axis === 'y') {
            a.ph += dt * sp / Math.max(6, range) * Math.PI;
            a.o = mo.a + range * (1 - Math.cos(a.ph)) / 2;
            if (mo.axis === 'x') a.dir = Math.sin(a.ph) >= 0 ? 1 : -1;
          } else if (!(a.pause > t)) {
            a.o += a.mdir * sp * dt;
            if (a.o <= mo.a) { a.o = mo.a; a.mdir = 1; a.pause = t + 0.35; }
            if (a.o >= mo.b) { a.o = mo.b; a.mdir = -1; a.pause = t + 0.35; }
            a.walking = true;
          } else a.walking = false;
          if (mo.axis === 'x' && !FLOAT[a.type]) a.dir = a.mdir;
        }
        if (mo.axis === 'x') x += a.o; else y += a.o;
      }
      if (a.type === 'boo') {
        const m = this.mario; x += Math.sin(t * 0.6 + a.seed) * 4; y += Math.sin(t * 1.6 + a.seed) * 2;
        a.shy = m && Math.abs(m.x - x) < 70 && Math.sign(x - m.x) === m.dir;
        if (m && Math.abs(m.x - x) > 2 && !(mo && mo.axis === 'x')) a.dir = Math.sign(m.x - x);
      } else if (a.type === 'cheep') y += Math.sin(t * 3 + a.seed) * 4;
      else if (a.type === 'lakitu') y += Math.sin(t * 2 + a.seed) * 3;
      else if (a.type === 'chomp') y -= Math.abs(Math.sin(t * 7 + a.seed)) * 2;
      a.x = x; a.y = y;
    }
    // ---- update ----
    update(dt, clock, events) {
      dt = Math.min(dt, 0.05); this.t += dt; const t = this.t;
      for (const e of events) { if (e.type === 'beat') this.onBeat(e, clock); else if (e.type === 'drop') this.onDrop(); }
      this.flash = Math.max(0, this.flash - dt * 1.6); this.shake = Math.max(0, this.shake - dt);
      this.env = Math.max(0, 1 - (t - this.lastBeatT) / 0.24);
      this.energy = clock ? clock.energy : 0.5; this.beatPos = clock ? clock.beatPos : t * 2;
      if (!this.play) return;
      const m = this.mario;
      if (m) {
        if (m.move) {
          const mv = m.move, p = clamp((t - mv.t0) / mv.dur, 0, 1);
          m.x = lerp(mv.x0, mv.x1, p); m.y = lerp(mv.y0, mv.y1, p) - 4 * mv.H * p * (1 - p);
          m.frame = mv.type === 'walk' ? (Math.floor(Math.abs(m.x - mv.x0) / 4) % 2 ? 'walk1' : 'walk2') : 'jump';
          if (p >= 1) { if (mv.type === 'jump') { this.puff(m.x, m.y, 3); m.landT = t;
              if (m.mega > 0) { this.shake = Math.max(this.shake, 0.3); this.sfx('boom'); this.puff(m.x - 10, m.y, 4); this.puff(m.x + 10, m.y, 4);
                for (const o of this.actors) if (o.alive && !o.st && ENEMY[o.type] && o.type !== 'bowser' && Math.abs(o.x - m.x) < 50 && Math.abs(o.y - m.y) < 30) this.defeat(o, 'star'); } } m.cur = { box: mv.to.box }; m.move = null; m.frame = 'stand'; }
        } else m.frame = 'stand';
        m.big = Math.max(0, m.big - dt); m.star = Math.max(0, m.star - dt); m.fire = Math.max(0, m.fire - dt); m.bounce = Math.max(0, m.bounce - dt * 4);
        m.ice = Math.max(0, m.ice - dt); m.leaf = Math.max(0, m.leaf - dt); m.mega = Math.max(0, m.mega - dt);
        if (m.star > 0 && Math.random() < 0.5) this.parts.push({ k: 'spark', x: m.x + rnd(-6, 6), y: m.y - rnd(0, 16), vx: 0, vy: -10, g: 0, col: pick([PAL.gold, PAL.white]), life: 0.4, max: 0.4 });
        this.trail.push({ t, x: m.x, y: m.y, f: m.frame, dir: m.dir });
        while (this.trail.length && t - this.trail[0].t > 2) this.trail.shift();
      }
      const ms = m ? m.s * (m.mega > 0 ? 2.2 : m.big > 0 ? 1.45 : 1) : 1;
      const boing = m && m.boingT != null ? pulse(t - m.boingT, 0.7) * 34 : 0;
      const mr = m ? { x: m.x - 6 * ms, y: m.y - 15 * ms - boing, w: 12 * ms, h: 15 * ms } : null;
      for (const a of this.actors) {
        if (a === m) continue;
        if (a.temp) { a.life -= dt; if (a.life <= 0) { a.remove = true; this.puff(a.x, a.y - 6, 3); continue; } }
        if (!a.alive || a.st) {
          if (a.temp && (!a.alive || t - a.stT > 1.2)) { if (!a.alive || a.st !== 'dead' || a.y > H + 20) a.remove = true; }
          if (a.respawn && t >= a.respawn) { a.alive = true; a.st = ''; a.respawn = 0; a.o = 0; a.ph = 0; a.x = a.bx; a.y = a.by; this.puff(a.x, a.y - 6, 4); }
          if (a.st === 'frozen' && t - a.stT > 1.8) { a.st = 'gone'; this.shards(a.x, a.y - 8, '#a8e4fc'); this.sfx('bump'); }
          if (a.st === 'dead') { a.vy += 300 * dt; a.y += a.vy * dt; }
          if (a.st === 'shell') {
            a.x += a.shellV * dt; if (Math.abs(a.x - a.bx) > 70) a.shellV *= -1;
            for (const o of this.actors) if (o !== a && o.alive && !o.st && STOMPABLE[o.type] && o.type !== 'bowser' && Math.abs(o.x - a.x) < 8 && Math.abs(o.y - a.y) < 8) this.defeat(o, 'shell');
          }
          if (!a.alive || a.st) continue;
        }
        if (a.type === 'bobomb' && a.litT && t - a.litT > (this.period || 0.5) * 4) {
          a.litT = null; this.shake = Math.max(this.shake, 0.3); this.sfx('boom');
          this.sparks(a.x, a.y - 8, 34, [PAL.orange, PAL.gold, PAL.white, PAL.red], 90); this.puff(a.x, a.y - 6, 8);
          a.alive = false; a.respawn = a.temp ? 0 : t + 3; continue;
        }
        if (a === this.follower && m && m.moved && this.trail.length) {
          const target = t - 0.42; let p = this.trail[0];
          for (const q of this.trail) { if (q.t > target) break; p = q; }
          a.x = p.x - p.dir * 3; a.y = p.y; a.frame = p.f; a.dir = p.dir;
        } else this.moveActor(a, dt);
        if (!mr || a.fall) continue;
        const s = a.s, w = a.d.w * s, h = a.d.h * s, ar = { x: a.x - w / 2 + 2, y: a.y - h + 2, w: w - 4, h: h - 4 };
        if (a.type === 'piranha') { const r = this.piranhaRise(a); ar.y += h * (1 - r); ar.h *= r; if (r < 0.5) continue; }
        if (a.type === 'firebar') { if (this.firebarHit(a, mr) && m.star > 0) this.sparks(m.x, m.y - 8, 4, [PAL.gold], 30); continue; }
        if (!overlap(mr, ar) || t < a.cd) continue;
        a.cd = t + 0.8;
        if (ENEMY[a.type]) {
          if (m.star > 0) this.defeat(a, 'star');
          else if (STOMPABLE[a.type]) this.defeat(a, 'stomp');
          else if (a.type === 'spiny') m.bounce = 1.4;
        } else if (ITEM[a.type]) this.collect(a);
        else if (a.type === 'qblock') { a.bump = t; this.addScore(200); if (Math.random() < 0.2) this.spawnItem(a.x, a.y - a.d.h * s); else this.popCoin(a.x, a.y - a.d.h * s); }
        else if (a.type === 'brick') {
          if (this.pswitch > t) { a.alive = false; a.respawn = t + 4; this.coins++; this.score += 200; this.popCoin(a.x, a.y - 8); }
          else { this.shards(a.x, a.y - 8 * s, PAL.brick); this.sfx('bump'); a.alive = false; a.respawn = t + 4; this.addScore(50); }
        }
        else if (a.type === 'spring' || a.type === 'note') { a.compT = t; m.boingT = t; this.sfx('spring'); }
        else if (a.type === 'door') { a.openT = t; a.cd = t + 4; this.sparks(a.x, a.y - 16, 10, [PAL.gold, PAL.white], 40); }
        else if (a.type === 'checkpoint') { if (!a.got) { a.got = true; this.text(a.x, a.y - 44, 'CHECKPOINT', PAL.gold); this.sfx('oneup'); this.addScore(1000); } }
        else if (a.type === 'pswitch') { if (!(this.pswitch > t)) { this.pswitch = t + 7; a.pressT = t; this.sfx('power'); this.shake = 0.15; } }
        else if (a.type === 'flag') { a.flagT = t; a.cd = t + 8; this.courseClear(a.x, a.y); }
        else if (a.type === 'castle') { a.cd = t + 8; a.glowT = t; this.courseClear(a.x, a.y); }
        else if (FRIENDS[a.type]) { a.cd = t + 3; this.hearts(a.x, a.y - h); }
      }
      if (this.actors.some(a => a.remove)) this.actors = this.actors.filter(a => !a.remove);
      for (const sh of this.shots) {
        sh.life -= dt; sh.x += sh.vx * dt;
        if (sh.kind === 'hammer') { sh.vy += 320 * dt; sh.y += sh.vy * dt; sh.rot += dt * 14 * Math.sign(sh.vx); }
        if (sh.kind === 'fire') {
          sh.ph += dt; sh.y = sh.by - 3 - Math.abs(Math.sin(sh.ph * 9)) * 9;
          for (const a of this.actors) if (a.alive && !a.st && ENEMY[a.type] && a.type !== 'bowser' && a.type !== 'thwomp') {
            const w = a.d.w * a.s, h = a.d.h * a.s;
            if (overlap({ x: sh.x - 3, y: sh.y - 3, w: 6, h: 6 }, { x: a.x - w / 2, y: a.y - h, w, h })) { this.defeat(a, sh.ice ? 'ice' : 'fire'); sh.life = 0; this.puff(sh.x, sh.y, 2); }
          }
        }
      }
      this.shots = this.shots.filter(s => s.life > 0);
      for (const p of this.parts) {
        p.life -= dt;
        if (p.k === 'coin') { p.vy += 420 * dt; p.y += p.vy * dt; }
        else if (p.k === 'text') p.y -= 22 * dt;
        else if (p.k === 'heart') { p.y += p.vy * dt; p.x += Math.sin(p.life * 8) * 0.3; }
        else { p.vy = (p.vy || 0) + (p.g || 0) * dt; p.x += (p.vx || 0) * dt; p.y += p.vy * dt; if (p.rot != null) p.rot += dt * 10; }
      }
      this.parts = this.parts.filter(p => p.life > 0);
      if (this.parts.length > 700) this.parts.splice(0, this.parts.length - 700);
    }
    firebarAngle(a) { return ((this.beatPos || 0) / 4) * Math.PI * 2 * (a.dir < 0 ? -1 : 1) + a.seed; }
    firebarBalls(a) {
      const cx = a.x, cy = a.y - 20 * a.s, ang = this.play ? this.firebarAngle(a) : -Math.PI / 4, out = [];
      for (let k = 1; k <= 4; k++) out.push({ x: cx + Math.cos(ang) * k * 4.5 * a.s, y: cy + Math.sin(ang) * k * 4.5 * a.s });
      return out;
    }
    firebarHit(a, mr) { return this.firebarBalls(a).some(p => p.x > mr.x && p.x < mr.x + mr.w && p.y > mr.y && p.y < mr.y + mr.h); }
    piranhaRise(a) {
      if (!this.play) return 1;
      const ph = ((this.beatPos || 0) + (a.seed * 2 | 0) * 2) % 8;
      return ph < 1 ? ph : ph < 5 ? 1 : ph < 6 ? 6 - ph : 0;
    }
    // ---- draw ----
    draw(ctx) {
      const u = this.view.u, t = this.t, P = this.play;
      ctx.save();
      if (this.shake > 0) ctx.translate(rnd(-1, 1) * this.shake * 10 * u, rnd(-1, 1) * this.shake * 10 * u);
      const fx = { t, theme: this.theme, env: P ? this.env : 0, beatI: this.beatI, flash: this.flash, pswitch: this.pswitch > t };
      const xf = clamp((t - this.themeT) / 0.7, 0, 1);
      for (const r of this.boxes) {
        if (xf < 1) { drawBox(ctx, u, r, Object.assign({}, fx, { theme: this.prevTheme })); ctx.globalAlpha = xf; drawBox(ctx, u, r, fx); ctx.globalAlpha = 1; }
        else drawBox(ctx, u, r, fx);
      }
      const half = Math.floor((this.beatPos || 0) * 2) % 2;
      const once = (t0, len) => (t0 != null ? pulse(t - t0, len) : 0);
      for (const a of this.actors) {
        if (!a.alive && a.st !== 'dead') continue;
        const s = a.s, flip = a.dir !== a.face;
        if (a.st === 'dead') { spr(ctx, u, a.type === 'bowser' ? sprites.bowserHit : a.d.img, a.x, a.y, s, flip, { vflip: true }); continue; }
        if (a.st === 'frozen') { spr(ctx, u, a.d.img, a.x, a.y, s, flip); const w = a.d.w * s * u, h = a.d.h * s * u; ctx.fillStyle = 'rgba(168,228,252,0.6)'; ctx.fillRect(a.x * u - w / 2 - u, a.y * u - h - u, w + 2 * u, h + u); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(a.x * u - w / 2, a.y * u - h, w, u); continue; }
        const hop = P ? -once(a.hopT, 0.42) * 8 : 0;
        const blink = a.temp && a.life < 2 && Math.floor(t * 12) % 2 ? { alpha: 0.35 } : null;
        switch (a.type) {
          case 'mario': {
            const big = a.mega > 0 ? 2.2 : a.big > 0 ? 1.45 : 1;
            let set = sprites.hero.mario;
            if (a.star > 0) set = sprites.hero['star' + (1 + Math.floor(t * 16) % 3)]; else if (a.fire > 0) set = sprites.hero.fire; else if (a.ice > 0) set = sprites.hero.ice;
            if (a.leaf > 0) { // raccoon tail
              const tx = a.x - a.dir * 6 * s * big, ty = a.y - 6 * s * big, wag = Math.sin(t * 14) * 1.5;
              ctx.fillStyle = '#883000'; ctx.fillRect((tx - 2 * s * big) * u, (ty + wag) * u, 4 * s * big * u, 3 * s * big * u); ctx.fillStyle = PAL.orange; ctx.fillRect((tx - a.dir * 3 * s * big - 1.5 * s * big) * u, (ty + 1 + wag) * u, 3 * s * big * u, 2 * s * big * u);
            }
            let sx = 1, sy = 1;
            const mv = a.move;
            if (mv && mv.type === 'jump') { const p = (t - mv.t0) / mv.dur; if (p < 0.07) { sx = 1.14; sy = 0.84; } else if (p < 0.5) { sx = 0.93; sy = 1.08; } }
            const lt = t - a.landT; if (lt >= 0 && lt < 0.14) { const k = Math.sin(lt / 0.14 * Math.PI); sx = 1 + 0.16 * k; sy = 1 - 0.18 * k; }
            const boing = a.boingT != null ? pulse(t - a.boingT, 0.7) * 34 : 0;
            spr(ctx, u, set[boing > 1 ? 'jump' : (a.frame || 'stand')], a.x, a.y - a.bounce * 6 - boing, s * big, a.dir !== 1, { sx, sy });
            break;
          }
          case 'luigi': case 'wario': case 'waluigi': {
            const set = sprites.hero[a.type];
            const fr = (a === this.follower && a.frame) || (hop ? 'jump' : a.walking && P ? (Math.floor(Math.abs(a.o) / 4) % 2 ? 'walk1' : 'walk2') : 'stand');
            spr(ctx, u, set[fr], a.x, a.y + hop, s, a.dir !== 1); break;
          }
          case 'toad': case 'yoshi': case 'peach': case 'daisy': case 'toadette': case 'captain': case 'yoshiRed': case 'yoshiBlue':
            spr(ctx, u, a.d.img, a.x, a.y + hop, s, flip, blink); break;
          case 'rosalina': spr(ctx, u, a.d.img, a.x, a.y + hop * 1.4 - (P ? (Math.sin(t * 2 + a.seed) + 1) * 1.2 : 0), s, flip); break;
          case 'dk': { const st = P ? once(a.stompT, 0.5) : 0; spr(ctx, u, a.d.img, a.x, a.y + hop * 0.8, s, flip, { sx: 1 + st * 0.08, sy: 1 - st * 0.06 }); break; }
          case 'goomba': spr(ctx, u, sprites.goomba[P && a.m.axis ? half : 0], a.x, a.y, s, false, a.st === 'squish' ? { sy: 0.45 } : blink); break;
          case 'koopa':
            if (a.st === 'shell') spr(ctx, u, sprites.shell, a.x, a.y, s, false);
            else spr(ctx, u, sprites.koopa[P && a.m.axis ? half : 0], a.x, a.y, s, flip);
            break;
          case 'buzzy': spr(ctx, u, a.st === 'shell' ? sprites.buzzyShell : sprites.buzzy, a.x, a.y - (P && a.walking && a.st !== 'shell' ? half : 0), s, a.st === 'shell' ? false : flip, blink); break;
          case 'shyguy': spr(ctx, u, sprites.shyguy, a.x, a.y - (P && a.walking ? half : 0), s, flip, blink); break;
          case 'bobomb': { const lit = a.litT && Math.floor(t * (6 + (t - a.litT) * 6)) % 2; spr(ctx, u, lit ? sprites.bobombLit : sprites.bobomb, a.x, a.y - (P && a.walking ? half : 0), s, flip, lit ? { sx: 1.06, sy: 1.06 } : blink);
            if (a.litT && Math.random() < 0.6) this.parts.push({ k: 'spark', x: a.x + rnd(-1, 1), y: a.y - 15 * s, vx: rnd(-10, 10), vy: rnd(-20, -5), g: 0, col: pick([PAL.gold, PAL.white]), life: 0.25, max: 0.25 }); break; }
          case 'blooper': spr(ctx, u, sprites.blooper, a.x, a.y, s, false, a.darting ? { sx: 0.82, sy: 1.15 } : { sx: 1.06, sy: 0.96 }); break;
          case 'hammer': spr(ctx, u, sprites.hammer, a.x, a.y + hop * 0.7, s, flip); break;
          case 'drybones': spr(ctx, u, sprites.drybones[P && a.walking ? half : 0], a.x, a.y, s, flip, a.st === 'crumble' ? { sy: 0.3, sx: 1.2 } : blink); break;
          case 'spiny': spr(ctx, u, sprites.spiny, a.x, a.y - (P && a.walking ? half : 0), s, flip, blink); break;
          case 'boo': spr(ctx, u, a.d.img, a.x, a.y, s, flip, { alpha: a.shy ? 0.35 : 0.92 }); break;
          case 'piranha': {
            const r = this.piranhaRise(a), w = a.d.w * s * u, h = a.d.h * s * u;
            ctx.save(); ctx.beginPath(); ctx.rect(a.x * u - w, a.y * u - h - 4 * u, w * 2, h + 4 * u); ctx.clip();
            spr(ctx, u, sprites.piranha[P ? half : 0], a.x, a.y + (1 - r) * a.d.h * s, s, flip); ctx.restore(); break;
          }
          case 'bowser': spr(ctx, u, a.hitT && t < a.hitT && Math.floor(t * 20) % 2 ? sprites.bowserHit : sprites.bowser, a.x, a.y, s, flip); break;
          case 'cheep': spr(ctx, u, sprites.cheep, a.x, a.y, s, flip, { rot: P ? Math.sin(t * 3 + a.seed) * 0.15 : 0 }); break;
          case 'thwomp': {
            const e = a.slamT != null ? t - a.slamT : 99, sq = e > 0.18 && e < 0.32 ? Math.sin((e - 0.18) / 0.14 * Math.PI) : 0;
            spr(ctx, u, sprites.thwomp, a.x, a.y, s, false, { sx: 1 + sq * 0.08, sy: 1 - sq * 0.08 }); break;
          }
          case 'podoboo': if (!P || a.jumpT == null || (t - a.jumpT) < Math.max(0.5, this.period * 1.8)) spr(ctx, u, sprites.podoboo, a.x, a.y, s, false, { vflip: a.falling }); break;
          case 'chomp': {
            const sx0 = a.bx * u, sy0 = (a.by - 2) * u, ex = a.x * u, ey = (a.y - 8 * s) * u;
            ctx.fillStyle = '#6b3a10'; ctx.fillRect(sx0 - 1.5 * u, sy0 - 4 * u, 3 * u, 6 * u);
            for (let k = 1; k <= 4; k++) { const q = k / 5, lx = lerp(sx0, ex, q), ly = lerp(sy0 - 3 * u, ey, q) + Math.sin(q * Math.PI) * 3 * u;
              ctx.fillStyle = '#7c7c94'; ctx.fillRect(lx - 1.5 * u, ly - 1.5 * u, 3 * u, 3 * u); ctx.fillStyle = '#c8c8dc'; ctx.fillRect(lx - u, ly - 1.5 * u, u, u); }
            spr(ctx, u, sprites.chomp[P && (a.lungeT != null && t - a.lungeT < 0.45 ? half : 1) ? 0 : 1], a.x, a.y, s, flip); break;
          }
          case 'lakitu': spr(ctx, u, sprites.lakitu, a.x, a.y, s, flip); break;
          case 'firebar': {
            const cx = a.x, cy = a.y - 20 * s;
            ctx.drawImage(tiles.used, (cx - 6 * s) * u, (cy - 6 * s) * u, 12 * s * u, 12 * s * u);
            for (const p of this.firebarBalls(a)) { const r = 2.2 * s; ctx.fillStyle = PAL.red; ctx.fillRect((p.x - r) * u, (p.y - r) * u, 2 * r * u, 2 * r * u); ctx.fillStyle = PAL.orange; ctx.fillRect((p.x - r * 0.6) * u, (p.y - r * 0.6) * u, 1.2 * r * u, 1.2 * r * u); ctx.fillStyle = PAL.gold; ctx.fillRect((p.x - 0.5) * u, (p.y - 0.5) * u, u, u); }
            break;
          }
          case 'qblock': case 'brick': {
            if (a.type === 'brick' && this.pswitch > t) { spr(ctx, u, sprites.coin, a.x, a.y - 1 * s, s, false, { sx: Math.max(0.15, Math.abs(Math.cos(t * 4 + a.seed))) }); break; }
            const img = a.type === 'brick' ? tiles.brick[this.theme] : tiles.q[[0, 0, 0, 1, 2, 1][Math.floor(t * 7) % 6]];
            spr(ctx, u, img, a.x, a.y - once(a.bump, 0.2) * 4, s, false); break;
          }
          case 'coin': spr(ctx, u, sprites.coin, a.x, a.y, s, false, { sx: Math.max(0.12, Math.abs(Math.cos(t * 3.4 + a.seed))) }); break;
          case 'star': spr(ctx, u, sprites.star[Math.floor(t * 10) % 3], a.x, a.y - (Math.sin(t * 2 + a.seed) + 1) * 1.2, s, false, blink); break;
          case 'flower': spr(ctx, u, sprites.flower[Math.floor(t * 6) % 2], a.x, a.y, s, false, blink); break;
          case 'mushroom': case 'oneup': case 'mega': spr(ctx, u, a.d.img, a.x, a.y, s, false, blink); break;
          case 'leaf': spr(ctx, u, sprites.leaf, a.x + Math.sin(t * 2 + a.seed) * 2, a.y, s, false, { rot: Math.sin(t * 2 + a.seed) * 0.25 }); break;
          case 'iceflower': spr(ctx, u, sprites.iceflower[Math.floor(t * 6) % 2], a.x, a.y, s, false, blink); break;
          case 'redcoin': spr(ctx, u, sprites.redcoin, a.x, a.y, s, false, { sx: Math.max(0.12, Math.abs(Math.cos(t * 3.4 + a.seed))) }); break;
          case 'key': spr(ctx, u, sprites.key, a.x, a.y - (Math.sin(t * 2.2 + a.seed) + 1) * 1.5, s, false); break;
          case 'pmoon': {
            const by = a.y - (Math.sin(t * 2 + a.seed) + 1) * 2, g = 0.25 + 0.15 * Math.sin(t * 4);
            ctx.save(); ctx.globalAlpha = g; ctx.fillStyle = PAL.gold; const R = (10 + Math.sin(t * 4) * 1.5) * s * u; ctx.beginPath(); ctx.arc(a.x * u, (by - 7.5 * s) * u, R, 0, 7); ctx.fill(); ctx.restore();
            spr(ctx, u, sprites.pmoon, a.x, by, s, false, { rot: Math.sin(t * 1.5) * 0.12 }); break;
          }
          case 'note': { const c = Math.max(P ? this.env : 0, once(a.compT, 0.35)); spr(ctx, u, sprites.note, a.x, a.y - c * 3, s, false, { sy: 1 - c * 0.14, sx: 1 + c * 0.08 }); break; }
          case 'palm': { const pz = once(a.pulseT, 0.9); spr(ctx, u, a.d.img, a.x, a.y, s, flip, { rot: Math.sin(t * 0.8 + a.seed) * 0.02 + Math.sin(t * 9) * 0.03 * pz }); break; }
          case 'snowman': spr(ctx, u, a.d.img, a.x, a.y + hop * 0.6, s, flip); break;
          case 'door': {
            spr(ctx, u, a.d.img, a.x, a.y, s, false);
            const op = a.openT != null && t - a.openT < 4 ? clamp((t - a.openT) / 0.3, 0, 1) * clamp((4 - (t - a.openT)) / 0.4, 0, 1) : 0;
            if (op > 0) { const X = (a.x - 7 * s) * u, Y = (a.y - 24 * s) * u; ctx.fillStyle = '#000'; ctx.fillRect(X, Y, 14 * s * u * op, 24 * s * u); ctx.fillStyle = 'rgba(252,216,80,' + (0.35 * op).toFixed(3) + ')'; ctx.fillRect(X, Y, 14 * s * u * op, 24 * s * u); }
            break;
          }
          case 'checkpoint': {
            spr(ctx, u, a.d.img, a.x, a.y, s, false);
            if (a.got) { const X = (a.x - 7 * s) * u, Y = (a.y - 40 * s) * u; ctx.fillStyle = PAL.red; ctx.fillRect(X + 4 * s * u, Y + 3 * s * u, 9 * s * u, 7 * s * u); ctx.fillStyle = PAL.white; ctx.fillRect(X + 7 * s * u, Y + 5 * s * u, 3 * s * u, 3 * s * u); }
            break;
          }
          case 'lamp': {
            const g = 0.18 + (P ? this.env * 0.3 : 0.1), cx = a.x * u, cy = (a.y - 37.5 * s) * u, R = 22 * s * u;
            const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, 'rgba(252,232,160,' + g.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(252,232,160,0)');
            ctx.fillStyle = gr; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R); spr(ctx, u, a.d.img, a.x, a.y, s, false); break;
          }
          case 'stars': spr(ctx, u, a.d.img, a.x, a.y, s, flip, { alpha: 0.55 + 0.45 * Math.abs(Math.sin(t * 1.7 + a.seed)) }); break;
          case 'spring': { const c = once(a.compT, 0.35); spr(ctx, u, sprites.spring, a.x, a.y, s, false, { sy: 1 - c * 0.45, sx: 1 + c * 0.1 }); break; }
          case 'pswitch': spr(ctx, u, sprites.pswitch, a.x, a.y, s, false, this.pswitch > t ? { sy: 0.4 } : null); break;
          case 'cloud': { const pz = once(a.pulseT, 0.5); spr(ctx, u, a.d.img, a.x + Math.sin(t * 0.4 + a.seed) * 3, a.y, s, flip, { sx: 1 + pz * 0.06, sy: 1 + pz * 0.06 }); break; }
          case 'bush': { const pz = once(a.pulseT, 0.4); spr(ctx, u, a.d.img, a.x, a.y, s, flip, { sx: 1 + pz * 0.06, sy: 1 - pz * 0.08 }); break; }
          case 'tree': { const pz = once(a.pulseT, 0.8); spr(ctx, u, a.d.img, a.x, a.y, s, flip, { rot: Math.sin(t * 9) * 0.03 * pz }); break; }
          case 'flag': {
            spr(ctx, u, sprites.flag, a.x, a.y, s, false);
            const p = a.flagT ? clamp((t - a.flagT) / 1.1, 0, 1) * (t - a.flagT < 5 ? 1 : 0) : 0;
            const cy = a.y - (88 - 10) * s + p * 62 * s + 11 * s, wv = a.waveT && t - a.waveT < 1.2 ? 14 : 5;
            spr(ctx, u, sprites.flagCloth, a.x - 4.5 * s, cy, s, false, { sx: 1 + Math.sin(t * wv) * 0.07 });
            break;
          }
          case 'castle': {
            spr(ctx, u, a.d.img, a.x, a.y, s, flip);
            const g = P ? once(a.glowT, 1.2) : 0;
            if (g > 0) { ctx.fillStyle = 'rgba(252,216,80,' + (g * 0.85).toFixed(3) + ')'; const X = (a.x - 32 * s) * u, Y = (a.y - 56 * s) * u;
              ctx.fillRect(X + 26 * s * u, Y + 44 * s * u, 12 * s * u, 12 * s * u); ctx.fillRect(X + 22 * s * u, Y + 12 * s * u, 4 * s * u, 8 * s * u); ctx.fillRect(X + 38 * s * u, Y + 12 * s * u, 4 * s * u, 8 * s * u); }
            break;
          }
          default: spr(ctx, u, a.d.img, a.x, a.y, s, flip);
        }
      }
      for (const sh of this.shots) {
        const a = clamp(sh.life / 0.3, 0, 1);
        ctx.globalAlpha = a;
        if (sh.kind === 'fire' && sh.ice) { ctx.fillStyle = '#3cbcfc'; ctx.fillRect((sh.x - 2) * u, (sh.y - 2) * u, 4 * u, 4 * u); ctx.fillStyle = PAL.white; ctx.fillRect((sh.x - 1) * u, (sh.y - 1) * u, 2 * u, 2 * u); }
        else if (sh.kind === 'hammer') { ctx.save(); ctx.translate(sh.x * u, sh.y * u); ctx.rotate(sh.rot); ctx.fillStyle = '#883000'; ctx.fillRect(-u, -u, 2 * u, 6 * u); ctx.fillStyle = PAL.gray; ctx.fillRect(-3 * u, -4 * u, 6 * u, 4 * u); ctx.fillStyle = PAL.white; ctx.fillRect(-3 * u, -4 * u, 6 * u, u); ctx.restore(); }
        else if (sh.kind === 'fire') { ctx.fillStyle = PAL.orange; ctx.fillRect((sh.x - 2) * u, (sh.y - 2) * u, 4 * u, 4 * u); ctx.fillStyle = PAL.gold; ctx.fillRect((sh.x - 1) * u, (sh.y - 1) * u, 2 * u, 2 * u); }
        else { const fl = Math.floor(t * 12) % 2;
          ctx.fillStyle = PAL.red; ctx.fillRect((sh.x - 7) * u, (sh.y - 2 - fl) * u, 14 * u, (4 + fl) * u);
          ctx.fillStyle = PAL.orange; ctx.fillRect((sh.x - 5) * u, (sh.y - 1) * u, 10 * u, 2 * u);
          ctx.fillStyle = PAL.gold; ctx.fillRect((sh.x + Math.sign(sh.vx) * 3 - 1) * u, (sh.y - 1) * u, 3 * u, 2 * u); }
        ctx.globalAlpha = 1;
      }
      for (const p of this.parts) {
        const a = clamp(p.life / p.max * 1.6, 0, 1);
        ctx.globalAlpha = a;
        if (p.k === 'coin') spr(ctx, u, sprites.coin, p.x, p.y, 1, false, { sx: Math.max(0.15, Math.abs(Math.cos(p.life * 18))) });
        else if (p.k === 'text') A.drawText(ctx, p.s, Math.round((p.x - A.textWidth(p.s, 1) / 2) * u), Math.round(p.y * u), Math.max(1, Math.round(u)), p.col, '#000');
        else if (p.k === 'puff') { const r = Math.max(1, Math.round(p.r * (1.5 - p.life / p.max))), q = u; ctx.fillStyle = '#fcfcfc'; ctx.globalAlpha = a * 0.85; const X = p.x * u, Y = p.y * u; ctx.fillRect(X - r * q, Y - (r - 1) * q, 2 * r * q, (2 * r - 2) * q); ctx.fillRect(X - (r - 1) * q, Y - r * q, (2 * r - 2) * q, 2 * r * q); }
        else if (p.k === 'heart') { ctx.fillStyle = '#ff4b6e'; const X = p.x * u, Y = p.y * u, q = u;
          ctx.fillRect(X - 2 * q, Y - 2 * q, 2 * q, 2 * q); ctx.fillRect(X + q, Y - 2 * q, 2 * q, 2 * q); ctx.fillRect(X - 3 * q, Y - q, 7 * q, 2 * q); ctx.fillRect(X - 2 * q, Y + q, 5 * q, q); ctx.fillRect(X - q, Y + 2 * q, 3 * q, q); }
        else if (p.k === 'shard') { ctx.save(); ctx.translate(p.x * u, p.y * u); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-2 * u, -2 * u, 4 * u, 4 * u); ctx.restore(); }
        else { ctx.fillStyle = p.col; ctx.fillRect(p.x * u - u * 0.8, p.y * u - u * 0.8, u * 1.6, u * 1.6); }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      if (P && this.hud) this.drawHud(ctx, u);
      if (P && this.banner && t - this.banner.t < 2.6) {
        const k = t - this.banner.t, sc = Math.max(1, Math.round(u * 2)), w = A.textWidth(this.banner.text, sc);
        const y = this.view.u * 70 - Math.max(0, 1 - k / 0.3) * 30 * u;
        ctx.globalAlpha = Math.min(1, (2.6 - k) / 0.4);
        A.drawText(ctx, this.banner.text, Math.round(this.view.Wu * u / 2 - w / 2), Math.round(y), sc, Math.floor(t * 8) % 2 ? PAL.gold : PAL.white, '#000');
        ctx.globalAlpha = 1;
      }
    }
    drawHud(ctx, u) {
      const sc = Math.max(1, Math.round(u)), x = 8 * u, y = 8 * u;
      spr(ctx, u, sprites.coin, 12, 8 + 14 * 0.7, 0.7, false, { sx: Math.max(0.2, Math.abs(Math.cos(this.t * 3))) });
      A.drawText(ctx, 'x' + String(this.coins).padStart(2, '0'), Math.round(x + 10 * u), Math.round(y + 2 * u), sc, PAL.white, '#000');
      A.drawText(ctx, String(this.score).padStart(6, '0'), Math.round(x + 40 * u), Math.round(y + 2 * u), sc, PAL.white, '#000');
    }
  }

  // ---------------------------------------------------------------- random builder ("Build it for me")
  function generate(layout, aspect) {
    const Wu = H * aspect, els = [], R = rnd;
    let boxes = layout.boxes.map(b => Object.assign({}, b));
    const fresh = boxes.length === 0 || !!layout.auto;
    if (fresh) boxes = [];
    const U = () => boxes.map(b => boxU(b, Wu));
    const addBox = (x, y, w, h, skin) => boxes.push({ id: newId('b'), x: x / Wu, y: y / H, w: w / Wu, h: h / H, skin });
    let groundY = null, gap = null, gapSkin = null;
    if (fresh) {
      const gh = 16; groundY = H - gh;
      if (Math.random() < 0.55) {
        const gx = R(0.38, 0.6) * Wu, gw = R(30, 44);
        addBox(0, groundY, gx, gh, 'ground'); addBox(gx + gw, groundY, Wu - gx - gw, gh, 'ground');
        gapSkin = Math.random() < 0.5 ? 'lava' : 'water'; addBox(gx, H - 10, gw, 10, gapSkin); gap = [gx, gx + gw];
      } else addBox(0, groundY, Wu, gh, 'ground');
      const n = 4 + Math.floor(Math.random() * 3);
      for (let k = 0, tries = 0; k < n && tries < 300; tries++) {
        const w = R(40, 92), h = pick([12, 14, 16]), x = R(8, Wu - w - 8), y = R(36, groundY - 46);
        const r = { x: x - 14, y: y - 30, w: w + 28, h: h + 52 };
        if (U().some(b => overlap(r, b))) continue;
        addBox(x, y, w, h, pick(['brick', 'brick', 'q', 'stone', 'cloud', 'neon', 'brick', 'gold', 'ice', 'grass', 'mushroom', 'bridge', 'rainbow', 'castle'])); k++;
      }
      const np = 1 + Math.floor(Math.random() * 2);
      for (let k = 0, tries = 0; k < np && tries < 200; tries++) {
        const w = 26, h = R(26, 42), x = R(18, Wu - 44), y = groundY - h;
        if (gap && x + w > gap[0] - 6 && x < gap[1] + 6) continue;
        if (U().some(b => overlap({ x: x - 10, y: y - 26, w: w + 20, h: h + 26 }, b) && b.y < groundY)) continue;
        addBox(x, y, w, h, 'pipe'); k++;
      }
    } else {
      boxes.forEach(b => {
        const r = boxU(b, Wu);
        if (r.h > r.w * 1.25 && r.w < 50) b.skin = Math.random() < 0.7 ? 'pipe' : pick(['brick', 'stone']);
        else if (r.y + r.h > H - 6 && r.w > 80) b.skin = pick(['ground', 'ground', 'brick']);
        else b.skin = pick(['brick', 'brick', 'q', 'stone', 'cloud', 'neon', 'ground', 'gold', 'ice', 'grass', 'mushroom', 'bridge', 'rainbow', 'castle']);
      });
    }
    const UB = U(), surfaces = UB.filter(b => !NOWALK[b.skin]).sort((a, b) => a.x - b.x);
    const rects = [];
    const fits = (type, x, y, s) => {
      const d = BY_TYPE[type], w = d.w * s, h = d.h * s, r = { x: x - w / 2, y: y - h, w, h };
      if (r.x < 2 || r.x + r.w > Wu - 2 || r.y < 2) return false;
      if (UB.some(b => overlap({ x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 }, b))) return false;
      const world = d.cat === 'world';
      return !rects.some(q => !(world && q.world) && overlap(r, q));
    };
    const add = (type, x, y, opt = {}) => {
      const s = opt.s || 1;
      if (!opt.force && !fits(type, x, y, s)) return false;
      const d = BY_TYPE[type]; rects.push({ x: x - d.w * s / 2, y: y - d.h * s, w: d.w * s, h: d.h * s, world: d.cat === 'world' });
      els.push({ id: newId('e'), type, x: x / Wu, y: y / H, s, flip: !!opt.flip }); return true;
    };
    // Mario first: leftmost surface (or bottom-left if nothing).
    const ms = surfaces[0];
    const mx = ms ? ms.x + Math.min(14, ms.w / 2) : 20, my = ms ? ms.y : H - 8;
    add('mario', mx, my, { force: true });
    if (Math.random() < 0.55) add('luigi', mx + 16, my);
    // scenery on the ground
    if (groundY != null) {
      const gl = surfaces.find(b => b.skin === 'ground');
      if (Math.random() < 0.8) add('hill', R(30, Wu * 0.3), groundY);
      if (Math.random() < 0.75 && fits('castle', Wu - 40, groundY, 1)) { add('castle', Wu - 40, groundY); if (Math.random() < 0.7) add('flag', Wu - 92, groundY); }
      for (let k = 0; k < 2; k++) add('bush', R(30, Wu - 40), groundY);
      void gl;
    }
    for (let k = 0, n = 2 + Math.floor(Math.random() * 2), tries = 0; k < n && tries < 40; tries++) if (add('cloud', R(24, Wu - 24), R(26, 48))) k++;
    // per-surface roles
    let enemies = 0;
    surfaces.forEach((b, idx) => {
      if (b === ms) return;
      if (b.skin === 'pipe') { if (Math.random() < 0.7) add('piranha', b.x + b.w / 2, b.y, { force: true }); return; }
      if (b.w >= 46 && Math.random() < 0.6) { if (add(pick(['goomba', 'goomba', 'koopa', 'buzzy', 'shyguy', 'drybones', 'bobomb']), b.x + b.w * R(0.45, 0.8), b.y)) enemies++; }
      if (b.w >= 40 && Math.random() < 0.55) {
        const n = Math.min(5, Math.floor((b.w - 8) / 12)), x0 = b.x + b.w / 2 - (n - 1) * 6;
        for (let i = 0; i < n; i++) add('coin', x0 + i * 12, b.y - 20);
      }
      if (b.y > 56 && Math.random() < 0.35) add(pick(['qblock', 'qblock', 'brick']), b.x + b.w / 2, b.y - 34);
      void idx;
    });
    // Few mapped surfaces? Fill the air with floating blocks and coin rows so it still feels like a level.
    if (surfaces.length < 4) {
      for (let k = 0, tries = 0; k < 4 - surfaces.length && tries < 30; tries++) {
        const x = R(30, Wu - 60), y = R(50, 120), n = 3 + Math.floor(Math.random() * 3);
        if (!fits('brick', x, y, 1) || !fits('brick', x + (n - 1) * 16, y, 1)) continue;
        for (let i = 0; i < n; i++) add(i === Math.floor(n / 2) ? 'qblock' : pick(['brick', 'brick', 'qblock']), x + i * 16, y, { force: true });
        for (let i = 0; i < n; i++) add('coin', x + i * 16, y - 22);
        k++;
      }
    }
    if (!enemies && surfaces.length > 1) { const b = surfaces[surfaces.length - 1]; add('goomba', b.x + b.w / 2, b.y); }
    // Bowser on the highest wide surface
    const tall = surfaces.filter(b => b !== ms && b.skin !== 'pipe' && b.w >= 34).sort((a, b) => a.y - b.y)[0];
    if (tall && Math.random() < 0.75) add('bowser', tall.x + tall.w - 14, tall.y);
    // power-ups + friends
    const plat = surfaces.filter(b => b !== ms && b.skin !== 'pipe');
    for (let k = 0; k < 2 && plat.length; k++) { const b = pick(plat); add(pick(['star', 'mushroom', 'flower', 'oneup', 'leaf', 'iceflower', 'mega']), b.x + R(10, Math.max(11, b.w - 10)), b.y); }
    if (plat.length && Math.random() < 0.85) { const b = pick(plat); add(pick(['toad', 'peach', 'yoshi', 'daisy', 'rosalina', 'toadette', 'captain', 'dk', 'yoshiRed', 'yoshiBlue']), b.x + R(10, Math.max(11, b.w - 10)), b.y); }
    const tryAdd = (type, fx, fy, n = 10) => { for (let k = 0; k < n; k++) if (add(type, fx(), fy())) return true; return false; };
    // newer friends & foes
    const grounds = surfaces.filter(b => b.skin === 'ground');
    const gpick = () => grounds.length ? pick(grounds) : null;
    if (gap && gapSkin === 'lava') add('podoboo', (gap[0] + gap[1]) / 2, H - 10, { force: true });
    if (gap && gapSkin === 'water') add('blooper', (gap[0] + gap[1]) / 2, H - 14, { force: true });
    const onPlat = (type, minW = 0) => { const ps = plat.filter(p => p.w >= minW); if (!ps.length) return false; let b; return tryAdd(type, () => { b = pick(ps); return b.x + R(10, Math.max(11, b.w - 10)); }, () => b.y); };
    const onGround = type => { if (!grounds.length) return false; let g; return tryAdd(type, () => { g = gpick(); return g.x + R(24, Math.max(25, g.w - 24)); }, () => g.y); };
    if (Math.random() < 0.55 && plat.length) { let b; tryAdd('thwomp', () => { b = pick(plat); return b.x + R(12, Math.max(13, b.w - 12)); }, () => b.y - R(44, 58)); }
    if (Math.random() < 0.45) { const ps = plat.filter(p => p.w >= 40); if (ps.length) { const b = pick(ps); add('firebar', b.x + b.w / 2, b.y); } }
    if (Math.random() < 0.55) onGround('chomp');
    if (Math.random() < 0.45) tryAdd('lakitu', () => R(Wu * 0.2, Wu * 0.8), () => R(30, 48));
    if (Math.random() < 0.5) onGround('spring');
    if (Math.random() < 0.4) onPlat('pswitch');
    if (Math.random() < 0.45) onPlat('hammer', 30);
    if (Math.random() < 0.35) onPlat(pick(['wario', 'waluigi']));
    // red coins, note blocks, key + door, power moon
    if (Math.random() < 0.35 && plat.length) { const n = 3 + Math.floor(Math.random() * 3); for (let k = 0; k < n; k++) onPlat('redcoin'); }
    if (Math.random() < 0.35) { let x0, y0; for (let k = 0; k < 10; k++) { x0 = R(30, Wu - 60); y0 = R(60, 120); if (fits('note', x0, y0, 1) && fits('note', x0 + 32, y0, 1)) { for (let i = 0; i < 3; i++) add('note', x0 + i * 16, y0, { force: true }); break; } } }
    if (Math.random() < 0.3 && grounds.length && plat.length) { if (onGround('door')) onPlat('key'); }
    if (Math.random() < 0.18 && plat.length) onPlat('pmoon');
    // scenery mood
    const mood = pick(['day', 'day', 'night', 'desert', 'snow', 'beach']);
    if (mood === 'night') { tryAdd('nightmoon', () => R(Wu * 0.6, Wu - 20), () => R(26, 40), 6); for (let k = 0; k < 3; k++) tryAdd('stars', () => R(30, Wu - 30), () => R(24, 56), 6); if (grounds.length) onGround('lamp'); }
    if (mood === 'desert' && grounds.length) { onGround('cactus'); onGround('cactus'); }
    if (mood === 'snow' && grounds.length) onGround('snowman');
    if (mood === 'beach' && grounds.length) { onGround('palm'); onGround('palm'); }
    if (Math.random() < 0.4 && grounds.length) onGround('checkpoint');
    if (groundY != null) {
      tryAdd('sign', () => mx + R(20, 34), () => groundY, 4);
      const nt = 1 + Math.floor(Math.random() * 2); for (let k = 0; k < nt; k++) tryAdd('tree', () => R(20, Wu - 20), () => groundY, 6);
      if (Math.random() < 0.6) tryAdd('fence', () => R(30, Wu - 30), () => groundY, 6);
    }
    // air
    if (Math.random() < 0.45) add('boo', R(Wu * 0.3, Wu - 30), R(40, 90));
    if (Math.random() < 0.45) add('bullet', Wu - 16, R(28, 80));
    if (gap && gapSkin === 'water') add('cheep', (gap[0] + gap[1]) / 2 + 10, H - 22);
    return { v: 1, boxes, els, pin: layout.pin, auto: fresh };
  }

  MW.Engine = { Game, motionOf, defaultMotion, surfaceBelow, drawBox, spr, boxU, elRectU, surfaceUnder, generate, newId, overlap, H };
})(window);
