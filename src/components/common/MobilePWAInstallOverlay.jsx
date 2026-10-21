import React, { useState, useEffect } from 'react';

/**
 * Mobile PWA Install Page / Overlay
 * - Pure black background (no images/gradients)
 * - NSK Logo in corner
 * - Icon, Game Name, Install App & Continue in Browser buttons only
 * - When Install is clicked: "Continue in Browser" is removed and only text description remains
 */
export default function MobilePWAInstallOverlay() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone PWA mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (standalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Check if user already dismissed this session
    if (sessionStorage.getItem('nsk_pwa_dismissed') === '1') {
      setIsDismissed(true);
    }

    // 3. Detect mobile device & iOS
    const ua = (navigator.userAgent || '').toLowerCase();
    const isMobileDevice = /android|iphone|ipad|ipod|mobile|touch/.test(ua) || (window.innerWidth <= 840);
    setIsMobile(isMobileDevice);

    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // 4. Capture native Chrome/Android install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.__pwaDeferredPrompt = e;
    };

    if (window.__pwaDeferredPrompt) {
      setDeferredPrompt(window.__pwaDeferredPrompt);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Do not render if already running as installed app, dismissed, or on desktop
  if (isStandalone || isDismissed || !isMobile) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          localStorage.setItem('nsk_pwa_installed', '1');
        }
        setDeferredPrompt(null);
        setInstalledSuccess(true);
      } catch (err) {
        console.warn('Install prompt error:', err);
        setInstalledSuccess(true);
      }
    } else if (isIOS) {
      setShowIOSTip(true);
    } else {
      setInstalledSuccess(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('nsk_pwa_dismissed', '1');
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center p-4 sm:p-6 select-none font-body text-white animate-fade-in">
      {/* NSK Logo in Corner */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
        <img
          src="./nsk_logo.png"
          alt="NSK"
          className="h-6 sm:h-8 w-auto object-contain"
        />
      </div>

      {installedSuccess ? (
        /* ═══ AFTER CLICKING INSTALL: TEXT DESCRIPTION ONLY (No Continue in Browser) ═══ */
        <div className="flex flex-col items-center justify-center text-center max-w-xs sm:max-w-sm px-6 py-8 rounded-2xl bg-neutral-950 border border-emerald-500/40 shadow-2xl animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center text-2xl font-bold mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            ✓
          </div>

          <h2 className="text-base sm:text-lg font-heading font-black text-white tracking-wide uppercase mb-2">
            CHECK HOME SCREEN
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            App installed! Please check your phone&apos;s home screen to open <strong className="text-white">NSK Challenge</strong>.
          </p>
        </div>
      ) : (
        /* ═══ INITIAL VIEW: ICON, GAME NAME, INSTALL APP & CONTINUE IN BROWSER ONLY ═══ */
        <div className="flex flex-col items-center justify-center text-center max-w-xs sm:max-w-sm w-full my-auto animate-fade-in">
          {/* Game Icon */}
          <div className="mb-3 sm:mb-4">
            <img
              src="./icon.png"
              alt="NSK Games Icon"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_25px_rgba(230,0,18,0.3)] border border-white/10 object-contain p-1 bg-white/5 backdrop-blur-sm"
            />
          </div>

          {/* Game Name */}
          <h1 className="text-lg sm:text-2xl font-heading font-black tracking-wider uppercase text-white mb-6 sm:mb-8 leading-tight">
            NSK <span className="text-[#E60012]">GAMES</span>
          </h1>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3">
            {/* Install App Button */}
            <button
              id="btn-install-app"
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 sm:py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 via-[#E60012] to-red-600 hover:brightness-110 active:scale-95 text-white font-heading font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_4px_24px_rgba(230,0,18,0.5)] border border-red-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="text-base">📲</span>
              <span>INSTALL APP</span>
            </button>

            {/* Continue in Browser Button */}
            <button
              id="btn-continue-browser"
              type="button"
              onClick={handleDismiss}
              className="w-full py-2.5 sm:py-3 px-6 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-slate-200 hover:text-white font-heading font-bold text-xs sm:text-sm uppercase tracking-wider border border-white/15 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            >
              <span>CONTINUE IN BROWSER</span>
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Guide (if triggered on iPhone) */}
      {showIOSTip && (
        <div className="fixed inset-x-4 max-w-xs sm:max-w-sm mx-auto bottom-6 z-[100000] p-5 rounded-2xl bg-neutral-900 border border-red-500/70 shadow-2xl text-white animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading font-bold text-xs sm:text-sm text-red-400 uppercase tracking-wide">
              Install on iPhone (Safari):
            </h3>
          </div>
          <ol className="text-xs text-slate-300 space-y-1.5 mb-3 text-left">
            <li>1. Tap the <strong className="text-white">Share</strong> button (⎋) in Safari.</li>
            <li>2. Tap <strong className="text-white">Add to Home Screen</strong> (⊞).</li>
            <li>3. Tap <strong className="text-emerald-400">Add</strong> in the top right.</li>
          </ol>
          <button
            onClick={() => {
              setShowIOSTip(false);
              setInstalledSuccess(true);
            }}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-xs uppercase tracking-wider"
          >
            Done / Check Home Screen
          </button>
        </div>
      )}
    </div>
  );
}
