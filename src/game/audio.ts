// AETHERFALL audio — fully procedural WebAudio (no external assets). Music, ambience, SFX, dialogue blips, 5 volume buses.
type Mood = { root: number; scale: number[]; chords: number[][]; step: number; dens: number; pad: number; wave: OscillatorType; drum?: number; oct?: number };
const MOODS: Record<string, Mood> = {
  menu: { root: 50, scale: [0, 2, 3, 7, 8, 10], chords: [[0, 7, 12], [-4, 3, 8], [-2, 5, 10], [-5, 2, 7]], step: 0.62, dens: 0.35, pad: 0.8, wave: 'triangle' },
  day: { root: 55, scale: [0, 2, 4, 7, 9], chords: [[0, 7, 16], [5, 12, 16], [7, 14, 19], [-3, 4, 9]], step: 0.55, dens: 0.4, pad: 0.6, wave: 'triangle' },
  night: { root: 52, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 15], [-2, 5, 10], [-4, 3, 8], [-5, 2, 7]], step: 0.75, dens: 0.22, pad: 0.8, wave: 'sine' },
  village: { root: 57, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], step: 0.45, dens: 0.55, pad: 0.35, wave: 'triangle' },
  city: { root: 53, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 7, 12], [5, 12, 16], [7, 12, 19], [2, 9, 14]], step: 0.5, dens: 0.5, pad: 0.55, wave: 'square', oct: 0 },
  mountain: { root: 48, scale: [0, 2, 3, 7, 10], chords: [[0, 7, 14], [-2, 5, 12], [3, 10, 15], [-5, 2, 9]], step: 0.8, dens: 0.25, pad: 0.9, wave: 'sine' },
  coast: { root: 55, scale: [0, 2, 4, 7, 9], chords: [[0, 7, 11], [5, 12, 16], [2, 9, 14], [7, 14, 19]], step: 0.6, dens: 0.4, pad: 0.55, wave: 'sine' },
  ruin: { root: 45, scale: [0, 1, 3, 7, 8], chords: [[0, 7, 12], [-2, 5, 10], [1, 8, 13], [-4, 3, 8]], step: 0.9, dens: 0.18, pad: 1, wave: 'sine' },
  cave: { root: 41, scale: [0, 3, 6, 7], chords: [[0, 7], [-1, 6], [-3, 4], [0, 6]], step: 1, dens: 0.12, pad: 1, wave: 'sine' },
  rift: { root: 46, scale: [0, 1, 4, 6, 9, 11], chords: [[0, 6, 13], [1, 7, 14], [-1, 5, 11], [4, 10, 16]], step: 0.7, dens: 0.4, pad: 1, wave: 'sawtooth' },
  combat: { root: 45, scale: [0, 3, 5, 6, 7, 10], chords: [[0, 7, 12], [3, 10, 15], [-2, 5, 10], [-4, 3, 8]], step: 0.32, dens: 0.6, pad: 0.7, wave: 'sawtooth', drum: 1 },
  story: { root: 50, scale: [0, 2, 3, 5, 7, 8], chords: [[0, 7, 15], [-4, 3, 8], [-7, 0, 5], [-5, 2, 7]], step: 0.8, dens: 0.3, pad: 1, wave: 'triangle' },
};
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode; busM!: GainNode; busS!: GainNode; busA!: GainNode; busD!: GainNode; rev!: ConvolverNode; revSend!: GainNode;
  vols: Record<string, number> = { master: 0.8, music: 0.5, sfx: 0.7, amb: 0.6, dlg: 0.7 };
  muted = false;
  mood = 'menu'; step = 0; chordI = 0; nextT = 0; timer: any = null;
  noiseBuf!: AudioBuffer;
  amb: Record<string, { g: GainNode; target: number }> = {};
  ambT: Record<string, number> = { wind: 0, rain: 0, water: 0, crowd: 0, birds: 0, crickets: 0, cave: 0, fire: 0, thunder: 0 };
  lastHover = 0;
  onGesture = () => this.init();

  load(v: any) { if (v) { Object.assign(this.vols, v.vols || {}); this.muted = !!v.muted; } this.apply(); }
  save() { return { vols: this.vols, muted: this.muted }; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return;
      const ctx = new AC() as AudioContext; this.ctx = ctx;
      this.master = ctx.createGain(); this.master.connect(ctx.destination);
      const mk = () => { const g = ctx.createGain(); g.connect(this.master); return g; };
      this.busM = mk(); this.busS = mk(); this.busA = mk(); this.busD = mk();
      // reverb
      const len = ctx.sampleRate * 2.4, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      this.rev = ctx.createConvolver(); this.rev.buffer = ir; this.revSend = ctx.createGain(); this.revSend.gain.value = 0.5; this.revSend.connect(this.rev); this.rev.connect(this.busM);
      const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; this.noiseBuf = nb;
      this.apply(); this.buildAmbience();
      this.nextT = ctx.currentTime + 0.2; this.timer = setInterval(() => this.tick(), 120);
    } catch (e) { console.warn('audio init failed', e); }
  }
  apply() {
    if (!this.ctx) return; const t = this.ctx.currentTime, v = this.vols, m = this.muted ? 0 : 1;
    this.master.gain.setTargetAtTime(v.master * m, t, 0.05); this.busM.gain.setTargetAtTime(v.music * 0.55, t, 0.05); this.busS.gain.setTargetAtTime(v.sfx, t, 0.05); this.busA.gain.setTargetAtTime(v.amb * 0.7, t, 0.05); this.busD.gain.setTargetAtTime(v.dlg, t, 0.05);
  }
  setVol(k: string, v: number) { this.vols[k] = v; this.apply(); }
  setMuted(m: boolean) { this.muted = m; this.apply(); }
  setMood(m: string) { if (MOODS[m]) this.mood = m; }
  buildAmbience() {
    const ctx = this.ctx!;
    const layer = (name: string, type: BiquadFilterType, f: number, q: number, lfo?: number) => {
      const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.playbackRate.value = 0.8 + Math.random() * 0.4;
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0;
      s.connect(fl); fl.connect(g); g.connect(this.busA); s.start();
      if (lfo) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = lfo; og.gain.value = f * 0.35; o.connect(og); og.connect(fl.frequency); o.start(); }
      this.amb[name] = { g, target: 0 };
    };
    layer('wind', 'lowpass', 500, 0.7, 0.13); layer('rain', 'highpass', 2600, 0.5); layer('water', 'bandpass', 700, 0.8, 0.4); layer('crowd', 'bandpass', 420, 1.2, 0.7); layer('fire', 'bandpass', 1600, 2, 7);
  }
  setAmbient(o: Record<string, number>) { for (const k in o) this.ambT[k] = o[k]; }
  // ---------- primitives
  tone(f: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, slide = 0, delay = 0, bus?: GainNode, rev = 0) {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.busS); if (rev) { const s = ctx.createGain(); s.gain.value = rev; g.connect(s); s.connect(this.revSend); } o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur: number, ft: BiquadFilterType, f: number, vol = 0.2, f2 = 0, q = 1, delay = 0, bus?: GainNode) {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime + delay, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noiseBuf; s.playbackRate.value = 0.7 + Math.random() * 0.6; fl.type = ft; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.015, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(bus || this.busS); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // ---------- SFX
  sfx(n: string, p = 1) {
    if (!this.ctx) return; const T = (f: number, d: number, ty: OscillatorType = 'sine', v = 0.15, s = 0, dl = 0, r = 0) => this.tone(f, d, ty, v, s, dl, undefined, r);
    switch (n) {
      case 'click': T(520, 0.07, 'triangle', 0.1); T(780, 0.05, 'sine', 0.05, 0, 0.02); break;
      case 'hover': { const now = performance.now(); if (now - this.lastHover < 60) return; this.lastHover = now; T(1100, 0.035, 'sine', 0.025); break; }
      case 'open': T(300, 0.18, 'triangle', 0.1, 200); T(600, 0.2, 'sine', 0.06, 200, 0.05, 0.2); break;
      case 'close': T(520, 0.16, 'triangle', 0.09, -250); break;
      case 'tab': T(660, 0.05, 'triangle', 0.08); T(880, 0.05, 'triangle', 0.06, 0, 0.04); break;
      case 'equip': this.noise(0.12, 'bandpass', 2400, 0.15, 900, 3); T(330, 0.1, 'square', 0.05, 200); T(660, 0.1, 'triangle', 0.08, 0, 0.06); break;
      case 'unequip': this.noise(0.1, 'bandpass', 1200, 0.12, 2400, 3); T(440, 0.09, 'triangle', 0.06, -150); break;
      case 'error': T(160, 0.18, 'square', 0.09, -40); T(130, 0.2, 'square', 0.08, -30, 0.1); break;
      case 'confirm': T(523, 0.1, 'triangle', 0.1); T(784, 0.18, 'triangle', 0.1, 0, 0.09, 0.3); break;
      case 'cancel': T(400, 0.1, 'triangle', 0.08, -140); break;
      case 'notify': T(880, 0.12, 'sine', 0.08, 0, 0, 0.3); T(1175, 0.2, 'sine', 0.07, 0, 0.1, 0.4); break;
      case 'quest': [392, 494, 587, 784].forEach((f, i) => T(f, 0.28, 'triangle', 0.09, 0, i * 0.1, 0.5)); break;
      case 'unlock': [523, 659, 784, 1047].forEach((f, i) => T(f, 0.3, 'sine', 0.09, 0, i * 0.08, 0.6)); break;
      case 'levelup': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => T(f, 0.45, 'triangle', 0.1, 0, i * 0.09, 0.7)); break;
      case 'pickup': T(700, 0.08, 'sine', 0.09, 500); break;
      case 'coin': T(1568, 0.07, 'square', 0.04); T(2093, 0.14, 'square', 0.04, 0, 0.06); break;
      case 'step_grass': this.noise(0.09, 'bandpass', 700 + Math.random() * 300, 0.07 * p, 400, 1.5); break;
      case 'step_stone': this.noise(0.06, 'highpass', 1500 + Math.random() * 600, 0.08 * p, 0, 1); T(160, 0.04, 'triangle', 0.04 * p); break;
      case 'step_wood': this.noise(0.07, 'bandpass', 380 + Math.random() * 100, 0.12 * p, 220, 2); T(110, 0.06, 'triangle', 0.06 * p); break;
      case 'step_snow': this.noise(0.14, 'lowpass', 900, 0.08 * p, 300, 0.6); break;
      case 'step_sand': this.noise(0.1, 'bandpass', 1300, 0.05 * p, 700, 0.8); break;
      case 'step_water': this.noise(0.18, 'bandpass', 1200, 0.1 * p, 2400, 1.2); break;
      case 'splash': this.noise(0.4, 'bandpass', 800, 0.25, 3000, 0.8); break;
      case 'swing': this.noise(0.2, 'bandpass', 600, 0.14, 2800, 1.5); break;
      case 'hit': this.noise(0.12, 'lowpass', 1500, 0.22, 200, 1); T(120, 0.14, 'square', 0.1, -70); break;
      case 'hurt': T(220, 0.2, 'sawtooth', 0.1, -120); this.noise(0.1, 'lowpass', 900, 0.14); break;
      case 'block': this.noise(0.1, 'bandpass', 2600, 0.2, 1200, 4); T(900, 0.12, 'square', 0.05, -400); break;
      case 'bow': T(180, 0.12, 'triangle', 0.1, 200); this.noise(0.15, 'highpass', 3000, 0.08, 1500); break;
      case 'jump': this.noise(0.1, 'bandpass', 500, 0.05, 900); break;
      case 'land': this.noise(0.16, 'lowpass', 400, 0.18 * p, 100); break;
      case 'glide': this.noise(0.5, 'bandpass', 900, 0.1, 2200, 0.7); break;
      case 'roll': this.noise(0.3, 'bandpass', 500, 0.1, 1200, 0.8); break;
      case 'spell_fire': this.noise(0.5, 'bandpass', 700, 0.22, 2500, 0.8); T(200, 0.4, 'sawtooth', 0.08, 300, 0, 0.3); break;
      case 'spell_ice': T(1800, 0.4, 'sine', 0.1, -900, 0, 0.5); T(2600, 0.3, 'triangle', 0.05, -1400, 0.04, 0.5); this.noise(0.3, 'highpass', 4000, 0.07); break;
      case 'spell_lightning': this.noise(0.25, 'highpass', 3000, 0.25, 800, 0.6); T(90, 0.3, 'sawtooth', 0.1, 600, 0, 0.3); T(1200, 0.06, 'square', 0.06, -800, 0.06); break;
      case 'spell_earth': this.noise(0.5, 'lowpass', 400, 0.3, 80, 0.7); T(60, 0.4, 'triangle', 0.18, -30); break;
      case 'spell_wind': this.noise(0.7, 'bandpass', 500, 0.2, 2000, 0.6); break;
      case 'spell_heal': [659, 784, 988].forEach((f, i) => T(f, 0.5, 'sine', 0.08, 0, i * 0.07, 0.8)); break;
      case 'spell_protect': T(330, 0.6, 'triangle', 0.08, 220, 0, 0.7); T(495, 0.6, 'sine', 0.06, 330, 0.05, 0.7); break;
      case 'spell_holy': [523, 784, 1047].forEach((f, i) => T(f, 0.6, 'triangle', 0.08, 0, i * 0.05, 0.9)); this.noise(0.3, 'highpass', 3500, 0.05); break;
      case 'spell_aether': T(140, 0.8, 'sawtooth', 0.08, 700, 0, 0.8); T(700, 0.6, 'sine', 0.07, -600, 0.2, 0.9); break;
      case 'spell_phys': this.noise(0.2, 'bandpass', 800, 0.14, 300, 1.5); break;
      case 'explode': this.noise(0.6, 'lowpass', 1200, 0.35, 60, 0.8); T(70, 0.5, 'sawtooth', 0.15, -40); break;
      case 'whinny': { T(500, 0.35, 'sawtooth', 0.07, 700); T(1100, 0.3, 'triangle', 0.04, -500, 0.12); break; }
      case 'growl': T(80, 0.5, 'sawtooth', 0.12, -20); this.noise(0.4, 'lowpass', 400, 0.1); break;
      case 'howl': T(300, 1.6, 'sine', 0.08, 300, 0, 0.9); T(450, 1.6, 'sine', 0.04, 250, 0.1, 0.9); break;
      case 'door': this.noise(0.25, 'lowpass', 500, 0.2, 120, 1); T(90, 0.2, 'triangle', 0.12, -30); break;
      case 'craft': for (let i = 0; i < 3; i++) { this.noise(0.08, 'bandpass', 3200, 0.2, 2000, 5, i * 0.18); T(900, 0.2, 'triangle', 0.05, 0, i * 0.18, 0.4); } break;
      case 'chest': this.noise(0.25, 'lowpass', 600, 0.15, 150); T(300, 0.3, 'triangle', 0.08, 200, 0.1, 0.4); break;
      case 'sit': this.noise(0.15, 'lowpass', 400, 0.08); break;
      case 'eat': this.noise(0.06, 'bandpass', 1500, 0.1); this.noise(0.06, 'bandpass', 1200, 0.1, 0, 1, 0.1); break;
      case 'drink': for (let i = 0; i < 3; i++) T(300 + i * 40, 0.1, 'sine', 0.05, 80, i * 0.12); break;
      case 'thunder': this.noise(2.2, 'lowpass', 300, 0.5, 40, 0.6); break;
      case 'fish': this.noise(0.3, 'bandpass', 1500, 0.15, 700, 1); T(700, 0.15, 'sine', 0.08, -400); break;
      case 'mount': T(250, 0.18, 'triangle', 0.1, 120); this.noise(0.12, 'lowpass', 500, 0.1); break;
      case 'portal': T(80, 1.6, 'sawtooth', 0.14, 900, 0, 0.9); T(1200, 1.2, 'sine', 0.08, -900, 0.3, 0.9); break;
      case 'boss': T(55, 2, 'sawtooth', 0.2, -10, 0, 0.5); T(82, 2, 'sawtooth', 0.12, -10, 0.1, 0.5); break;
      case 'sleep': [392, 330, 262].forEach((f, i) => T(f, 0.8, 'sine', 0.07, 0, i * 0.4, 0.9)); break;
      case 'tap': T(1200, 0.03, 'sine', 0.05); break;
    }
  }
  blip(pitch = 1, n = 1) { if (!this.ctx) return; for (let i = 0; i < n; i++) this.tone((180 + Math.random() * 90) * pitch, 0.07, 'triangle', 0.07, 0, i * 0.075, this.busD); }
  // ---------- music + ambience scheduler
  tick() {
    const ctx = this.ctx; if (!ctx) return; const m = MOODS[this.mood] || MOODS.day;
    // ambience smoothing
    const t = ctx.currentTime;
    for (const k in this.amb) { const mx: Record<string, number> = { wind: 0.5, rain: 0.35, water: 0.28, crowd: 0.22, fire: 0.12 }; this.amb[k].g.gain.setTargetAtTime((this.ambT[k] || 0) * (mx[k] || 0.3), t, 0.8); }
    // random one-shots
    const dt = 0.12;
    if (this.ambT.birds > 0 && Math.random() < dt * 0.9 * this.ambT.birds) { const f = 2200 + Math.random() * 1800; const n = 2 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) this.tone(f * (1 + Math.random() * 0.2), 0.07, 'sine', 0.035 * this.ambT.birds, 400, i * 0.09, this.busA); }
    if (this.ambT.crickets > 0 && Math.random() < dt * 1.5 * this.ambT.crickets) for (let i = 0; i < 4; i++) this.tone(4300, 0.025, 'square', 0.008, 0, i * 0.04, this.busA);
    if (this.ambT.cave > 0 && Math.random() < dt * 0.6) this.tone(900 + Math.random() * 400, 0.12, 'sine', 0.04, -300, 0, this.busA, 0.9);
    if (this.ambT.thunder > 0 && Math.random() < dt * 0.08) this.sfx('thunder');
    // music
    while (this.nextT < t + 0.5) {
      const st = m.step, s = this.step;
      if (s % 8 === 0) { const ch = m.chords[this.chordI % m.chords.length]; this.chordI++; ch.forEach((n, i) => this.padNote(m.root + n - 12 + (i === 0 ? 0 : 0), st * 8.5, m.pad, m.wave, this.nextT)); }
      if (Math.random() < m.dens) { const n = m.scale[Math.floor(Math.random() * m.scale.length)] + (Math.random() < 0.5 ? 12 : 24) + (m.oct || 0); this.pluck(mtof(m.root + n), this.nextT + Math.random() * 0.1, 0.16 + Math.random() * 0.05); }
      if (m.drum && s % 4 === 0) this.drum(this.nextT, s % 8 === 0);
      this.nextT += st; this.step++;
    }
  }
  padNote(midi: number, dur: number, vol: number, wave: OscillatorType, when: number) {
    const ctx = this.ctx!, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = wave === 'square' ? 'triangle' : wave; o2.type = 'sine'; o.frequency.value = mtof(midi); o2.frequency.value = mtof(midi) * 1.004; f.type = 'lowpass'; f.frequency.value = wave === 'sawtooth' ? 700 : 1100;
    g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(0.07 * vol, when + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, when + dur);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.busM); const s = ctx.createGain(); s.gain.value = 0.4; g.connect(s); s.connect(this.revSend);
    o.start(when); o2.start(when); o.stop(when + dur + 0.1); o2.stop(when + dur + 0.1);
  }
  pluck(f: number, when: number, vol: number) {
    const ctx = this.ctx!, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vol * 0.35, when + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, when + 1.6);
    o.connect(g); g.connect(this.busM); const s = ctx.createGain(); s.gain.value = 0.7; g.connect(s); s.connect(this.revSend); o.start(when); o.stop(when + 1.7);
  }
  drum(when: number, strong: boolean) {
    const ctx = this.ctx!, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(strong ? 110 : 90, when); o.frequency.exponentialRampToValueAtTime(40, when + 0.25);
    g.gain.setValueAtTime(strong ? 0.35 : 0.2, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3); o.connect(g); g.connect(this.busM); o.start(when); o.stop(when + 0.35);
  }
}
export const audio = new AudioEngine();
