import { useEffect, useRef } from 'react';

/**
 * First-run coach: dims the whole screen and leaves a clear hole over the
 * joystick, with the instruction in the middle. `size` must match the
 * joystick's diameter, so the page passes one constant to both.
 */
export function JoystickCoach({ size = 112 }) {
  return (
    <div className="pa-coach">
      <div className="pa-coach-spot" style={{ width: size, height: size }} />
      <div className="pa-coach-msg">
        <span className="pa-coach-title">TOUCH THE JOYSTICK</span>
        <span className="pa-coach-sub">Hold and drag to walk the plant floor</span>
      </div>
    </div>
  );
}

const fmt = (secs) => {
  const t = Math.ceil(secs);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export function TopBar({ snap, sessionSeconds }) {
  return (
    <div className="pa-bar">
      {/* Center-aligned WAVE display (absolute center of screen) */}
      <div className="pa-panel pa-c">
        WAVE {snap.wave + 1}/{snap.waveCount}
      </div>
      <div className="pa-panel pa-r">
        TIME LEFT: <span className="pa-time-val">{fmt(Math.max(0, snap.timeLeft))}</span>
        <div className="pa-meter pa-time"><i style={{ width: `${(snap.timeLeft / sessionSeconds) * 100}%` }} /></div>
      </div>
    </div>
  );
}

export function StatusBlock({ snap }) {
  return (
    <>
      {/* Top-Left: Square Repair Objective Card with White Inner Panel & Fixed Green Accent */}
      <div className="pa-chips-top-left">
        <div className="pa-chip-sq pa-chip-repair" title="Repairs Completed">
          <span className="pa-chip-emoji" role="img" aria-label="repair">🔧</span>
          <div className="pa-chip-count-wrap">
            <span className="pa-count-val pa-count-val-repair">{snap.repairs}</span>
            <span className="pa-count-slash">/</span>
            <span className="pa-count-max">{snap.winRepairs}</span>
          </div>
          <span className="pa-chip-lbl">REPAIRS</span>
        </div>
      </div>

      {/* Bottom-Center: Square Bearing Count Panel with White Inner Panel & Fixed Green Accent */}
      <div className="pa-chips-bottom-center">
        <div
          className="pa-chip-sq pa-chip-bearing"
          title="Bearings in Backpack"
        >
          <img src="./icon.svg" alt="Bearing" className="pa-chip-icon" />
          <div className="pa-chip-count-wrap">
            <span className="pa-count-val pa-count-val-bearing">{snap.bearings}</span>
          </div>
          <span className="pa-chip-lbl">BEARINGS</span>
        </div>
      </div>
    </>
  );
}

const ACTIONS = {
  smash: { cls: 'pa-act-smash', label: ['OPEN'] },
  repair: { cls: 'pa-act-repair', label: ['REPAIR', 'APPLICATION'] },
  needBearings: { cls: 'pa-act-need', label: ['NEED', 'BEARINGS'] },
};

export function SmartActionButton({ action, onPress }) {
  const a = ACTIONS[action?.kind];
  if (!a) return <div className="pa-act pa-act-hidden" aria-hidden="true" />;
  return (
    <button
      type="button"
      className={`pa-act ${a.cls}`}
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
    >
      {a.label.map((text, idx) => (
        <span key={idx}>{text}</span>
      ))}
    </button>
  );
}

// Radar: arena outline, machines (green / blinking red / grey), crates left,
// drones and the player. Drawn on a canvas at 10 Hz from the engine state.
export function MiniMap({ engine, layout }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !engine) return undefined;
    const ctx = cv.getContext('2d');
    const W = layout.arena.width, D = layout.arena.depth;
    const draw = () => {
      const s = engine.game.state;
      const w = cv.width, h = cv.height;
      const X = (x) => ((x + W / 2) / W) * w;
      const Z = (z) => ((z + D / 2) / D) * h;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(11,14,20,0.85)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#3a404c';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.fillStyle = '#20252e';
      ctx.fillRect(0, Z(-2.1), w, Z(2.1) - Z(-2.1));
      ctx.fillRect(X(-2.1), 0, X(2.1) - X(-2.1), h);
      const blink = Math.floor(performance.now() / 250) % 2 === 0;
      for (const m of s.machines) {
        ctx.fillStyle = m.status === 'attacked' ? (blink ? '#ff4a3a' : '#7a1d16')
          : m.status === 'failed' ? '#555b66'
            : m.status === 'saved' ? '#7dffb0' : '#2f8a54';
        ctx.fillRect(X(m.x) - w * 0.04, Z(m.z) - h * 0.045, w * 0.08, h * 0.09);
      }
      ctx.fillStyle = '#ffb547';
      for (const c of s.crates) if (c.nsk && !c.smashed) ctx.fillRect(X(c.x) - 1.5, Z(c.z) - 1.5, 3, 3);
      ctx.fillStyle = '#ffe27a';
      for (const p of s.pickups) if (!p.collected) { ctx.beginPath(); ctx.arc(X(p.x), Z(p.z), 2.5, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#ff2a3a';
      for (const d of s.drones) { ctx.beginPath(); ctx.arc(X(d.x), Z(d.z), 3, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#4fb3ff';
      ctx.shadowColor = '#4fb3ff';
      ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(X(s.player.x), Z(s.player.z), 4, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    };
    draw();
    const id = setInterval(draw, 100);
    return () => clearInterval(id);
  }, [engine, layout]);
  return <canvas ref={ref} className="pa-map" width={180} height={120} />;
}
