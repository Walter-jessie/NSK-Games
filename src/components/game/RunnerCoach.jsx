import { useLayoutEffect, useRef, useState } from 'react';

/**
 * First-run coach for Bearing Runner: dims the whole screen and leaves the two
 * steering arrows lit, with the instruction in the middle.
 *
 * Game 2's joystick coach punches its single hole with a 9999px box-shadow
 * spread. That trick does not compose — two of them would each dim the other's
 * hole — so this one masks an SVG instead, which takes any number of cut-outs.
 *
 * The holes are measured from the live buttons rather than hard-coded, because
 * the arrows are sized in clamp()/vh units and move with the viewport. Mark a
 * button with `data-coach-target` to have it lit.
 */
export default function RunnerCoach({
  message = 'TAP EITHER ARROW TO SWITCH LANES',
  sub = 'Line up with the lane holding the correct answer',
}) {
  const hostRef = useRef(null);
  const [holes, setHoles] = useState([]);

  useLayoutEffect(() => {
    const measure = () => {
      const host = hostRef.current;
      if (!host) return;
      const base = host.getBoundingClientRect();
      const next = [];
      for (const el of document.querySelectorAll('[data-coach-target]')) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        next.push({
          x: r.left - base.left,
          y: r.top - base.top,
          w: r.width,
          h: r.height,
          rx: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
        });
      }
      setHoles(next);
    };

    measure();
    // Fullscreen and the orientation lock both land a frame or two after the
    // run starts, and each one resizes the buttons.
    const settle = setTimeout(measure, 150);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      clearTimeout(settle);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0 z-[45] pointer-events-none runner-coach">
      <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
        <defs>
          <mask id="runner-coach-holes">
            <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
            {holes.map((h, i) => (
              <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} rx={h.rx} fill="#000" />
            ))}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="#02040a"
          opacity="0.82"
          mask="url(#runner-coach-holes)"
        />
        {holes.map((h, i) => (
          <rect
            key={i}
            className="runner-coach-ring"
            x={h.x}
            y={h.y}
            width={h.w}
            height={h.h}
            rx={h.rx}
            fill="none"
            stroke="#67e8f9"
            strokeWidth="3"
          />
        ))}
      </svg>

      <div className="absolute left-1/2 top-[28%] -translate-x-1/2 w-[min(calc(82_*_var(--app-vw,_8.4px)),640px)] text-center">
        <p className="font-heading font-black uppercase tracking-wider text-white text-[clamp(16px,calc(4.2_*_var(--app-vh,_3.9px)),32px)] drop-shadow-[0_2px_18px_rgba(0,0,0,0.95)]">
          {message}
        </p>
        <p className="mt-2 text-cyan-100/90 text-[clamp(11px,calc(2.2_*_var(--app-vh,_3.9px)),16px)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          {sub}
        </p>
      </div>
    </div>
  );
}
