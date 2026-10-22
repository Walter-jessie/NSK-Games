import React, { useEffect } from 'react';
import homeBg from '../../assets/home_bg.jpg';

/**
 * Terms of Use / Legal Disclaimer Overlay
 * - Gatekeeper shown at startup right after the NSK logo splash screen.
 * - Sharp straight CAD/Detroit industrial theme: crisp white backdrop, rounded-none, zero curves.
 * - Matches LoginPage design tokens: technical drafting crosshairs, blueprint watermark, NSK red accents.
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
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 select-none font-body overflow-hidden animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      {/* ── Dark Translucent Backdrop with Mild Blur ── */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
        onClick={!isGatekeeper ? onClose : undefined}
      />

      {/* ── Sharp Straight Technical Card (Pure White, No Curves) ── */}
      <div
        className="relative z-10 w-full max-w-2xl bg-white border-2 border-slate-300 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] rounded-none overflow-hidden"
        style={{
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
        }}
      >
        {/* Top Solid NSK Red Accent Line */}
        <div className="h-1.5 w-full bg-[#E60012] shrink-0" />

        {/* Faint Technical CAD Drafting Watermark in Background */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-10"
          style={{ backgroundImage: `url(${homeBg})` }}
        />

        {/* Technical Corner Crosshairs (Top Right & Bottom Left) */}
        <div className="absolute top-3 right-3 text-slate-300 font-mono text-[10px] pointer-events-none select-none">
          + +
        </div>

        {/* ── Header: Title + Subtitle + Official NSK Logo ── */}
        <div className="relative z-10 px-4 sm:px-6 pt-4 pb-3 border-b border-slate-200 bg-white/95 flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#E60012]" />
              <h2
                id="terms-modal-title"
                className="font-heading font-black text-lg sm:text-2xl text-slate-900 uppercase tracking-tight leading-none"
              >
                Terms of Use
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1.5 pl-3.5">
              Please read carefully before proceeding
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <img
              src="./nsk_logo.png"
              alt="NSK"
              className="h-6 sm:h-8 w-auto object-contain"
            />
            {!isGatekeeper && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-none border border-slate-200 hover:border-slate-400 transition-all cursor-pointer ml-1"
                aria-label="Close Terms"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Body: Callout Banner + Scrollable Legal Sections ── */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-3.5 text-xs sm:text-sm text-slate-600">
          {/* Institutional Callout Panel with NSK Red Accent Left Border */}
          <div className="p-3 sm:p-3.5 bg-slate-50 border-l-4 border-l-[#E60012] border-t border-r border-b border-slate-200 rounded-none shadow-2xs">
            <p className="leading-relaxed text-[11px] sm:text-xs text-slate-700">
              Developed by <strong className="font-bold text-slate-900">Quexi Technologies</strong> for{' '}
              <strong className="font-bold text-slate-900">NSK Bearings India Private Limited</strong>. Content is
              for educational and event use only. NSK India and Quexi Technologies disclaim all liability for practical
              application.
            </p>
          </div>

          {/* Section 1: Educational Intent */}
          <section className="border-b border-slate-100 pb-2.5">
            <h3 className="font-heading font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1 h-3 bg-slate-400" />
              Educational Intent
            </h3>
            <p className="leading-relaxed text-slate-600 pl-2.5">
              This system is part of the NSK Bearings India Private Limited Skill Development Program. It is designed
              for vocational training and study purposes only.
            </p>
          </section>

          {/* Section 2: No Industrial Liability */}
          <section className="border-b border-slate-100 pb-2.5">
            <h3 className="font-heading font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1 h-3 bg-slate-400" />
              No Industrial Liability
            </h3>
            <p className="leading-relaxed text-slate-600 pl-2.5">
              Information provided regarding bearing maintenance, technical specifications, or industrial safety must
              NOT be used as a substitute for official NSK India SOPs, OEM manuals, or certified human supervision.
            </p>
          </section>

          {/* Section 3: Safety Priority */}
          <section className="border-b border-slate-100 pb-2.5">
            <h3 className="font-heading font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1 h-3 bg-[#E60012]" />
              Safety Priority
            </h3>
            <p className="leading-relaxed text-slate-600 pl-2.5">
              In any live industrial environment, site-specific safety rules and supervisor instructions take absolute
              precedence over this application&apos;s guidance.
            </p>
          </section>

          {/* Section 4: Training & Code of Conduct */}
          <section className="pb-1">
            <h3 className="font-heading font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1 h-3 bg-slate-400" />
              Training &amp; Code of Conduct
            </h3>
            <p className="leading-relaxed text-slate-600 pl-2.5">
              Access to NSK Challenge modules is provided for authorized plant personnel and participants. All scores,
              technical benchmarks, and departmental records are protected under internal NSK compliance policies.
            </p>
          </section>
        </div>

        {/* ── Footer: Copyright + Accept & Proceed Action Button ── */}
        <div className="relative z-10 px-4 sm:px-6 py-3 border-t-2 border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[10px] sm:text-[11px] font-mono text-slate-500 tracking-tight text-center sm:text-left">
            &copy; 2026 NSK Bearings India Pvt. Ltd. &middot; Powered by Quexi Technologies
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!isGatekeeper && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 rounded-none font-heading font-black text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-all uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
            )}

            <button
              type="button"
              onClick={onAccept}
              className="w-full sm:w-auto px-6 py-2.5 rounded-none font-heading font-black text-xs sm:text-sm text-white bg-[#E60012] hover:bg-[#c90010] active:scale-98 transition-all shadow-md shadow-red-600/20 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Accept &amp; Proceed</span>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
