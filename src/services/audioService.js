/**
 * Web Audio API synthesizer for zero-latency, zero-asset game sound effects and haptics.
 * Fully offline, lightweight, and optimized for budget plant mobile devices.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const soundEffects = {
  // Lane shift whoosh/blip
  playLaneSwitch: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);

      if (navigator.vibrate) navigator.vibrate(25);
    } catch {
      // Audio autoplay policy fallback
    }
  },

  // Correct answer chime (crisp industrial bell)
  playCorrect: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.2, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.35);
      });

      if (navigator.vibrate) navigator.vibrate([40, 30, 60]);
    } catch {}
  },

  // Wrong answer thud
  playWrong: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);

      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } catch {}
  },

  // Streak combo bonus sound (ascending energetic arpeggio)
  playStreak: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.2, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.3);
      });
    } catch {}
  },

  // Countdown beep
  playCountdownBeep: (isFinal = false) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isFinal ? 880 : 440, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isFinal ? 0.4 : 0.15));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + (isFinal ? 0.4 : 0.15));
    } catch {}
  },

  // Cinematic Brand Intro (Deep sub-bass impact + warm harmonic swell + shimmer)
  playCinematicIntro: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 1. Deep Sub-bass Impact & Swell
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(42, now);
      subOsc.frequency.exponentialRampToValueAtTime(75, now + 1.2);
      subOsc.frequency.exponentialRampToValueAtTime(38, now + 3.4);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.exponentialRampToValueAtTime(0.35, now + 0.9);
      subGain.gain.exponentialRampToValueAtTime(0.18, now + 2.2);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 3.7);

      // 2. Harmonic Chord Swell (D-A-D-F#)
      const chord = [146.83, 220.00, 293.66, 370.00, 587.33];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq * 0.985, now);
        osc.frequency.exponentialRampToValueAtTime(freq, now + 1.1);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, now);
        filter.frequency.exponentialRampToValueAtTime(2200, now + 1.3);
        filter.frequency.exponentialRampToValueAtTime(500, now + 3.4);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.09 / (idx + 1), now + 1.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + 3.5);
      });

      // 3. High-frequency Crystal Shimmer Bell at peak
      const bellOsc = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(1174.66, now + 0.9);
      bellOsc.frequency.exponentialRampToValueAtTime(880, now + 2.8);

      bellGain.gain.setValueAtTime(0.001, now);
      bellGain.gain.setValueAtTime(0.06, now + 0.9);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

      bellOsc.connect(bellGain);
      bellGain.connect(ctx.destination);
      bellOsc.start(now + 0.9);
      bellOsc.stop(now + 3.1);

      if (navigator.vibrate) navigator.vibrate([30, 40, 80]);
    } catch {
      // Audio autoplay policy fallback
    }
  },

  // ═══ GAME 2: NSK Plant Arena Repair Sound Synthesizer ═══

  // Wooden crate smash (heavy mechanical wood splinter crash)
  playCrateSmash: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Low punch impact
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);

      // Noise/wood crack splinter
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(800, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);

      if (navigator.vibrate) navigator.vibrate([60, 20, 40]);
    } catch {}
  },

  // NSK Precision Bearing Pickup (bright high-pitch chrome chime)
  playBearingPickup: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [880, 1318.51, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.18, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.22);
      });
      if (navigator.vibrate) navigator.vibrate(20);
    } catch {}
  },

  // Machine Emergency Alarm Siren (urgent two-tone factory klaxon)
  playAlarmSiren: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.setValueAtTime(950, now + 0.15);
      osc.frequency.setValueAtTime(700, now + 0.3);
      osc.frequency.setValueAtTime(950, now + 0.45);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    } catch {}
  },

  // Successful Machine Repair & Drone EMP Neutralization (triumphant electric surge)
  playRepairSuccess: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // EMP zap / electric wave
      const zapOsc = ctx.createOscillator();
      const zapGain = ctx.createGain();
      zapOsc.type = 'sawtooth';
      zapOsc.frequency.setValueAtTime(1800, now);
      zapOsc.frequency.exponentialRampToValueAtTime(180, now + 0.25);
      zapGain.gain.setValueAtTime(0.25, now);
      zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      zapOsc.connect(zapGain);
      zapGain.connect(ctx.destination);
      zapOsc.start(now);
      zapOsc.stop(now + 0.25);

      // Harmonious restoration chord
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + 0.1 + idx * 0.05);
        gain.gain.setValueAtTime(0.2, now + 0.1 + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + idx * 0.05 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.1 + idx * 0.05);
        osc.stop(now + 0.1 + idx * 0.05 + 0.45);
      });

      if (navigator.vibrate) navigator.vibrate([50, 40, 90]);
    } catch {}
  },

  // Machine Failure Explosion
  playMachineFailure: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.5);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
      if (navigator.vibrate) navigator.vibrate([150, 60, 200]);
    } catch {}
  },
};

export default soundEffects;
