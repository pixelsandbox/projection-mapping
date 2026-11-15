// Mario Wall — "Help me learn": an animated, step-by-step walkthrough of the editor.
(function (g) {
  'use strict';
  const MW = g.MW, A = MW.Art;
  const $ = s => document.querySelector(s);
  const cache = {};
  function src(key, img) {
    if (cache[key]) return cache[key];
    const k = 4, c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, c.width, c.height);
    return (cache[key] = c.toDataURL());
  }
  const S = (type, h, cls = '', style = '') => `<img class="hs ${cls}" alt="" style="height:${h}px;${style}" src="${src(type, A.BY_TYPE[type].img)}">`;
  const T = { brick: () => src('t-brick', A.tiles.brick[0]), q: () => src('t-q', A.tiles.q[0]), ground: () => src('t-ground', A.tiles.ground[0]), stone: () => src('t-stone', A.tiles.stone[0]), brickB: () => src('t-brickB', A.tiles.brick[1]) };
  const tile = (k, px = 18) => `background-image:url(${T[k]()});background-size:${px}px ${px}px;`;

  const SLIDES = [
    {
      title: 'Draw boxes on your wall',
      text: 'Drag anywhere on the black area to draw a box over something real: a shelf, a frame, the floor line. Each box becomes a platform Mario can run on.',
      html: () => `<div class="hw"><div class="h-draw"><i style="${tile('brick')}"></i></div><span class="h-cursor h-cur-draw"></span></div>`,
    },
    {
      title: 'Pick a skin',
      text: 'Select a box and choose how it looks: bricks, ? blocks, ground, pipe, cloud, neon, lava… or Blank to keep it invisible while Mario still walks on it.',
      html: () => `<div class="hw"><div class="h-skinbox">${['brick', 'q', 'ground', 'stone', 'brickB'].map((k, i) => `<i style="${tile(k, 26)};animation-delay:${i * 1.2}s"></i>`).join('')}<i class="h-blank" style="animation-delay:6s"></i></div>
        <div class="h-swatches">${['brick', 'q', 'ground', 'stone', 'brickB'].map(k => `<i style="${tile(k, 14)}"></i>`).join('')}<i class="h-blank"></i><b class="h-ring"></b></div></div>`,
    },
    {
      title: 'Add characters & items',
      text: 'Drag anything from the right panel onto your wall. It snaps onto the top of a box. A quick tap drops it in for you.',
      html: () => `<div class="hw"><div class="h-plat" style="left:40px;top:128px;width:170px;${tile('brick')}"></div>
        <div class="h-pal"><span>${S('goomba', 28)}</span><span>${S('coin', 24)}</span><span>${S('koopa', 30)}</span></div>
        <div class="h-fly">${S('goomba', 30)}</div><span class="h-cursor h-cur-fly"></span></div>`,
    },
    {
      title: 'Make them move',
      text: 'Select a character and pick ↔ (left-right) or ↕ (up-down) in its toolbar. Then drag the cyan dots to set exactly how far it travels.',
      html: () => `<div class="hw"><div class="h-plat" style="left:50px;top:132px;width:260px;${tile('ground')}"></div>
        <div class="h-path"><i class="d1"></i><i class="d2"></i></div>
        <div class="h-walker">${S('goomba', 30)}</div>
        <div class="h-mini-bar"><b>⏺</b><b class="on">↔</b><b>↕</b></div></div>`,
    },
    {
      title: 'Select, move & resize',
      text: 'Click anything to select it. Drag to move, pull the yellow dots to resize. The toolbar lets you flip, resize, copy or delete. Ctrl/Cmd+Z undoes anything.',
      html: () => `<div class="hw"><div class="h-plat" style="left:110px;top:136px;width:140px;${tile('stone')}"></div>
        <div class="h-sel">${S('mario', 40, 'h-flip')}<i></i></div>
        <div class="h-tbar"><b>⇋</b><b>−</b><b>+</b><b>⧉</b><b>🗑</b></div></div>`,
    },
    {
      title: 'Fit it to your wall',
      text: 'Projector at an angle? Turn on Corner fit and drag the 4 yellow corners onto the corners of your wall. The whole picture bends to match.',
      html: () => `<div class="hw"><div class="h-quad"><div class="h-plat" style="left:30%;top:66%;width:40%;${tile('brick', 14)}"></div><div style="position:absolute;left:44%;top:44%">${S('mario', 28)}</div></div>
        <i class="h-corner c1"></i><i class="h-corner c2"></i><i class="h-corner c3"></i><i class="h-corner c4"></i></div>`,
    },
    {
      title: 'Short on time? Build it for me',
      text: 'The yellow button at the top builds a complete Mario level in one tap, Mario included. Tap again for a new one, or Undo to go back.',
      html: () => {
        const p = (d, html, st) => `<div class="h-pop" style="animation-delay:${d}s;${st}">${html}</div>`;
        return `<div class="hw">
          ${p(0, '', `left:0;right:0;top:168px;height:22px;${tile('ground', 22)}`)}
          ${p(0.2, '', `left:40px;top:110px;width:110px;height:18px;${tile('brick', 18)}`)}
          ${p(0.4, '', `left:200px;top:80px;width:72px;height:18px;${tile('q', 18)}`)}
          ${p(0.55, '', `left:290px;top:128px;width:28px;height:40px;background:linear-gradient(90deg,#005800,#00a800 20%,#b8f818 30%,#00a800 45%,#005800);border:2px solid #000`)}
          ${p(0.8, S('mario', 30), 'left:60px;top:80px')}
          ${p(1.0, S('goomba', 26), 'left:118px;top:84px')}
          ${p(1.15, S('coin', 20) + S('coin', 20) + S('coin', 20), 'left:205px;top:52px;display:flex;gap:4px')}
          ${p(1.3, S('cloud', 34), 'left:70px;top:14px')}
          ${p(1.45, S('piranha', 34), 'left:288px;top:94px')}
          ${p(1.6, S('star', 22), 'left:230px;top:144px')}
        </div>`;
      },
    },
    {
      title: 'Save & play',
      text: 'Choose React to my song to make the wall move to any music through your mic, or Play automatically for the built-in 8-bit beat. Press F for fullscreen on the projector.',
      html: () => `<div class="hw"><div class="h-cards"><div class="hc a"><span class="hci music">♪</span>React to my song</div><div class="hc b"><span class="hci play">▶</span>Play automatically</div></div>
        <div class="h-plat" style="left:40px;top:160px;width:90px;${tile('brick', 16)}"></div><div class="h-plat" style="left:230px;top:140px;width:90px;${tile('q', 16)}"></div>
        <div class="h-jumper">${S('mario', 26)}</div><div class="h-notes"><i>♪</i><i>♫</i><i>♪</i></div></div>`,
    },
  ];

  const Help = {
    i: 0, timer: null, paused: false,
    init() {
      $('#helpDots').innerHTML = SLIDES.map((_, k) => `<button aria-label="Step ${k + 1}" data-k="${k}"></button>`).join('');
      $('#helpDots').onclick = e => { const b = e.target.closest('button'); if (b) this.go(+b.dataset.k); };
      $('#helpPrev').onclick = () => this.go(this.i - 1);
      $('#helpNext').onclick = () => (this.i >= SLIDES.length - 1 ? this.close() : this.go(this.i + 1));
      $('#helpClose').onclick = () => this.close();
      $('#help').addEventListener('click', e => { if (e.target.id === 'help') this.close(); });
      const card = document.querySelector('.help-card');
      card.addEventListener('mouseenter', () => { this.paused = true; document.body.classList.add('help-paused'); });
      card.addEventListener('mouseleave', () => { this.paused = false; document.body.classList.remove('help-paused'); });
      addEventListener('keydown', e => {
        if (!this.isOpen()) return;
        if (e.key === 'ArrowRight') this.go(Math.min(this.i + 1, SLIDES.length - 1));
        else if (e.key === 'ArrowLeft') this.go(this.i - 1);
        else if (e.key === 'Escape') this.close();
        e.stopPropagation();
      }, true);
    },
    isOpen() { return document.body.classList.contains('help-open'); },
    open(k = 0) { document.body.classList.add('help-open'); this.go(k); try { localStorage.setItem('marioWall.helpSeen', '1'); } catch (e) { /* none */ } },
    close() { document.body.classList.remove('help-open'); clearInterval(this.timer); },
    go(k) {
      this.i = Math.max(0, Math.min(SLIDES.length - 1, k)); const s = SLIDES[this.i];
      $('#helpStage').innerHTML = s.html();
      $('#helpStep').textContent = `Step ${this.i + 1} of ${SLIDES.length}`;
      $('#helpTitle').textContent = s.title; $('#helpText').textContent = s.text;
      document.querySelectorAll('#helpDots button').forEach((b, j) => b.classList.toggle('on', j === this.i));
      $('#helpPrev').disabled = this.i === 0;
      $('#helpNext').innerHTML = this.i === SLIDES.length - 1 ? 'Start mapping' + MW.app.icon('check') : 'Next' + MW.app.icon('arrow');
      // auto-advance with a progress bar (pauses while hovered)
      clearInterval(this.timer); this.elapsed = 0; const DUR = 7000; const bar = $('#helpBar'); bar.style.width = '0%';
      this.timer = setInterval(() => {
        if (this.paused) return; this.elapsed += 100; bar.style.width = Math.min(100, this.elapsed / DUR * 100) + '%';
        if (this.elapsed >= DUR) { if (this.i < SLIDES.length - 1) this.go(this.i + 1); else { clearInterval(this.timer); } }
      }, 100);
    },
  };
  MW.Help = Help;
})(window);
