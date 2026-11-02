// 合成音效 + 轻量循环配乐。没有音频文件。
window.SFX = {
  ctx: null,
  muted: false,
  master: null,
  noiseBuf: null,
  _step: 0,
  _acc: 0,
  _kind: 'sun',
  init() {
    try { this.muted = localStorage.getItem('pf_mute') === '1'; } catch (e) { /* ignore */ }
  },
  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) {
      try { this.ctx = new AC(); } catch (e) { return null; }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      const n = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
      const d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = n;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem('pf_mute', this.muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (!this.muted) this.unlock();
    return this.muted;
  },
  _gain(v, t, dur) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.master);
    return g;
  },
  tone(freq, dur, type, vol, slide) {
    if (this.muted) return;
    const ctx = this.unlock();
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    o.connect(this._gain(vol, t, dur));
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq, q) {
    if (this.muted || !this.noiseBuf) return;
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 800;
    f.Q.value = q || 0.7;
    const g = this._gain(vol, t, dur);
    s.connect(f); f.connect(g);
    s.start(t); s.stop(t + dur);
  },
  jump() { this.tone(520, 0.09, 'square', 0.05, 280); },
  land() { this.noise(0.06, 0.04, 200, 0.6); },
  swing(kind) {
    if (kind === 'hammer') { this.noise(0.12, 0.07, 180, 0.5); this.tone(90, 0.14, 'sawtooth', 0.05, 50); }
    else if (kind === 'gun') { this.noise(0.05, 0.06, 1800, 0.8); this.tone(220, 0.04, 'square', 0.03, 80); }
    else if (kind === 'rocket') { this.noise(0.2, 0.08, 300, 0.4); this.tone(140, 0.18, 'sawtooth', 0.05, 40); }
    else if (kind === 'spear') { this.tone(660, 0.07, 'square', 0.04, 220); this.noise(0.05, 0.03, 1200, 1); }
    else { this.tone(740, 0.06, 'square', 0.04, 240); this.noise(0.05, 0.035, 900, 0.8); }
  },
  hit(heavy) {
    this.noise(heavy ? 0.09 : 0.04, heavy ? 0.07 : 0.045, heavy ? 240 : 500, 0.6);
    if (heavy) this.tone(70, 0.1, 'square', 0.04, 40);
  },
  hurt() { this.tone(180, 0.16, 'sawtooth', 0.06, 60); },
  coin() { this.tone(880, 0.06, 'square', 0.04); this.tone(1320, 0.08, 'square', 0.035); },
  heal() { this.tone(523, 0.08, 'triangle', 0.04); this.tone(659, 0.1, 'triangle', 0.04); this.tone(784, 0.12, 'triangle', 0.04); },
  dash() { this.noise(0.1, 0.05, 600, 0.5); this.tone(300, 0.08, 'square', 0.03, 700); },
  boom() { this.noise(0.28, 0.09, 120, 0.4); this.tone(60, 0.25, 'sine', 0.06, 30); },
  ui() { this.tone(660, 0.04, 'square', 0.03); },
  setBgm(kind) { this._kind = kind || 'sun'; this._step = 0; this._acc = 0; },
  update(dt) {
    if (this.muted || !this.ctx) return;
    this._acc += dt;
    const tempo = this._kind === 'snow' ? 0.34 : this._kind === 'storm' ? 0.26 : 0.22;
    if (this._acc < tempo) return;
    this._acc = 0;
    const sun = [523, 587, 659, 784, 659, 587, 698, 784];
    const storm = [220, 247, 196, 233, 175, 196, 165, 196];
    const snow = [784, 0, 880, 0, 698, 784, 0, 1046];
    const seq = this._kind === 'storm' ? storm : this._kind === 'snow' ? snow : sun;
    const f = seq[this._step % seq.length];
    this._step++;
    if (!f) return;
    const wave = this._kind === 'storm' ? 'triangle' : 'sine';
    this.tone(f, this._kind === 'snow' ? 0.28 : 0.18, wave, this._kind === 'storm' ? 0.02 : 0.018);
    if (this._step % 4 === 0) this.tone(f / 2, 0.3, 'sine', 0.012);
  },
};
