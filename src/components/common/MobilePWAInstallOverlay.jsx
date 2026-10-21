import React, { useState, useEffect } from 'react';

/**
 * Mobile PWA Install Page / Overlay
 * Ultra-minimalist:
 * - App Icon only (no corner logo, no "NSK Games" text)
 * - INSTALL button
 * - CONTINUE IN BROWSER button
 */
export default function MobilePWAInstallOverlay({ forced = false }) {
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

  // Do not render if running as installed app, dismissed, or on desktop (unless forced via /install route)
  if (!forced && (isStandalone || isDismissed || !isMobile)) {
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
    window.dispatchEvent(new Event('pwa-dismissed'));
  };

  return (
    <div className="fixed inset-0 z-[1000000] bg-black flex flex-col items-center justify-center p-6 select-none font-body text-white animate-fade-in">
      {installedSuccess ? (
        /* Minimal post-install notification */
        <div className="flex flex-col items-center justify-center text-center max-w-xs px-6 py-8 rounded-2xl bg-neutral-950 border border-emerald-500/40 shadow-2xl animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center text-xl font-bold mb-3">
            ✓
          </div>
          <h2 className="text-sm font-heading font-black text-white tracking-wide uppercase mb-1">
            APP INSTALLED
          </h2>
          <p className="text-xs text-slate-300 mb-5">
            Check your phone&apos;s home screen to open.
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-heading font-bold uppercase tracking-wider"
          >
            CONTINUE NOW
          </button>
        </div>
      ) : (
        /* Minimal Clean View: Icon Only & 2 Buttons */
        <div className="flex flex-col items-center justify-center text-center max-w-xs w-full animate-fade-in">
          {/* App Icon Only */}
          <div className="mb-8">
            <img
              src="./icon.png"
              alt="App Icon"
              className="w-28 h-28 rounded-3xl shadow-[0_12px_36px_rgba(0,0,0,0.9),0_0_25px_rgba(230,0,18,0.25)] border border-white/10 object-contain p-1 bg-white/5"
            />
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3">
            {/* Install Button */}
            <button
              id="btn-install-app"
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 via-[#E60012] to-red-600 hover:brightness-110 active:scale-95 text-white font-heading font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_4px_24px_rgba(230,0,18,0.45)] border border-red-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="text-base">📲</span>
              <span>INSTALL</span>
            </button>

            {/* Continue in Browser Button */}
            <button
              id="btn-continue-browser"
              type="button"
              onClick={handleDismiss}
              className="w-full py-3 px-6 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-slate-200 hover:text-white font-heading font-bold text-xs sm:text-sm uppercase tracking-wider border border-white/15 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            >
              <span>CONTINUE IN BROWSER</span>
            </button>
          </div>
        </div>
      )}

      {/* Minimal iOS Safari Tip */}
      {showIOSTip && (
        <div className="fixed inset-x-6 max-w-xs mx-auto bottom-6 z-[1000001] p-4 rounded-2xl bg-neutral-900 border border-red-500/60 shadow-2xl text-white text-center animate-slide-up">
          <p className="text-xs text-slate-200 mb-3">
            Tap <strong className="text-white">Share ⎋</strong> then <strong className="text-white">Add to Home Screen ⊞</strong>
          </p>
          <button
            type="button"
            onClick={() => {
              setShowIOSTip(false);
              setInstalledSuccess(true);
            }}
            className="w-full py-2 rounded-xl bg-white/15 text-white font-heading font-bold text-xs uppercase"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}
