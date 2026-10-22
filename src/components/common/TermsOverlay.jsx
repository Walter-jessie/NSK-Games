import React, { useEffect } from 'react';
import homeBg from '../../assets/home_bg.jpg';

/**
 * Terms of Use / Legal Disclaimer Overlay
 * - Gatekeeper shown at startup right after the NSK logo splash screen.
 * - Compact CAD/Detroit industrial theme: crisp white backdrop, rounded-none, zero curves.
 * - Space-optimized layout with concise 'ACCEPT' button.
 */
export default function TermsOverlay({ isOpen, isGatekeeper = true, onAccept, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isGatekeeper) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGatekeeper, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-3 select-none font-body overflow-hidden animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      {/* ── Dark Translucent Backdrop with Mild Blur ── */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
        onClick={!isGatekeeper ? onClose : undefined}
      />

      {/* ── Compact Sharp Straight Technical Card (Pure White, No Curves) ── */}
      <div
        className="relative z-10 w-full max-w-[min(540px,94%)] bg-white border-2 border-slate-300 shadow-2xl flex flex-col max-h-[92%] h-auto rounded-none overflow-hidden"
        style={{
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.35)',
        }}
      >
        {/* Top Solid NSK Red Accent Line */}
        <div className="h-1 w-full bg-[#E60012] shrink-0" />

        {/* Faint Technical CAD Drafting Watermark in Background */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-10"
          style={{ backgroundImage: `url(${homeBg})` }}
        />

        {/* Technical Corner Crosshairs */}
        <div className="absolute top-2 right-2 text-slate-300 font-mono text-[9px] pointer-events-none select-none">
          + +
        </div>

        {/* ── Header: Title + Subtitle + Official NSK Logo ── */}
        <div className="relative z-10 px-3 sm:px-4 py-1.5 border-b border-slate-200 bg-white/95 flex items-center justify-between gap-2 shrink-0">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-[#E60012]" />
              <h2
                id="terms-modal-title"
                className="font-heading font-black text-xs sm:text-sm text-slate-900 uppercase tracking-tight leading-none"
              >
                Terms of Use
              </h2>
            </div>
            <p className="text-[9.5px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5 pl-3">
              Please read carefully before proceeding
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <img
              src="./nsk_logo.png"
              alt="NSK"
              className="h-4 sm:h-5 w-auto object-contain"
            />
            {!isGatekeeper && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-none border border-slate-200 hover:border-slate-400 transition-all cursor-pointer ml-1"
                aria-label="Close Terms"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Body: Callout Banner + Scrollable Legal Sections ── */}
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-2 space-y-1.5 text-[10.5px] sm:text-xs text-slate-600">
          {/* Institutional Callout Panel */}
          <div className="p-1.5 sm:p-2 bg-slate-50 border-l-3 border-l-[#E60012] border-t border-r border-b border-slate-200 rounded-none">
            <p className="leading-snug text-[10px] sm:text-[10.5px] text-slate-700">
              Developed by <strong className="font-bold text-slate-900">Quexi Technologies</strong> for{' '}
              <strong className="font-bold text-slate-900">NSK Bearings India Pvt. Ltd.</strong> Content is for
              educational and event use only.
            </p>
          </div>

          {/* Section 1: Educational Intent */}
          <section className="border-b border-slate-100 pb-1">
            <h3 className="font-heading font-black text-[10.5px] sm:text-[11px] text-slate-900 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <span className="w-1 h-2 bg-slate-400" />
              Educational Intent
            </h3>
            <p className="leading-snug text-slate-600 pl-2">
              Designed solely for the NSK Bearings India Skill Development Program for vocational training.
            </p>
          </section>

          {/* Section 2: No Industrial Liability */}
          <section className="border-b border-slate-100 pb-1">
            <h3 className="font-heading font-black text-[10.5px] sm:text-[11px] text-slate-900 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <span className="w-1 h-2 bg-slate-400" />
              No Industrial Liability
            </h3>
            <p className="leading-snug text-slate-600 pl-2">
              Information provided does NOT substitute for official NSK India SOPs, OEM manuals, or certified supervision.
            </p>
          </section>

          {/* Section 3: Safety Priority */}
          <section className="border-b border-slate-100 pb-1">
            <h3 className="font-heading font-black text-[10.5px] sm:text-[11px] text-slate-900 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <span className="w-1 h-2 bg-[#E60012]" />
              Safety Priority
            </h3>
            <p className="leading-snug text-slate-600 pl-2">
              Live plant safety guidelines and supervisor instructions take absolute precedence over this app.
            </p>
          </section>

          {/* Section 4: Training & Code of Conduct */}
          <section className="pb-0.5">
            <h3 className="font-heading font-black text-[10.5px] sm:text-[11px] text-slate-900 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <span className="w-1 h-2 bg-slate-400" />
              Code of Conduct
            </h3>
            <p className="leading-snug text-slate-600 pl-2">
              All scores, technical benchmarks, and records remain intellectual property of NSK Bearings India.
            </p>
          </section>
        </div>

        {/* ── Footer: Copyright + ACCEPT Button (Compact & Single-Word) ── */}
        <div className="relative z-10 px-3 sm:px-4 py-1.5 border-t border-slate-200 bg-slate-50/95 flex items-center justify-between gap-2 shrink-0">
          <p className="text-[8.5px] sm:text-[9.5px] font-mono text-slate-500 tracking-tight">
            &copy; 2026 NSK Bearings India &middot; Quexi Technologies
          </p>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isGatekeeper && (
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 rounded-none font-heading font-black text-[10px] text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-all uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
            )}

            <button
              type="button"
              onClick={onAccept}
              className="px-4 sm:px-5 py-1 sm:py-1.5 rounded-none font-heading font-black text-[11px] sm:text-xs text-white bg-[#E60012] hover:bg-[#c90010] active:scale-98 transition-all shadow-sm uppercase tracking-wider cursor-pointer whitespace-nowrap"
            >
              ACCEPT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
