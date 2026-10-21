import { useCallback, useEffect, useRef, useState } from 'react';
import layout from './data/factoryLayout.json';
import { GameEngine } from './engine/GameEngine.js';
import { RULES } from './engine/arenaGameStore.js';
import { audio } from './audio/audioService.js';
import VirtualJoystick from './ui/VirtualJoystick.jsx';
import { TopBar, StatusBlock, SmartActionButton, MiniMap } from './ui/PlantArenaHUD.jsx';
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
  const submitted = useRef(false);

  // Create a fresh engine per run.
  useEffect(() => {
    const onEvent = (e) => {
      switch (e.type) {
        case 'crateSmashed': audio.smash(); break;
        case 'bearingCollected': audio.pickup(); break;
        case 'machineRepaired': audio.repair(); break;
        case 'machineAttacked': audio.attack(); break;
        case 'machineFailed': audio.fail(); setToast('MACHINE FAILED!'); break;
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
    const id = setInterval(() => setSnap(eng.snapshot()), 100);
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
    audio.unlock();
    const el = document.documentElement;
    if (matchMedia('(pointer: coarse)').matches && el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
    }
    engineRef.current?.start();
  }, []);

  const press = useCallback(() => { engineRef.current?.act(); }, []);
  const joy = useCallback((x, z) => engineRef.current?.setJoystick(x, z), []);

  const phase = snap?.phase ?? 'ready';
  return (
    <div className="pa-root">
      <canvas ref={canvasRef} className="pa-canvas" />
      <div ref={markersRef} className="pa-markers" />
      {snap && phase === 'playing' && (
        <div className="pa-hud">
          <TopBar snap={snap} employee={employeeId} sessionSeconds={RULES.sessionSeconds} />
          <StatusBlock snap={snap} />
          <MiniMap engine={engine} layout={layout} />
          <button type="button" className="pa-mute" onClick={() => { audio.setMuted(!muted); setMuted(!muted); }}>
            {muted ? '🔇' : '🔊'}
          </button>
          {banner && <div className="pa-banner">{banner}</div>}
          {toast && <div className="pa-toast">{toast}</div>}
          <VirtualJoystick onChange={joy} />
          <SmartActionButton action={snap.action} onPress={press} />
        </div>
      )}

      {phase === 'ready' && (
        <div className="pa-overlay">
          <div className="pa-card">
            <div className="pa-kicker">NSK GAME 2</div>
            <h1>PLANT ARENA REPAIR</h1>
            <p className="pa-lead">Rogue drones are sabotaging the 10 NSK test machines. Keep the plant running for 90 seconds.</p>
            <ul>
              <li><b>Find NSK crates</b> (red NSK logo). Plain crates are empty.</li>
              <li><b>Smash</b> a crate to get a bearing. Carry up to 5.</li>
              <li><b>Repair</b> red machines before their timer runs out.</li>
              <li>8 repairs wins. 3 failed machines and the plant shuts down.</li>
            </ul>
            <div className="pa-row">
              <button type="button" className="pa-btn pa-btn-go" onClick={start}>START MISSION</button>
              {onExit && <button type="button" className="pa-btn" onClick={onExit}>BACK</button>}
            </div>
            <div className="pa-small">Left thumb: move · Right thumb: action · Keyboard: WASD + Space</div>
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
      <div className="pa-rotate"><div><div className="pa-rotate-icon">📱</div>Rotate your phone to landscape to play</div></div>
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
