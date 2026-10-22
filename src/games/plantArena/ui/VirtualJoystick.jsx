import { useRef, useState, useCallback } from 'react';

// Fixed thumbstick anchored at the bottom-left of the movement zone.
//
// It used to be a floating stick that spawned wherever the thumb landed, which
// meant the ring jumped around the screen from touch to touch and never sat
// where the coach overlay points. The ring now stays put and only the knob
// travels inside it; deflection is measured from the ring's own centre.
//
// Direct DOM transform updates on the knob, so input has no React render in
// the way. onChange(x, z) gets a normalized vector in -1..1.
export default function VirtualJoystick({ onChange, onEngage, radius = 56, deadZone = 0.04 }) {
  const pointer = useRef(null);
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const [active, setActive] = useState(false);

  const moveKnob = (dx, dy) => {
    if (knobRef.current) knobRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };

  const updateStick = useCallback(
    (clientX, clientY) => {
      const p = pointer.current;
      if (!p) return;
      let dx = clientX - p.cx;
      let dy = clientY - p.cy;
      const len = Math.hypot(dx, dy);
      if (len > radius) {
        dx = (dx / len) * radius;
        dy = (dy / len) * radius;
      }
      const mag = Math.min(1, len / radius);
      const nx = len > 0 ? dx / Math.min(len, radius) : 0;
      const ny = len > 0 ? dy / Math.min(len, radius) : 0;
      const scaled = mag < deadZone ? 0 : (mag - deadZone) / (1 - deadZone);

      onChange(nx * scaled, ny * scaled);
      moveKnob(dx, dy);
    },
    [onChange, radius, deadZone]
  );

  const handlePointerDown = (e) => {
    if (pointer.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Fires on touch, before any movement: the coach overlay asks for a touch,
    // and onChange alone would leave a player who taps without dragging stuck
    // behind it.
    onEngage?.();
    const r = baseRef.current.getBoundingClientRect();
    pointer.current = {
      id: e.pointerId,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
    };
    setActive(true);
    updateStick(e.clientX, e.clientY);
  };

  const handlePointerMove = (e) => {
    if (pointer.current?.id === e.pointerId) {
      updateStick(e.clientX, e.clientY);
    }
  };

  const handlePointerEnd = (e) => {
    if (pointer.current?.id !== e.pointerId) return;
    pointer.current = null;
    setActive(false);
    moveKnob(0, 0);
    onChange(0, 0);
  };

  return (
    <div
      className="pa-joy-zone"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div
        ref={baseRef}
        className={`pa-joy-base${active ? ' pa-joy-active' : ''}`}
        style={{ width: radius * 2, height: radius * 2 }}
      >
        <div ref={knobRef} className="pa-joy-knob" />
      </div>
    </div>
  );
}
