import { useRef, useState } from 'react';

// Floating thumbstick: appears where the thumb lands on the left half of the
// screen. Tracks its own pointer id so the action button never steals it.
// onChange(x, z) gets a vector in -1..1 (screen right = +x, screen down = +z).
// The base is drawn relative to the zone, so the zone can sit anywhere on screen.
export default function VirtualJoystick({ onChange, radius = 56, deadZone = 0.12 }) {
  const pointer = useRef(null);
  const [stick, setStick] = useState(null);

  const update = (e) => {
    const p = pointer.current;
    let dx = e.clientX - p.ox;
    let dy = e.clientY - p.oy;
    const len = Math.hypot(dx, dy);
    if (len > radius) { dx = (dx / len) * radius; dy = (dy / len) * radius; }
    const mag = Math.min(1, len / radius);
    // unit direction, scaled by how far past the dead zone the thumb is
    const nx = len > 0 ? dx / Math.min(len, radius) : 0;
    const ny = len > 0 ? dy / Math.min(len, radius) : 0;
    const scaled = mag < deadZone ? 0 : (mag - deadZone) / (1 - deadZone);
    onChange(nx * scaled, ny * scaled);
    setStick({ ox: p.ox - p.rx, oy: p.oy - p.ry, kx: dx, ky: dy });
  };

  return (
    <div
      className="pa-joy-zone"
      onPointerDown={(e) => {
        if (pointer.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = e.currentTarget.getBoundingClientRect();
        pointer.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY, rx: r.left, ry: r.top };
        setStick({ ox: e.clientX - r.left, oy: e.clientY - r.top, kx: 0, ky: 0 });
      }}
      onPointerMove={(e) => { if (pointer.current?.id === e.pointerId) update(e); }}
      onPointerUp={(e) => {
        if (pointer.current?.id !== e.pointerId) return;
        pointer.current = null;
        setStick(null);
        onChange(0, 0);
      }}
      onPointerCancel={() => { pointer.current = null; setStick(null); onChange(0, 0); }}
    >
      {stick ? (
        <div className="pa-joy-base" style={{ left: stick.ox, top: stick.oy, width: radius * 2, height: radius * 2 }}>
          <div className="pa-joy-knob" style={{ transform: `translate(${stick.kx}px, ${stick.ky}px)` }} />
        </div>
      ) : (
        <div className="pa-joy-hint" style={{ width: radius * 2, height: radius * 2 }}>
          <div className="pa-joy-knob" />
        </div>
      )}
    </div>
  );
}
