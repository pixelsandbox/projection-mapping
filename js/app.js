// Mario Wall — app shell: screens, stage (with 4-corner projector fit), player, home demo, storage.
(function (g) {
  'use strict';
  const MW = g.MW;
  const { Engine, Audio, Editor, Art } = MW;
  const $ = s => document.querySelector(s);
  const H = 180;
  const ID_PIN = [[0, 0], [1, 0], [1, 1], [0, 1]];

  // ------------------------------------------------------------------ icons (inline SVG)
  const P = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><path d="M4 4l16 16"/>',
    box: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M12 9v6M9 12h6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    clear: '<path d="M20 20H9l-6-6 10-10 8 8-6 6"/><path d="M8 9l7 7"/>',
    pin: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
    magnet: '<path d="M5 4v7a7 7 0 0014 0V4h-4v7a3 3 0 01-6 0V4z"/><path d="M5 8h4M15 8h4"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 17v5"/>',
    file: '<path d="M4 5a1 1 0 011-1h5l2 2h7a1 1 0 011 1v11a1 1 0 01-1 1H5a1 1 0 01-1-1z"/><path d="M12 10v6M9 13l3-3 3 3"/>',
    vol: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/>',
    volx: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>',
    full: '<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/>',
    edit: '<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    flip: '<path d="M12 3v18"/><path d="M8 7l-5 5 5 5z"/><path d="M16 7l5 5-5 5z"/>',
    minus: '<path d="M5 12h14"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', check: '<path d="M5 12l5 5L20 7"/>',
    reset: '<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    glow: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    hud: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h2M7 12h5M15 9h2v3h-2z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5"/><path d="M12 17h.01"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    micoff: '<path d="M15 10V5a3 3 0 00-5.7-1.3"/><path d="M9 9v2a3 3 0 005.1 2.1"/><path d="M5 10a7 7 0 0011.7 5.2M19 10a7 7 0 01-.6 2.8M12 17v5"/><path d="M3 3l18 18"/>',
    still: '<circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="8"/>',
    horiz: '<path d="M3 12h18"/><path d="M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
    vert: '<path d="M12 3v18"/><path d="M8 7l4-4 4 4M8 17l4 4 4-4"/>',
    auto: '<path d="M12 3a9 9 0 109 9"/><path d="M21 3v6h-6"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>',
  };
  const icon = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  // ------------------------------------------------------------------ homography (corner fit)
  function solve(A, b) {
    const n = b.length;
    for (let i = 0; i < n; i++) A[i].push(b[i]);
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
    }
    return A.map((row, i) => row[n] / row[i]);
  }
  function homography(src, dst) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [X, Y] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
      A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
    }
    const h = solve(A, b); h.push(1); return h;
  }
  function inv3(m) {
    const [a, b, c, d, e, f, g2, h, i] = m, A = e * i - f * h, B = -(d * i - f * g2), C = d * h - e * g2;
    const det = a * A + b * B + c * C;
    return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g2) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g2) / det, (a * e - b * d) / det];
  }
  const applyH = (m, x, y) => { const w = m[6] * x + m[7] * y + m[8]; return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w]; };

  // ------------------------------------------------------------------ stage
  const stage = {
    el: $('#stage'), cv: $('#cv'), view: { u: 1, Wu: 320 }, dpr: 1, Hm: [1, 0, 0, 0, 1, 0, 0, 0, 1], Hi: [1, 0, 0, 0, 1, 0, 0, 0, 1], pin: ID_PIN,
    resize() {
      this.cssW = innerWidth; this.cssH = innerHeight; this.dpr = Math.min(2, devicePixelRatio || 1);
      this.cv.width = Math.round(this.cssW * this.dpr); this.cv.height = Math.round(this.cssH * this.dpr);
      this.ctx = this.cv.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
      this.view.u = this.cv.height / H; this.view.Wu = this.cv.width / this.view.u;
      this.setPin(this.pin);
    },
    setPin(pin) {
      this.pin = pin || ID_PIN; const W = this.cssW, Hh = this.cssH;
      const src = [[0, 0], [W, 0], [W, Hh], [0, Hh]], dst = this.pin.map(([x, y]) => [x * W, y * Hh]);
      const ident = this.pin.every((p, i) => Math.abs(p[0] - ID_PIN[i][0]) < 1e-4 && Math.abs(p[1] - ID_PIN[i][1]) < 1e-4);
      this.Hm = ident ? [1, 0, 0, 0, 1, 0, 0, 0, 1] : homography(src, dst); this.Hi = inv3(this.Hm);
      const m = this.Hm;
      this.el.style.transform = ident ? 'none' : `matrix3d(${m[0]},${m[3]},0,${m[6]},${m[1]},${m[4]},0,${m[7]},0,0,1,0,${m[2]},${m[5]},0,${m[8]})`;
    },
    toUnits(cx, cy) { const [x, y] = applyH(this.Hi, cx, cy), k = this.cssH / H; return { x: x / k, y: y / k }; },
    toScreen(ux, uy) { const k = this.cssH / H; return applyH(this.Hm, ux * k, uy * k); },
  };

  // ------------------------------------------------------------------ app
  const KEY = 'marioWall.layout.v1', PKEY = 'marioWall.prefs.v1', PHKEY = 'marioWall.photo.v1';
  const app = {
    stage, icon, screen: 'editor', clock: null, game: null, paused: false, mode: null,
    defaultLayout() { return { v: 1, boxes: [], els: [{ id: Engine.newId('e'), type: 'mario', x: 0.12, y: 0.88, s: 1, flip: false }], pin: ID_PIN.map(p => p.slice()) }; },
    loadLayout() { try { const l = JSON.parse(localStorage.getItem(KEY)); if (l && l.els) { if (!l.els.some(e => e.type === 'mario')) l.els.push(this.defaultLayout().els[0]); l.pin = l.pin || ID_PIN.map(p => p.slice()); return l; } } catch (e) { /* none */ } return null; },
    saveLayout(l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) { /* quota */ } },
    loadPrefs() { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (e) { return {}; } },
    savePrefs(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) { /* quota */ } },
    setPhoto(url) {
      this.photo = url; $('#photo').src = url || '';
      try { if (url) localStorage.setItem(PHKEY, url); else localStorage.removeItem(PHKEY); } catch (e) { this.toast('Photo too big to remember'); }
    },
    loadPhoto(file) {
      return new Promise(res => {
        const img = new Image(); img.onload = () => {
          const sc = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          this.setPhoto(c.toDataURL('image/jpeg', 0.82)); URL.revokeObjectURL(img.src); res();
        }; img.src = URL.createObjectURL(file);
      });
    },
    toast(msg, action, fn) {
      const t = $('#toast'); t.innerHTML = `<span>${msg}</span>` + (action ? `<button>${action}</button>` : '');
      if (action) t.querySelector('button').onclick = () => { fn(); t.classList.remove('show'); };
      t.classList.add('show'); clearTimeout(this.tt); this.tt = setTimeout(() => t.classList.remove('show'), action ? 4200 : 2400);
    },
    burst() { const b = $('#magic'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); },
    setClock(c) { if (this.clock && this.clock !== c) this.clock.stop(); this.clock = c; this.paused = false; },
    show(name) {
      this.screen = name; hideTip();
      document.body.classList.remove('on-editor', 'on-player', 'playing', 'idle');
      document.body.classList.add('on-' + name);
      if (name !== 'editor') this.pinMode(false);
      $('#toast').classList.remove('show');
    },
    // ------------------------------------------------------------ editor
    goEditor() {
      this.exitFull(); this.show('editor'); this.mode = null; delete document.body.dataset.mode;
      // New visitor: blank canvas (just Mario). Returning visitor: their last saved wall.
      const saved = this.loadLayout(), returning = !!saved && (saved.boxes.length > 0 || saved.els.length > 1);
      this.layout = saved || this.defaultLayout();
      stage.setPin(this.layout.pin);
      this.game = new Engine.Game(stage.view, this.layout, false);
      this.setClock(new Audio.TimerClock(118));
      this.editor.open(this.layout);
      if (returning && !this.greeted) {
        this.greeted = true;
        setTimeout(() => this.toast('Welcome back! Your last wall is loaded', 'Start blank', () => this.editor.clearAll()), 500);
      }
      this.greeted = true;
    },
    // ------------------------------------------------------------ player
    goPlayer() {
      this.saveLayout(this.layout);
      this.show('player'); stage.setPin(this.layout.pin);
      this.game = new Engine.Game(stage.view, this.layout, true);
      this.setClock(new Audio.TimerClock(118)); // silent preview behind the question
      this.mode = null; delete document.body.dataset.mode;
      this.chooseState('pick');
    },
    chooseState(st) {
      const c = $('#choose');
      if (!st) { c.classList.remove('show'); return; }
      c.dataset.state = st; c.classList.add('show');
      if (st === 'denied') $('#deniedText').textContent = window.isSecureContext
        ? 'To react to your song, allow the microphone for this site (click the icon left of the address bar), then press Give access.'
        : 'Your browser only allows the microphone on a secure (https) or localhost link. Open the app that way to use your mic, or play automatically.';
    },
    startAuto() {
      const c = new Audio.SynthClock(124); c.start(); if (this.muted) c.setMuted(true);
      this.setClock(c); this.mode = 'auto';
      this.game = new Engine.Game(stage.view, this.layout, true); this.game.sfx = n => c.sfx(n); this.game.hud = this.editor.prefs.hud;
      this.enterShow();
    },
    async requestMusic() {
      this.chooseState('waiting');
      const c = new Audio.ListenClock();
      try { await c.startMic(); }
      catch (e) { c.stop(); this.chooseState('denied'); return; }
      if (this.screen !== 'player' || $('#choose').dataset.state !== 'waiting') { c.stop(); return; }
      this.startListening(c, 'Listening');
    },
    async startSongFile(file) {
      const c = new Audio.ListenClock();
      try { await c.startFile(file); } catch (e) { c.stop(); this.toast('Could not play that file'); return; }
      this.startListening(c, file.name.replace(/\.[^.]+$/, '').slice(0, 22));
    },
    startListening(c, label) {
      this.setClock(c); this.mode = 'music'; this.srcLabel = label;
      this.game = new Engine.Game(stage.view, this.layout, true); this.game.hud = this.editor.prefs.hud;
      this.enterShow();
    },
    enterShow() {
      this.chooseState(null); document.body.classList.add('playing');
      document.body.dataset.mode = this.mode; this.paused = false; this.syncDock(); this.poke();
      this.enterFull();
    },
    togglePause() {
      if (!this.clock || !this.mode) return;
      this.paused = !this.paused; this.paused ? this.clock.pause() : this.clock.resume(); this.syncDock(); this.poke();
    },
    syncDock() {
      $('#dPlay').innerHTML = icon(this.paused ? 'play' : 'pause');
      $('#dVol').innerHTML = icon(this.muted ? 'volx' : 'vol');
      $('#dMode').innerHTML = this.mode === 'music' ? icon('music') + '<span>Music</span><em>' + (this.srcLabel || '') + '</em>' : icon('auto') + '<span>Auto</span>';
      document.body.classList.toggle('is-paused', this.paused);
      $('#dHud').classList.toggle('on', !!this.editor.prefs.hud);
    },
    switchMode() {
      if (this.mode === 'music') { this.startAuto(); return; }
      if (this.paused) this.togglePause();
      document.body.classList.remove('playing'); this.requestMusic();
    },
    poke() {
      document.body.classList.remove('idle'); clearTimeout(this.it);
      this.it = setTimeout(() => { if (this.screen === 'player' && this.mode && !this.paused && !$('#dock').matches(':hover')) { document.body.classList.add('idle'); hideTip(); } }, 2600);
    },
    enterFull() { const d = document.documentElement; if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(() => {}); },
    exitFull() { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); },
    toggleFull() { document.fullscreenElement ? this.exitFull() : this.enterFull(); },
    // ------------------------------------------------------------ editor helpers
    togglePanels() {
      const hid = document.body.classList.toggle('panels-hidden'); hideTip();
      $('#hidePanels').innerHTML = icon(hid ? 'eye' : 'eyeoff');
    },
    pinMode(on) {
      document.body.classList.toggle('pinning', !!on); $('#tPin').classList.toggle('on', !!on);
      if (on) { this.editor.sel = null; this.editor.refresh(); this.placePins(); hideTip(); }
      else if (this.editor && this.layout && this.pinDirty) { this.pinDirty = false; this.editor.commit(); }
    },
    placePins() {
      document.querySelectorAll('.pinh').forEach((h, i) => { const [x, y] = this.layout.pin[i]; h.style.transform = `translate(${x * innerWidth}px, ${y * innerHeight}px)`; });
    },
    bindPins() {
      document.querySelectorAll('.pinh').forEach((h, i) => {
        h.addEventListener('pointerdown', e => {
          e.preventDefault(); h.setPointerCapture(e.pointerId); h.classList.add('drag');
          const mv = ev => {
            this.layout.pin[i] = [Math.max(-0.2, Math.min(1.2, ev.clientX / innerWidth)), Math.max(-0.2, Math.min(1.2, ev.clientY / innerHeight))];
            stage.setPin(this.layout.pin); this.placePins(); this.pinDirty = true;
          };
          const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.classList.remove('drag'); this.saveLayout(this.layout); };
          h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
        });
      });
      $('#pinReset').onclick = () => { this.layout.pin = ID_PIN.map(p => p.slice()); stage.setPin(this.layout.pin); this.placePins(); this.pinDirty = true; this.saveLayout(this.layout); };
      $('#pinDone').onclick = () => this.pinMode(false);
    },
    // ------------------------------------------------------------ loop
    frame(now) {
      const dt = this.last ? (now - this.last) / 1000 : 0.016; this.last = now;
      const c = this.clock, ev = c && !this.paused ? c.update() : [];
      if (this.game && !this.paused) this.game.update(dt, c, ev);
      const ctx = stage.ctx;
      // While editing with a wall photo, keep the canvas transparent so the photo shows through behind the boxes.
      const seePhoto = this.screen === 'editor' && this.photo && this.editor.prefs.photo;
      if (seePhoto) ctx.clearRect(0, 0, stage.cv.width, stage.cv.height);
      else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, stage.cv.width, stage.cv.height); }
      if (this.game) this.game.draw(ctx);
      if (this.editor.prefs.glow && !seePhoto) this.bloom(ctx);
      if (this.screen === 'editor') this.editor.drawOverlay(ctx);
      if (this.screen === 'player' && this.mode === 'music' && c) {
        const lv = c.level || 0; document.querySelectorAll('#meter i').forEach((b, i) => b.classList.toggle('on', lv > (i + 0.5) / 6));
        $('#listenHint').classList.toggle('show', !c.active && !this.paused);
      } else $('#listenHint').classList.remove('show');
      requestAnimationFrame(t => this.frame(t));
    },
    bloom(ctx) {
      const cv = stage.cv, w = Math.max(1, cv.width >> 2), h = Math.max(1, cv.height >> 2);
      const bc = this.bc || (this.bc = document.createElement('canvas'));
      if (bc.width !== w || bc.height !== h) { bc.width = w; bc.height = h; }
      const b = bc.getContext('2d'); b.globalCompositeOperation = 'copy'; b.filter = 'blur(2.5px)'; b.drawImage(cv, 0, 0, w, h); b.filter = 'none';
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.42; ctx.imageSmoothingEnabled = true; ctx.drawImage(bc, 0, 0, cv.width, cv.height); ctx.restore();
      ctx.imageSmoothingEnabled = false;
    },
    init() {
      document.querySelectorAll('[data-icon]').forEach(el => { el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)); });
      stage.resize();
      const bi = $('#brandIcon').getContext('2d'); bi.imageSmoothingEnabled = false; bi.drawImage(Art.sprites.hero.mario.stand, 0, 0, 32, 32);
      try { const ph = localStorage.getItem(PHKEY); if (ph) { this.photo = ph; $('#photo').src = ph; } } catch (e) { /* none */ }
      this.editor = new Editor(this);
      MW.Help.init();
      this.bindPins(); initTips();
      // editor
      $('#helpBtn').onclick = () => MW.Help.open();
      $('#savePlay').onclick = () => { this.editor.commit(); this.goPlayer(); };
      $('#hidePanels').onclick = () => this.togglePanels(); $('#showPanels').onclick = () => this.togglePanels();
      // player
      $('#pickAuto').onclick = () => this.startAuto();
      $('#pickMusic').onclick = () => this.requestMusic();
      $('#micCancel').onclick = () => this.chooseState('pick');
      $('#micRetry').onclick = () => this.requestMusic();
      $('#deniedAuto').onclick = () => this.startAuto();
      $('#songFile').onclick = () => $('#songInput').click();
      $('#songInput').onchange = e => { const f = e.target.files[0]; if (f) this.startSongFile(f); e.target.value = ''; };
      $('#backEdit').onclick = () => this.goEditor();
      $('#dPlay').onclick = () => this.togglePause();
      $('#dMode').onclick = () => this.switchMode();
      $('#dVol').onclick = () => { this.muted = !this.muted; if (this.clock && this.clock.setMuted) this.clock.setMuted(this.muted); this.syncDock(); };
      $('#dFull').onclick = () => this.toggleFull();
      $('#dHud').onclick = () => { const p = this.editor.prefs; p.hud = !p.hud; this.savePrefs(p); if (this.game) this.game.hud = p.hud; this.syncDock(); };
      $('#dEdit').onclick = () => this.goEditor();
      addEventListener('pointermove', () => { if (this.screen === 'player') this.poke(); });
      addEventListener('keydown', e => {
        if (e.target.closest && e.target.closest('input')) return;
        if (this.screen === 'editor') { if (this.editor.key(e)) return; }
        if (e.key === 'f' || e.key === 'F') this.toggleFull();
        if (this.screen === 'player') {
          if (e.key === ' ') { e.preventDefault(); this.togglePause(); }
          if (e.key === 'e' || e.key === 'E') this.goEditor();
          this.poke();
        }
      });
      addEventListener('resize', () => { stage.resize(); if (this.game) this.game.setLayout(this.game.layout); if (this.screen === 'editor') { this.placePins(); this.editor.renderSelbar(); } });
      this.goEditor();
      let seen = false; try { seen = !!localStorage.getItem('marioWall.helpSeen'); } catch (e) { /* none */ }
      if (!seen) setTimeout(() => MW.Help.open(), 600);
      requestAnimationFrame(t => this.frame(t));
    },
  };

  // ------------------------------------------------------------------ tooltips (data-tip="Title|Details")
  const tipEl = () => $('#tip');
  let tipT = 0, tipFor = null;
  function hideTip() { clearTimeout(tipT); tipFor = null; const t = tipEl(); if (t) t.classList.remove('show'); }
  function showTip(el) {
    const raw = el.dataset.tip || '', i = raw.indexOf('|'), t = tipEl();
    const title = i < 0 ? raw : raw.slice(0, i), body = i < 0 ? '' : raw.slice(i + 1);
    t.innerHTML = `<b>${title}</b>` + (body ? `<span>${body}</span>` : '');
    t.className = 'tip'; t.style.left = '0px'; t.style.top = '0px';
    const r = el.getBoundingClientRect(), tw = t.offsetWidth, th = t.offsetHeight, gap = 12;
    let side = el.closest('.panel.left') ? 'right' : el.closest('.panel.right') ? 'left' : el.closest('.dock, .pinbar') ? 'top' : r.top < 140 ? 'bottom' : 'top';
    let x, y;
    if (side === 'right') { x = r.right + gap; y = r.top + r.height / 2 - th / 2; }
    else if (side === 'left') { x = r.left - tw - gap; y = r.top + r.height / 2 - th / 2; }
    else if (side === 'bottom') { x = r.left + r.width / 2 - tw / 2; y = r.bottom + gap; }
    else { x = r.left + r.width / 2 - tw / 2; y = r.top - th - gap; }
    x = Math.max(10, Math.min(innerWidth - tw - 10, x)); y = Math.max(10, Math.min(innerHeight - th - 10, y));
    t.style.left = Math.round(x) + 'px'; t.style.top = Math.round(y) + 'px'; t.classList.add('show', 'side-' + side);
  }
  function initTips() {
    document.addEventListener('mouseover', e => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el === tipFor) return;
      hideTip(); if (!el || document.body.classList.contains('dragging')) return;
      tipFor = el; tipT = setTimeout(() => { if (tipFor === el && document.contains(el)) showTip(el); }, 380);
    });
    document.addEventListener('pointerdown', hideTip, true);
    document.addEventListener('mouseleave', hideTip);
  }

  MW.app = app;
  addEventListener('DOMContentLoaded', () => app.init());
})(window);
