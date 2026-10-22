// Tiny Web Audio synthesiser for game cues: no files to download.
// Call unlock() from a user tap (browsers block audio until then).
let ctx = null;
let master = null;
let muted = false;
let sirenNodes = null;
let attackNodes = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  return ctx;
}

function tone(freq, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0 } = {}) {
  if (!ensure() || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.3, filter = 1200, delay = 0 } = {}) {
  if (!ensure() || muted) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filter;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export const audio = {
  unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
  setMuted(m) { muted = m; if (m) { this.stopSiren(); this.stopAttackLoop(); } },
  get muted() { return muted; },
  smash() { noise(0.25, { vol: 0.5, filter: 900 }); tone(140, 0.12, { type: 'triangle', vol: 0.25, slide: -60 }); },
  pickup() { tone(660, 0.08, { vol: 0.12 }); tone(990, 0.12, { vol: 0.12, delay: 0.07 }); },
  repair() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, { type: 'triangle', vol: 0.18, delay: i * 0.07 })); },
  needBearings() { tone(220, 0.15, { vol: 0.15 }); tone(180, 0.2, { vol: 0.15, delay: 0.12 }); },
  // Machine under attack. A two-note klaxon over a low thud: the pair of quiet
  // high blips this replaces was inaudible under the siren and the engine hum,
  // so players never heard the one cue that says "go now".
  attack() {
    noise(0.16, { vol: 0.3, filter: 2000 });
    tone(320, 0.26, { type: 'sawtooth', vol: 0.3, slide: -120 });
    tone(320, 0.26, { type: 'sawtooth', vol: 0.3, slide: -120, delay: 0.28 });
    tone(95, 0.44, { type: 'triangle', vol: 0.24, slide: -35, delay: 0.02 });
  },
  fail() { noise(0.6, { vol: 0.4, filter: 400 }); tone(110, 0.6, { type: 'sawtooth', vol: 0.2, slide: -60 }); },
  wave() { tone(392, 0.12, { vol: 0.15 }); tone(587, 0.2, { vol: 0.15, delay: 0.12 }); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.2, delay: i * 0.11 })); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { type: 'sawtooth', vol: 0.15, delay: i * 0.18 })); },
  startSiren() {
    if (!ensure() || muted || sirenNodes) return;
    const o = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 620;
    lfo.frequency.value = 0.9;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(o.frequency);
    g.gain.value = 0.035;
    o.connect(g).connect(master);
    o.start();
    lfo.start();
    sirenNodes = { o, lfo };
  },
  stopSiren() {
    if (!sirenNodes) return;
    sirenNodes.o.stop();
    sirenNodes.lfo.stop();
    sirenNodes = null;
  },

  /**
   * Low throb that runs for as long as any rig is under attack. Deliberately
   * mild: the klaxon already marks the moment a rig is hit, so this only has to
   * say "something is still wrong" without talking over the game.
   */
  startAttackLoop() {
    if (!ensure() || muted || attackNodes) return;
    const o = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    o.type = 'sawtooth';
    o.frequency.value = 146;
    sub.type = 'sine';
    sub.frequency.value = 73;
    // Slow swell rather than a wail: 0.55 Hz in and out.
    lfo.frequency.value = 0.55;
    lfoGain.gain.value = 0.016;
    g.gain.value = 0.022;
    lfo.connect(lfoGain).connect(g.gain);
    o.connect(lp);
    sub.connect(lp);
    lp.connect(g).connect(master);
    o.start();
    sub.start();
    lfo.start();
    attackNodes = { o, sub, lfo };
  },
  stopAttackLoop() {
    if (!attackNodes) return;
    attackNodes.o.stop();
    attackNodes.sub.stop();
    attackNodes.lfo.stop();
    attackNodes = null;
  },
};
