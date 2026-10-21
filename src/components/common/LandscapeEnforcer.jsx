import React from 'react';

/**
 * LandscapeEnforcer
 * AAA Mobile Game standard: When a user holds their phone vertically in portrait,
 * this overlay gracefully prompts them to rotate to landscape mode.
 * Automatically hidden via CSS (@media (orientation: landscape)) when in landscape.
 */
export default function LandscapeEnforcer() {
  return (
    <div
      className="portrait-rotate-prompt fixed inset-0 z-[9999] bg-[#050810] flex-col items-center justify-center p-6 text-center select-none backdrop-blur-xl"
      style={{ touchAction: 'none' }}
    >
      {/* Background Subtle CAD Watermark */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(230,0,18,0.1)_0%,transparent_70%)] pointer-events-none" />

      {/* Animated Phone Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-slate-900/80 border-2 border-red-500/40 shadow-[0_0_35px_rgba(230,0,18,0.35)] flex items-center justify-center rotate-phone-anim">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="5" y="2" width="14" height="20" rx="3" />
            <line x1="11" y1="18" x2="13" y2="18" strokeLinecap="round" />
          </svg>
        </div>
        <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-[#E60012] text-white flex items-center justify-center text-xs font-black shadow-lg">
          🔄
        </div>
      </div>

      {/* Title */}
      <h2 className="font-heading font-black text-xl sm:text-2xl text-white tracking-widest uppercase mb-2">
        ROTATE YOUR DEVICE
      </h2>
      <div className="w-16 h-1 bg-[#E60012] mx-auto rounded-full mb-3" />

      {/* Description */}
      <p className="text-slate-300 text-xs sm:text-sm font-body max-w-xs leading-relaxed mb-4">
        NSK Games is an industrial 3D training simulator designed exclusively for <span className="text-white font-bold">Landscape Mode</span>.
      </p>

      {/* Industrial Spec Tag */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span>DEDICATED LANDSCAPE DISPLAY (20:9 · 19.5:9)</span>
      </div>
    </div>
  );
}
