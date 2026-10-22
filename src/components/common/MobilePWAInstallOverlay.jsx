import React, { useState, useEffect } from 'react';
import { requestFullscreen } from '../../utils/fullscreen';

function checkIsStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function checkAlreadyDismissed() {
  if (typeof window === 'undefined') return false;
  // We only dismiss for the active session, or if already running as an installed PWA
  return sessionStorage.getItem('nsk_pwa_dismissed') === '1';
}

/**
 * Mobile PWA Install Page / Overlay
 * Ultra-minimalist:
 * - App Icon only
 * - INSTALL button
 * - CONTINUE IN BROWSER button
 * - Appears on mobile browsers in portrait mode
 * - Yields to game when installed or user clicks Continue in Browser
 */
export default function MobilePWAInstallOverlay({ forced = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [installStatus, setInstallStatus] = useState('idle'); // 'idle' | 'installing' | 'completed'

  useEffect(() => {
    // Clean up any stale or accidental blocking flags from previous versions
    try {
      localStorage.removeItem('nsk_pwa_seen');
      localStorage.removeItem('nsk_pwa_dismissed');
    } catch (e) {
      // Ignore
    }

    // 1. Check if already running in standalone/fullscreen PWA mode
    if (checkIsStandalone()) {
      setIsStandalone(true);
      return;
    }

    // 2. Check if user dismissed for this browser session
    if (checkAlreadyDismissed()) {
      setIsDismissed(true);
      return;
    }

    // 3. Detect mobile device & iOS
    const ua = (navigator.userAgent || '').toLowerCase();
    const isMobileDevice =
      /android|iphone|ipad|ipod|mobile|touch/.test(ua) ||
      window.innerWidth <= 840 ||
      window.location.search.includes('install');
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
      localStorage.setItem('nsk_pwa_installed', '1');
      setInstallStatus('completed');
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Do not render if running as installed app, already dismissed in this session, or on desktop (unless forced)
  if (!forced && (isStandalone || isDismissed || !isMobile)) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('nsk_pwa_dismissed', '1');
    window.dispatchEvent(new Event('pwa-dismissed'));
    requestFullscreen().catch(() => {});
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        setInstallStatus('installing');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          localStorage.setItem('nsk_pwa_installed', '1');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else if (isIOS) {
      setShowIOSTip(true);
    } else {
      setInstallStatus('installing');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000000] bg-black flex flex-col items-center justify-center p-6 select-none font-body text-white animate-fade-in">
      {installStatus === 'installing' ? (
        /* Present Tense: Installation in progress notification */
        <div className="flex flex-col items-center justify-center text-center max-w-xs px-6 py-8 rounded-2xl bg-neutral-950 border border-cyan-500/40 shadow-2xl animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 flex items-center justify-center text-xl font-bold mb-3 animate-pulse">
            📲
          </div>
          <h2 className="text-sm font-heading font-black text-white tracking-wide uppercase mb-1">
            INSTALLING APPLICATION...
          </h2>
          <p className="text-xs text-slate-300 mb-4">
            Adding to your home screen (takes 3–4 seconds)... Please check your phone apps.
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 text-white font-heading font-bold text-xs uppercase tracking-wider transition-all"
          >
            CONTINUE TO GAME
          </button>
        </div>
      ) : installStatus === 'completed' ? (
        /* Completed notification */
        <div className="flex flex-col items-center justify-center text-center max-w-xs px-6 py-8 rounded-2xl bg-neutral-950 border border-emerald-500/40 shadow-2xl animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center text-xl font-bold mb-3">
            ✓
          </div>
          <h2 className="text-sm font-heading font-black text-white tracking-wide uppercase mb-1">
            APP READY ON HOME SCREEN
          </h2>
          <p className="text-xs text-slate-300 mb-4">
            NSK Games has been installed to your device.
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-heading font-bold text-xs uppercase tracking-wider transition-all"
          >
            OPEN APP
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
              setInstallStatus('completed');
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
