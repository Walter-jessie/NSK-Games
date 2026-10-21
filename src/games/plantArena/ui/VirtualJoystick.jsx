import { useRef, useState, useCallback, useEffect } from 'react';

// Ultra-responsive floating thumbstick:
// Appears instantly where the thumb lands on the left zone.
// Uses direct DOM transform updates for 0ms input lag and smooth 60-120Hz tracking.
// onChange(x, z) gets a normalized vector in -1..1.
export default function VirtualJoystick({ onChange, radius = 56, deadZone = 0.04 }) {
  const pointer = useRef(null);
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const [active, setActive] = useState(false);

  const updateStick = useCallback(
    (clientX, clientY) => {
      const p = pointer.current;
      if (!p) return;
      let dx = clientX - p.ox;
      let dy = clientY - p.oy;
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

      if (knobRef.current) {
        knobRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }
    },
    [onChange, radius, deadZone]
  );

  const handlePointerDown = (e) => {
    if (pointer.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    pointer.current = {
      id: e.pointerId,
      ox: e.clientX,
      oy: e.clientY,
      rx: r.left,
      ry: r.top,
    };
    setActive(true);

    // Initial position setup
    requestAnimationFrame(() => {
      if (baseRef.current) {
        baseRef.current.style.left = `${e.clientX - r.left}px`;
        baseRef.current.style.top = `${e.clientY - r.top}px`;
      }
      if (knobRef.current) {
        knobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
      }
    });
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
      {active ? (
        <div
          ref={baseRef}
          className="pa-joy-base"
          style={{ width: radius * 2, height: radius * 2 }}
        >
          <div ref={knobRef} className="pa-joy-knob" />
        </div>
      ) : (
        <div className="pa-joy-hint" style={{ width: radius * 2, height: radius * 2 }}>
          <div className="pa-joy-knob" />
        </div>
      )}
    </div>
  );
}
