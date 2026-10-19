// Audio engine — everything is synthesized with the Web Audio API (original, not film audio).
// If you drop licensed files into /public/assets/audio/ (see manifest.json) they override the
// synthesized versions for music + ignition. Nothing here is a recording from any film.

const rand = (a, b) => a + Math.random() * (b - a);

export class AudioEngine {
  constructor(manifest) {
    this.manifest = manifest || {};
    this.ctx = null;
    this.muted = false;
    this.ready = false;
    this.humNodes = null;
    this.lightningNodes = null;
    this.musicNodes = null;
    this.fileBuffers = {}; // optional licensed files that were found
    this.lastClash = 0;
    this.lastSwing = 0;
    this.report = { synthesized: [], files: [] };
  }

  /** Must be called from a user gesture (the welcome button click). */
  async init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 5;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.85;
    this.comp.connect(this.master); this.master.connect(ctx.destination);

    // Cheap synthetic reverb (decaying noise impulse) for the cavernous reactor chamber.
    this.verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.verb.buffer = ir;
    this.verbGain = ctx.createGain(); this.verbGain.gain.value = 0.35;
    this.verb.connect(this.verbGain); this.verbGain.connect(this.comp);
    this.bus = ctx.createGain(); this.bus.connect(this.comp); this.bus.connect(this.verb);

    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    await this.ctx.resume();
    this.ready = true;
    await this._probeFiles(); // Load optional licensed tracks before the start button begins playback
  }

  async _probeFiles() {
    // Optional licensed audio. A missing file in Vite returns index.html (text/html) → ignored.
    for (const [key, path] of Object.entries(this.manifest.optionalFiles || {})) {
      try {
        const r = await fetch(path);
        const type = r.headers.get('content-type') || '';
        if (!r.ok || !/audio|octet-stream|mpeg|ogg|wav/.test(type)) continue;
        const buf = await this.ctx.decodeAudioData(await r.arrayBuffer());
        this.fileBuffers[key] = buf; this.report.files.push(path);
      } catch { /* not supplied — synthesized fallback is used */ }
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.05);
  }

  // ---------- building blocks ----------
  _noise(dur, { type = 'lowpass', f0 = 2000, f1 = 200, q = 1, gain = 0.3, attack = 0.01, out = this.bus, when = 0 } = {}) {
    const ctx = this.ctx, t = ctx.currentTime + when;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  _tone(freq, dur, { type = 'sine', gain = 0.2, slide = null, attack = 0.01, out = this.bus, when = 0, detune = 0 } = {}) {
    const ctx = this.ctx, t = ctx.currentTime + when;
    const o = ctx.createOscillator(); o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(10, slide), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  _file(key, gain = 1, loop = false) {
    const b = this.fileBuffers[key]; if (!b) return null;
    const s = this.ctx.createBufferSource(); s.buffer = b; s.loop = loop;
    const g = this.ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(this.comp); s.start();
    return { s, g };
  }

  // ---------- saber ----------
  /** Ignition: rising whoosh + crackle + low thrum, ~2.6 s so it matches the visual extension. */
  ignite(duration = 2.5) {
    if (!this.ready) return;
    if (this._file('ignite', 0.9)) return;
    const d = duration;
    this._noise(d, { type: 'bandpass', f0: 300, f1: 3200, q: 2.2, gain: 0.32, attack: 0.25 });
    this._noise(d * 0.8, { type: 'highpass', f0: 2500, f1: 7000, q: 0.7, gain: 0.07, attack: 0.5 });
    this._tone(70, d, { type: 'sawtooth', slide: 150, gain: 0.22, attack: 0.3 });
    this._tone(140, d, { type: 'square', slide: 320, gain: 0.07, attack: 0.5, detune: 8 });
    this._tone(220, d + 0.4, { type: 'sine', slide: 640, gain: 0.07, attack: 0.9 });
    for (let i = 0; i < 12; i++) this._noise(0.05, { type: 'highpass', f0: 4000, f1: 6000, gain: 0.12, when: rand(0.1, d * 0.9) });
    this.report.synthesized.push('ignite');
  }
  /** Continuous idle hum (two detuned saws + slow tremolo). */
  hum(on, level = 0.1) {
    if (!this.ready) return;
    const ctx = this.ctx;
    if (on && !this.humNodes) {
      const g = ctx.createGain(); g.gain.value = 0.0001;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 3;
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
      o1.type = 'sawtooth'; o1.frequency.value = 62; o2.type = 'sawtooth'; o2.frequency.value = 63.4; o3.type = 'square'; o3.frequency.value = 124;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.2; lg.gain.value = 0.35;
      const trem = ctx.createGain(); trem.gain.value = 0.65; lfo.connect(lg); lg.connect(trem.gain);
      const mix = ctx.createGain(); mix.gain.value = 1;
      o1.connect(mix); o2.connect(mix); o3.connect(mix); mix.connect(lp); lp.connect(trem); trem.connect(g); g.connect(this.bus);
      [o1, o2, o3, lfo].forEach((o) => o.start());
      this.humNodes = { g, o: [o1, o2, o3, lfo], lp };
    }
    if (this.humNodes) {
      const t = ctx.currentTime;
      this.humNodes.g.gain.cancelScheduledValues(t);
      this.humNodes.g.gain.setTargetAtTime(on ? level : 0.0001, t, 0.12);
      if (!on) { const n = this.humNodes; this.humNodes = null; setTimeout(() => n.o.forEach((o) => { try { o.stop(); } catch {} }), 600); }
    }
  }
  swing() {
    if (!this.ready) return;
    const now = performance.now(); if (now - this.lastSwing < 220) return; this.lastSwing = now;
    this._noise(0.32, { type: 'bandpass', f0: 500, f1: 1800, q: 4, gain: 0.16, attack: 0.08 });
    this._tone(120, 0.3, { type: 'sawtooth', slide: 220, gain: 0.07 });
  }
  clash(v = 1) {
    if (!this.ready) return;
    const now = performance.now(); if (now - this.lastClash < 120) return; this.lastClash = now;
    this._noise(0.35, { type: 'highpass', f0: 2500, f1: 9000, q: 0.8, gain: 0.34 * v, attack: 0.002 });
    this._noise(0.5, { type: 'bandpass', f0: 1800, f1: 600, q: 5, gain: 0.2 * v, attack: 0.002 });
    this._tone(880 * rand(0.9, 1.15), 0.4, { type: 'sawtooth', slide: 300, gain: 0.12 * v, attack: 0.002 });
    this._tone(1760, 0.18, { type: 'square', slide: 900, gain: 0.05 * v, attack: 0.002 });
    this._tone(55, 0.35, { type: 'sine', slide: 30, gain: 0.3 * v, attack: 0.002 });
  }
  forcePush() {
    if (!this.ready) return;
    this._noise(1.1, { type: 'lowpass', f0: 3000, f1: 80, q: 1.5, gain: 0.45, attack: 0.05 });
    this._tone(90, 1.1, { type: 'sine', slide: 28, gain: 0.5, attack: 0.02 });
  }
  /** Force lightning: crackling noise bed + buzzing saw; toggled on/off by the story. */
  lightning(on) {
    if (!this.ready) return;
    const ctx = this.ctx;
    if (on && !this.lightningNodes) {
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
      const g = ctx.createGain(); g.gain.value = 0.0001;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 95;
      const og = ctx.createGain(); og.gain.value = 0.06;
      const am = ctx.createOscillator(); am.type = 'square'; am.frequency.value = 38;
      const amg = ctx.createGain(); amg.gain.value = 0.05; am.connect(amg); amg.connect(g.gain);
      src.connect(hp); hp.connect(g); o.connect(og); og.connect(g); g.connect(this.bus);
      src.start(); o.start(); am.start();
      this.lightningNodes = { g, nodes: [src, o, am] };
    }
    if (this.lightningNodes) {
      this.lightningNodes.g.gain.setTargetAtTime(on ? 0.2 : 0.0001, ctx.currentTime, 0.08);
      if (!on) { const n = this.lightningNodes; this.lightningNodes = null; setTimeout(() => n.nodes.forEach((x) => { try { x.stop(); } catch {} }), 500); }
    }
  }
  defeat() {
    if (!this.ready) return;
    this._tone(110, 1.6, { type: 'sawtooth', slide: 38, gain: 0.25, attack: 0.02 });
    this._noise(1.4, { type: 'lowpass', f0: 1200, f1: 60, gain: 0.35, attack: 0.02 });
    this._tone(40, 1.2, { type: 'sine', gain: 0.4, attack: 0.01 });
  }
  /** Reactor shaft: falling doppler-like sweep + rumbling flare at the bottom. */
  fall() {
    if (!this.ready) return;
    this._tone(900, 3.2, { type: 'sine', slide: 70, gain: 0.12, attack: 0.05 });
    this._noise(3.2, { type: 'bandpass', f0: 1400, f1: 120, q: 1.2, gain: 0.15, attack: 0.1 });
  }
  reactorBoom() {
    if (!this.ready) return;
    this._tone(48, 2.4, { type: 'sine', slide: 24, gain: 0.7, attack: 0.01 });
    this._noise(2.6, { type: 'lowpass', f0: 1800, f1: 60, gain: 0.55, attack: 0.01 });
  }

  // ---------- music ----------
  /** Original dark orchestral-style bed: slow minor pads, low brass-like drones, march-pulse timpani. Not the Imperial March. */
  startMusic() {
    if (!this.ready || this.musicNodes) return;
    const ctx = this.ctx;
    const file = this._file('music', 0.5, true);
    if (file) { this.musicNodes = { file }; return; }
    const out = ctx.createGain(); out.gain.value = 0.0001; out.gain.setTargetAtTime(0.5, ctx.currentTime, 2.5);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.8;
    lp.connect(out); out.connect(this.bus);
    const chords = [[73.42, 110, 146.83, 174.61], [58.27, 87.31, 116.54, 146.83], [65.41, 98, 130.81, 155.56], [55, 82.41, 110, 138.59]]; // Dm, Bb, Gm(b), A
    const voices = [];
    for (let i = 0; i < 4; i++) {
      for (const type of ['sawtooth', 'sawtooth']) {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = chords[0][i]; o.detune.value = rand(-9, 9);
        const g = ctx.createGain(); g.gain.value = 0.055; o.connect(g); g.connect(lp); o.start(); voices.push(o);
      }
    }
    let step = 0;
    const tick = () => {
      if (!this.musicNodes || this.musicNodes.dead) return;
      const c = chords[Math.floor(step / 8) % chords.length], t = ctx.currentTime;
      voices.forEach((o, i) => o.frequency.setTargetAtTime(c[Math.floor(i / 2)], t, 0.7));
      lp.frequency.setTargetAtTime(500 + 350 * Math.sin(step * 0.4) + (step % 8 === 0 ? 300 : 0), t, 0.4);
      // marching timpani pulse: strong-weak-weak pattern (original rhythm)
      const acc = [1, 0, 0.55, 0, 0.55, 0, 0.8, 0.5][step % 8];
      if (acc) {
        this._tone(c[0] / 2, 0.9, { type: 'sine', slide: c[0] / 3.2, gain: 0.5 * acc, attack: 0.004 });
        this._noise(0.25, { type: 'lowpass', f0: 600, f1: 90, gain: 0.25 * acc, attack: 0.003 });
      }
      step++; this.musicNodes.timer = setTimeout(tick, 600);
    };
    this.musicNodes = { out, voices, timer: null };
    tick();
    this.report.synthesized.push('music');
  }
  stopMusic() {
    const m = this.musicNodes; if (!m) return; m.dead = true; clearTimeout(m.timer);
    if (m.out) { m.out.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4); setTimeout(() => m.voices.forEach((o) => { try { o.stop(); } catch {} }), 1500); }
    if (m.file) { try { m.file.s.stop(); } catch {} }
    this.musicNodes = null;
  }
}
