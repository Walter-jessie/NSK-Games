import React, { useState, useEffect } from 'react';

/**
 * LandscapeEnforcer
 * Prompts rotation to landscape mode when device is in portrait.
 * Yields completely to MobilePWAInstallOverlay when the install prompt is pending
 * so mobile users first see the minimal Install Page as requested.
 */
export default function LandscapeEnforcer() {
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  const [isInstallPending, setIsInstallPending] = useState(() => {
    if (typeof window === 'undefined') return false;
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
    const dismissed =
      sessionStorage.getItem('nsk_pwa_dismissed') === '1' ||
      localStorage.getItem('nsk_pwa_seen') === '1' ||
      localStorage.getItem('nsk_pwa_installed') === '1' ||
      localStorage.getItem('nsk_pwa_dismissed') === '1';
    const isMobile = /android|iphone|ipad|ipod|mobile|touch/i.test(navigator.userAgent || '') || (window.innerWidth <= 840);
    return isMobile && !standalone && !dismissed;
  });

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    const handlePWADismissed = () => {
      setIsInstallPending(false);
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('pwa-dismissed', handlePWADismissed);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('pwa-dismissed', handlePWADismissed);
    };
  }, []);

  // Do not show rotate prompt if the minimal PWA Install screen is currently pending
  if (isInstallPending) {
    return null;
  }

  return (
    <div
      className={`portrait-rotate-prompt fixed inset-0 z-[999999] bg-[#050810] flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-xl ${
        isPortrait ? '!flex' : ''
      }`}
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
        <span>DEDICATED LANDSCAPE DISPLAY ONLY</span>
      </div>
    </div>
  );
}
