// Mario Wall — beat clocks.
//   TimerClock  : silent fixed-tempo clock (home-screen demo).
//   SynthClock  : "Play" mode. Original chiptune loop (WebAudio) + sound effects; beats come from the sequencer.
//   ListenClock : "Music" mode. Listens to the mic or a song file and tracks beats, tempo, energy and drops.
// Every clock exposes: update() -> [events], beatPos, period, energy, active, pause(), resume(), stop().
(function (g) {
  'use strict';
  const MW = g.MW = g.MW || {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const beat = (i, period, strength = 1, synthetic = false) =>
    ({ type: 'beat', i, inBar: ((i % 4) + 4) % 4, bar: Math.floor(i / 4), kick: i % 2 === 0, strength, period, synthetic });
  const AC = g.AudioContext || g.webkitAudioContext;

  // ------------------------------------------------------------------ TimerClock
  class TimerClock {
    constructor(bpm = 118) { this.kind = 'timer'; this.period = 60 / bpm; this.t0 = performance.now() / 1000; this.last = -1; this.paused = false; this.active = true; this.energy = 0.6; }
    now() { return (this.paused ? this.pauseAt : performance.now() / 1000) - this.t0; }
    get beatPos() { return this.now() / this.period; }
    update() {
      const b = Math.floor(this.beatPos), ev = [];
      while (this.last < b) { this.last++; ev.push(beat(this.last, this.period)); }
      this.energy = 0.5 + 0.3 * (Math.floor(b / 32) % 2);
      return ev;
    }
    pause() { if (!this.paused) { this.paused = true; this.pauseAt = performance.now() / 1000; } }
    resume() { if (this.paused) { this.t0 += performance.now() / 1000 - this.pauseAt; this.paused = false; } }
    stop() {}
  }

  // ------------------------------------------------------------------ SynthClock
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = s => (s === '.' ? null : 12 * (parseInt(s.slice(-1), 10) + 1) + NOTE[s[0]] + (s[1] === '#' ? 1 : 0));
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // Original 8-bar melody (8th notes), chords C G Am F C G F G.
  const MELODY = [
    'E5 G5 C6 . G5 E5 G5 A5', 'G5 . D5 G5 B5 . A5 G5', 'A5 C6 E6 . C6 A5 B5 C6', 'A5 . F5 A5 C6 . D6 C6',
    'E6 . D6 C6 G5 . E5 G5', 'D6 . B5 G5 D6 E6 D6 B5', 'C6 A5 F5 A5 C6 D6 E6 F6', 'G6 . . E6 D6 . B5 .',
  ].map(b => b.split(' ').map(midi));
  const ROOTS = [48, 43, 45, 41, 48, 43, 41, 43];
  const CHORDS = { 48: [60, 64, 67, 72], 43: [55, 59, 62, 67], 45: [57, 60, 64, 69], 41: [53, 57, 60, 65] };

  class SynthClock {
    constructor(bpm = 124) {
      this.kind = 'synth'; this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
      this.comp = this.ctx.createDynamicsCompressor(); this.comp.connect(this.master);
      this.period = 60 / bpm; this.step = this.period / 4; this.queue = []; this.active = true; this.energy = 0.6; this.muted = false;
      const n = this.ctx.sampleRate; this.noise = this.ctx.createBuffer(1, n, n);
      const d = this.noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.lastSfx = {};
    }
    start() {
      this.ctx.resume();
      this.t0 = this.ctx.currentTime + 0.12; this.next = this.t0; this.si = 0; this.lastI = -1;
      this.timer = setInterval(() => this.schedule(), 25); this.schedule();
    }
    schedule() {
      while (this.next < this.ctx.currentTime + 0.15) {
        this.playStep(this.si, this.next);
        if (this.si % 4 === 0) this.queue.push({ t: this.next, i: this.si / 4 });
        this.si++; this.next += this.step;
      }
    }
    get beatPos() { return Math.max(0, (this.ctx.currentTime - this.t0) / this.period); }
    update() {
      const now = this.ctx.currentTime, ev = [];
      while (this.queue.length && this.queue[0].t <= now) { const q = this.queue.shift(); ev.push(beat(q.i, this.period)); }
      const bar = Math.floor(this.beatPos / 4);
      this.energy = (bar % 16) < 8 ? 0.6 : 0.95;
      return ev;
    }
    // --- instruments ---
    env(t, dur, vol) { const gn = this.ctx.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + 0.006); gn.gain.exponentialRampToValueAtTime(vol * 0.5, t + dur * 0.6); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); gn.connect(this.comp); return gn; }
    tone(type, f, t, dur, vol) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(this.env(t, dur, vol)); o.start(t); o.stop(t + dur + 0.02); return o; }
    hit(t, dur, vol, hp) {
      const s = this.ctx.createBufferSource(); s.buffer = this.noise;
      const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
      const gn = this.ctx.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(gn); gn.connect(this.comp); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    }
    kick(t) {
      const o = this.ctx.createOscillator(), gn = this.ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      gn.gain.setValueAtTime(0.9, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(gn); gn.connect(this.comp); o.start(t); o.stop(t + 0.22);
    }
    playStep(si, t) {
      const s16 = si % 16, bar = Math.floor(si / 16), b8 = bar % 8, hi = (bar % 16) >= 8, intro = bar < 1;
      if (s16 % 2 === 0) { // 8th-note grid
        const m = MELODY[b8][s16 / 2];
        if (m && !intro) this.tone('square', hz(m + (hi ? 0 : 0)), t, this.step * 1.8, hi ? 0.075 : 0.065);
        const r = ROOTS[b8], pat = [0, 12, 7, 12, 0, 12, 7, 12];
        this.tone('triangle', hz(r + pat[s16 / 2]), t, this.step * 1.7, 0.28);
      }
      if (hi) { const ch = CHORDS[ROOTS[b8]]; this.tone('square', hz(ch[s16 % 4] + 12), t, this.step * 0.8, 0.018); }
      if (s16 === 0 || s16 === 8 || (hi && s16 === 10)) this.kick(t);
      if (s16 === 4 || s16 === 12) { this.hit(t, 0.14, 0.32, 1200); this.tone('triangle', 190, t, 0.06, 0.15); }
      if (hi ? true : s16 % 2 === 0) this.hit(t, 0.035, hi ? 0.05 : 0.07, 7500);
      if (s16 === 0 && bar % 8 === 0 && bar > 0) this.hit(t, 0.9, 0.12, 4000);
    }
    sfx(name) {
      if (this.muted) return;
      const t = this.ctx.currentTime + 0.01, now = performance.now();
      if (now - (this.lastSfx[name] || 0) < 90) return; this.lastSfx[name] = now;
      const seq = (notes, d, v, type = 'square') => notes.forEach((m, k) => this.tone(type, hz(m), t + k * d, d * 1.1, v));
      if (name === 'coin') { this.tone('square', hz(83), t, 0.07, 0.05); this.tone('square', hz(88), t + 0.07, 0.25, 0.05); }
      else if (name === 'stomp') { const o = this.tone('square', 500, t, 0.12, 0.06); o.frequency.exponentialRampToValueAtTime(90, t + 0.12); }
      else if (name === 'power') seq([60, 64, 67, 72, 76, 79, 84], 0.045, 0.04);
      else if (name === 'oneup') seq([76, 79, 88, 84, 86, 91], 0.07, 0.045);
      else if (name === 'fire') { const o = this.tone('square', 900, t, 0.06, 0.035); o.frequency.exponentialRampToValueAtTime(200, t + 0.06); }
      else if (name === 'boom') this.hit(t, 0.6, 0.18, 300);
      else if (name === 'spring') { const o = this.tone('square', 260, t, 0.32, 0.05); o.frequency.exponentialRampToValueAtTime(1100, t + 0.3); }
      else if (name === 'bump') { const o = this.tone('triangle', 200, t, 0.08, 0.12); o.frequency.exponentialRampToValueAtTime(120, t + 0.08); }
    }
    setMuted(m) { this.muted = m; this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.03); }
    pause() { this.ctx.suspend(); }
    resume() { this.ctx.resume(); }
    stop() { clearInterval(this.timer); try { this.ctx.close(); } catch (e) { /* closed */ } }
  }

  // ------------------------------------------------------------------ ListenClock
  class ListenClock {
    constructor() {
      this.kind = 'listen'; this.ctx = new AC();
      this.an = this.ctx.createAnalyser(); this.an.fftSize = 2048; this.an.smoothingTimeConstant = 0;
      this.freq = new Uint8Array(this.an.frequencyBinCount); this.prev = new Float32Array(this.an.frequencyBinCount);
      this.time = new Float32Array(this.an.fftSize);
      this.binHz = this.ctx.sampleRate / this.an.fftSize;
      this.period = 0.5; this.active = false; this.energy = 0; this.level = 0;
      this.m = 0; this.v = 0; this.lastT = 0; this.lastOnset = -9; this.onsets = [];
      this.count = 0; this.lastBeat = 0; this.lastEmit = -9; this.off = 0; this.quietFor = 0;
      this.peak = 0.05; this.fastE = 0; this.slowE = 0; this.lastDrop = 0; this.lastTempo = 0; this.cand = 0; this.candN = 0;
    }
    async startMic() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nomic');
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      this.ctx.createMediaStreamSource(this.stream).connect(this.an);
      await this.ctx.resume(); this.source = 'mic';
    }
    async startFile(file) {
      this.audio = new Audio(URL.createObjectURL(file)); this.audio.loop = true;
      const src = this.ctx.createMediaElementSource(this.audio); src.connect(this.an); this.an.connect(this.ctx.destination);
      await this.ctx.resume(); await this.audio.play(); this.source = 'file'; this.fileName = file.name;
    }
    get beatPos() { return this.count <= 0 ? 0 : this.count - 1 + clamp((this.ctx.currentTime - this.lastBeat) / this.period, 0, this.active ? 1 : 0); }
    emit(ev, t, strength, synthetic) {
      this.lastBeat = t; this.lastEmit = t;
      ev.push(beat(this.count++, this.period, strength, synthetic));
    }
    tempo(t) {
      const on = this.onsets; if (on.length < 6) return;
      const bins = new Float32Array(41); // 0.40 .. 0.80 s in 10 ms bins
      for (let a = 0; a < on.length; a++) for (let b = a + 1; b < on.length; b++) {
        let d = on[b] - on[a]; if (d < 0.25 || d > 2.4) continue;
        while (d >= 0.805) d /= 2; while (d < 0.395) d *= 2;
        const k = Math.round((d - 0.4) * 100), w = 1 / (1 + (b - a) * 0.15);
        for (let j = -2; j <= 2; j++) if (k + j >= 0 && k + j <= 40) bins[k + j] += w * Math.exp(-j * j / 2);
      }
      let best = 0; for (let k = 1; k <= 40; k++) if (bins[k] > bins[best]) best = k;
      const est = 0.4 + best / 100;
      if (Math.abs(est - this.period) / this.period < 0.07) { this.period += (est - this.period) * 0.3; this.candN = 0; }
      else if (Math.abs(est - this.cand) < 0.02) { if (++this.candN >= 3) { this.period = est; this.candN = 0; } }
      else { this.cand = est; this.candN = 1; }
    }
    update() {
      const t = this.ctx.currentTime, dt = t - this.lastT, ev = [];
      if (dt <= 0.001) return ev; this.lastT = t;
      this.an.getByteFrequencyData(this.freq); this.an.getFloatTimeDomainData(this.time);
      let ss = 0; for (let i = 0; i < this.time.length; i++) ss += this.time[i] * this.time[i];
      const rms = Math.sqrt(ss / this.time.length);
      const lowHi = Math.max(2, Math.round(160 / this.binHz)), top = Math.round(6000 / this.binHz);
      let fl = 0, fx = 0;
      for (let i = 1; i < top; i++) {
        const v = this.freq[i] / 255, d = v - this.prev[i]; this.prev[i] = v;
        if (d > 0) { fx += d; if (i <= lowHi) fl += d; }
      }
      const o = fl / lowHi * 4 + fx / top * 2;
      const a = 1 - Math.exp(-dt / 0.9), diff = o - this.m; this.m += a * diff; this.v = (1 - a) * (this.v + a * diff * diff);
      const sd = Math.sqrt(this.v);
      this.peak = Math.max(rms, this.peak * Math.exp(-dt / 8), 0.02);
      this.level += (clamp(rms / this.peak, 0, 1) - this.level) * (1 - Math.exp(-dt / 0.08));
      this.energy += (this.level - this.energy) * (1 - Math.exp(-dt / 0.6));
      this.quietFor = rms < 0.006 ? this.quietFor + dt : 0;
      if (this.quietFor > 1.6) this.active = false;
      // drops
      this.fastE += (rms - this.fastE) * (1 - Math.exp(-dt / 0.25)); this.slowE += (rms - this.slowE) * (1 - Math.exp(-dt / 5));
      if (this.fastE > this.slowE * 1.7 && this.fastE > 0.04 && t - this.lastDrop > 10) { this.lastDrop = t; ev.push({ type: 'drop' }); }
      // onsets
      if (this.quietFor === 0 && o > this.m + 1.45 * sd && o > 0.012 && t - this.lastOnset > 0.16) {
        const strength = clamp((o - this.m) / (4 * sd + 1e-6), 0.3, 1);
        this.lastOnset = t; this.onsets.push(t);
        while (this.onsets.length && t - this.onsets[0] > 8) this.onsets.shift();
        if (!this.active) { this.active = true; this.emit(ev, t, strength, false); }
        else {
          const d = t - this.lastBeat, k = Math.round(d / this.period), err = d - k * this.period;
          if (k >= 1 && Math.abs(err) < 0.16 * this.period) { this.off = 0; if (t - this.lastEmit > 0.5 * this.period) this.emit(ev, t, strength, false); else this.lastBeat = t; }
          else if (k === 0) { this.lastBeat += err * 0.3; }
          else if (++this.off >= 4) { this.off = 0; this.emit(ev, t, strength, false); }
        }
      }
      if (this.active && t - this.lastBeat >= this.period + 0.04) this.emit(ev, this.lastBeat + this.period, 0.5, true);
      if (t - this.lastTempo > 0.5) { this.lastTempo = t; this.tempo(t); }
      return ev;
    }
    pause() { if (this.audio) this.audio.pause(); this.ctx.suspend(); }
    resume() { this.ctx.resume(); if (this.audio) this.audio.play(); }
    stop() {
      if (this.stream) this.stream.getTracks().forEach(tr => tr.stop());
      if (this.audio) { this.audio.pause(); URL.revokeObjectURL(this.audio.src); }
      try { this.ctx.close(); } catch (e) { /* closed */ }
    }
  }

  MW.Audio = { TimerClock, SynthClock, ListenClock };
})(window);
