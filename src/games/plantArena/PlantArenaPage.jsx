import { useCallback, useEffect, useRef, useState } from 'react';
import layout from './data/factoryLayout.json';
import { GameEngine } from './engine/GameEngine.js';
import { RULES } from './engine/arenaGameStore.js';
import { audio } from './audio/audioService.js';
import VirtualJoystick from './ui/VirtualJoystick.jsx';
import { TopBar, StatusBlock, SmartActionButton, MiniMap, JoystickCoach } from './ui/PlantArenaHUD.jsx';
import { requestFullscreen } from '../../utils/fullscreen';
import './ui/plantArena.css';

/**
 * Game 2 — NSK Plant Arena Repair.
 *
 * Props (all optional):
 *  - employeeId:    shown top-left, passed back with the score
 *  - onSubmitScore: async ({ game, score, repairs, integrity, timeLeft, result, reason, employeeId }) => void
 *                   called once per finished run; wire it to your leaderboard (e.g. Supabase submitScore)
 *  - onExit:        () => void, for the Exit button (e.g. navigate back to the hub)
 *  - quality:       'low' | 'high' to force a tier; omitted = auto-detect + auto-downgrade
 *  - seed:          number, makes runs repeatable (testing)
 *  - autoplay:      true runs a simple bot (testing / attract mode)
 */
// One source for the thumbstick size, so the coach's cut-out lands exactly on
// the stick instead of drifting from it.
const JOY_RADIUS = 56;

export default function PlantArenaPage({ employeeId = 'NSK-GUEST', onSubmitScore, onExit, quality, seed, autoplay = false }) {
  const canvasRef = useRef(null);
  const markersRef = useRef(null);
  const engineRef = useRef(null);
  const [engine, setEngine] = useState(null);
  const [runId, setRunId] = useState(0);
  const [snap, setSnap] = useState(null);
  const [banner, setBanner] = useState(null);
  const [toast, setToast] = useState(null);
  const [muted, setMuted] = useState(audio.muted);
  const [opening, setOpening] = useState(false);
  const [coaching, setCoaching] = useState(false);
  // Mirrored in a ref so the joystick's engage handler can read it without
  // being rebuilt on every change, and without a state updater having to do
  // the reading for it.
  const coachingRef = useRef(false);
  const submitted = useRef(false);

  // Create a fresh engine per run.
  useEffect(() => {
    const onEvent = (e) => {
      switch (e.type) {
        case 'crateSmashed': audio.smash(); break;
        case 'bearingCollected': audio.pickup(); break;
        case 'machineRepaired': audio.repair(); break;
        case 'machineAttacked': audio.attack(); break;
        case 'machineFailed': audio.fail(); setToast('APPLICATION FAILED!'); break;
        case 'needBearings': audio.needBearings(); setToast('FIND AN NSK CRATE FOR BEARINGS'); break;
        case 'waveStarted':
          audio.wave();
          setBanner(e.final ? 'FINAL WAVE · ALL-OUT SWARM!' : `WAVE ${e.wave + 1} · ${e.name.toUpperCase()}`);
          if (e.final) audio.startSiren();
          break;
        case 'gameOver':
          audio.stopSiren();
          if (e.result === 'won') audio.win(); else audio.lose();
          break;
        default:
      }
    };
    const eng = new GameEngine(canvasRef.current, layout, { quality, seed, onEvent });
    if (autoplay) eng.autopilot = makeAutopilot(eng);
    if (autoplay || import.meta.env?.DEV) window.__plantArena = eng; // handy in devtools
    eng.setMarkersLayer(markersRef.current);
    engineRef.current = eng;
    setEngine(eng);
    setSnap(eng.snapshot());
    submitted.current = false;
    const id = setInterval(() => setSnap(eng.snapshot()), 25);
    return () => {
      clearInterval(id);
      audio.stopSiren();
      eng.dispose();
      if (window.__plantArena === eng) delete window.__plantArena;
      engineRef.current = null;
    };
  }, [runId, quality, seed, autoplay]);

  useEffect(() => { if (banner) { const t = setTimeout(() => setBanner(null), 2200); return () => clearTimeout(t); } return undefined; }, [banner]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 1600); return () => clearTimeout(t); } return undefined; }, [toast]);
  // Opening call to action: shown for three seconds as the run starts,
  // then out of the way. It used to sit there until the first crate was
  // smashed, which left it on screen during play.
  useEffect(() => { if (!opening) return undefined; const t = setTimeout(() => setOpening(false), 3000); return () => clearTimeout(t); }, [opening]);

  // Report the score once when a run ends.
  useEffect(() => {
    if (!snap || submitted.current || (snap.phase !== 'won' && snap.phase !== 'lost')) return;
    submitted.current = true;
    onSubmitScore?.({
      game: 'plant-arena-repair',
      score: snap.score,
      repairs: snap.repairs,
      integrity: snap.integrity,
      timeLeft: Math.round(snap.timeLeft),
      result: snap.phase,
      reason: snap.result?.reason,
      employeeId,
    });
  }, [snap, onSubmitScore, employeeId]);

  // Autoplay starts on its own; this is only for tests and attract mode.
  useEffect(() => { if (autoplay && engine) engine.start(); }, [autoplay, engine]);

  const start = useCallback(() => {
    // The coach comes first and the crate hint follows it, so the two are never
    // on screen together. The 5 s opening grace covers this, with no drones out.
    coachingRef.current = true;
    setCoaching(true);
    audio.unlock();
    requestFullscreen().catch(() => {});
    if (screen.orientation?.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
    engineRef.current?.start();
  }, []);

  const press = useCallback(() => {
    engineRef.current?.act();
    if (engineRef.current) setSnap(engineRef.current.snapshot());
  }, []);
  const joy = useCallback((x, z) => engineRef.current?.setJoystick(x, z), []);
  const joyEngaged = useCallback(() => {
    if (!coachingRef.current) return;
    coachingRef.current = false;
    setCoaching(false);
    setOpening(true); // hand over to the crate hint
  }, []);

  const phase = snap?.phase ?? 'ready';
  return (
    <div className="pa-root">
      <canvas ref={canvasRef} className="pa-canvas" />
      <div ref={markersRef} className="pa-markers" />
      {snap && phase === 'playing' && (
        <div className="pa-hud">
          <TopBar snap={snap} sessionSeconds={RULES.sessionSeconds} />
          <StatusBlock snap={snap} />
          <MiniMap engine={engine} layout={layout} />
          {opening && <div className="pa-hint"><span>SMASH THE WOODEN CRATE</span></div>}
          {banner && !coaching && <div className="pa-banner">{banner}</div>}
          {toast && <div className="pa-toast">{toast}</div>}
          {coaching && <JoystickCoach size={JOY_RADIUS * 2} />}
          <VirtualJoystick onChange={joy} onEngage={joyEngaged} radius={JOY_RADIUS} />
          <SmartActionButton action={snap.action} onPress={press} />
        </div>
      )}

      {phase === 'ready' && (
        <div className="pa-overlay">
          <div className="pa-tut">
            <h1 className="pa-tut-title">PLANT ARENA</h1>
            <div className="pa-tut-rule" />

            <ol className="pa-tut-steps">
              <li><span className="pa-tut-n">1</span><span>Enemy Drones <b>(Dust &amp; Contamination)</b> attack the applications</span></li>
              <li><span className="pa-tut-n">2</span><span>Smash crates to find <b>Bearings</b></span></li>
              <li><span className="pa-tut-n">3</span><span>Only crates stamped <b>NSK</b> hold one</span></li>
              <li><span className="pa-tut-n">4</span><span>Repair <b>Failing Applications</b> before their timer runs out</span></li>
            </ol>

            <button type="button" className="pa-tut-play" onClick={start}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor" /></svg>
              <span>PLAY</span>
            </button>
          </div>
        </div>
      )}

      {(phase === 'won' || phase === 'lost') && snap && (
        <div className="pa-overlay">
          <div className={`pa-card ${phase === 'won' ? 'pa-won' : 'pa-lost'}`}>
            <div className="pa-kicker">{phase === 'won' ? (snap.result?.reason === 'time' ? 'PLANT SURVIVED' : 'MISSION COMPLETE') : 'PLANT SHUTDOWN'}</div>
            <h1>{phase === 'won' ? 'VICTORY!' : 'DEFEAT'}</h1>
            <div className="pa-stats">
              <div><span>REPAIRS</span><b>{snap.repairs}</b></div>
              <div><span>INTEGRITY</span><b>{snap.integrity}%</b></div>
              <div><span>TIME LEFT</span><b>{Math.round(snap.timeLeft)}s</b></div>
            </div>
            <div className="pa-score">SCORE <b>{snap.score.toLocaleString()}</b></div>
            <div className="pa-row">
              <button type="button" className="pa-btn pa-btn-go" onClick={() => setRunId((r) => r + 1)}>PLAY AGAIN</button>
              {onExit && <button type="button" className="pa-btn" onClick={onExit}>EXIT</button>}
            </div>
          </div>
        </div>
      )}
      <div className="pa-rotate">
        <div>
          <svg className="pa-rotate-icon" viewBox="0 0 48 32" aria-hidden="true">
            <rect x="1.5" y="1.5" width="45" height="29" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
            <rect x="7" y="7" width="34" height="18" rx="2" fill="currentColor" opacity="0.25" />
          </svg>
          Rotate your phone to landscape to play
        </div>
      </div>
    </div>
  );
}

// Simple bot used for automated test runs: fetch bearings, then fix the most
// urgent machine. Steers around benches by sidestepping when blocked.
function makeAutopilot(engine) {
  let lastPos = null;
  let stuckFor = 0;
  let side = 1;
  return (s) => {
    const p = s.player;
    const attacked = s.machines.filter((m) => m.status === 'attacked').sort((a, b) => a.timer - b.timer);
    let target = null;
    const freePickup = s.pickups.filter((k) => !k.collected).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).at(0);
    if (s.action.kind === 'repair' || s.action.kind === 'smash') { engine.act(); }
    if (freePickup && s.bearings < 5) target = { x: freePickup.x, z: freePickup.z };
    else if (s.bearings > 0 && attacked.length) target = { x: attacked[0].x, z: attacked[0].z + 2.6 };
    else {
      const crate = s.crates.filter((c) => c.nsk && !c.smashed).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).at(0);
      if (crate) target = { x: crate.x + (p.x > crate.x ? 1.3 : -1.3), z: crate.z };
    }
    if (!target) return { x: 0, z: 0 };
    let dx = target.x - p.x, dz = target.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) return { x: 0, z: 0 };
    dx /= d; dz /= d;
    if (lastPos && Math.hypot(p.x - lastPos.x, p.z - lastPos.z) < 0.02) stuckFor += 1; else stuckFor = Math.max(0, stuckFor - 1);
    lastPos = { x: p.x, z: p.z };
    if (stuckFor > 6) { if (stuckFor > 60) { side = -side; stuckFor = 7; } return { x: -dz * side + dx * 0.2, z: dx * side + dz * 0.2 }; }
    return { x: dx, z: dz };
  };
}
