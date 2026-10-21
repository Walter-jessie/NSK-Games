import React, { useState, useEffect } from 'react';

/**
 * Mobile PWA Install Button
 * Captures `beforeinstallprompt` on Android/Chrome/Edge and offers 1-tap installation.
 * Provides intuitive iOS "Add to Home Screen" guidance on Safari.
 */
export default function PWAInstallButton({ className = '' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // Listen for Android / Chrome PWA install trigger
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (isInstalled) return null;

  const [showCheckHomeScreen, setShowCheckHomeScreen] = useState(false);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        setShowCheckHomeScreen(true);
        setTimeout(() => setShowCheckHomeScreen(false), 7000);
      } catch (err) {
        setShowCheckHomeScreen(true);
        setTimeout(() => setShowCheckHomeScreen(false), 7000);
      }
    } else if (isIOS) {
      setShowIOSTip(true);
      setTimeout(() => setShowIOSTip(false), 7000);
    } else {
      setShowCheckHomeScreen(true);
      setTimeout(() => setShowCheckHomeScreen(false), 7000);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 shadow-md text-xs font-heading font-black tracking-wider transition-all active:scale-95 cursor-pointer"
        title="Install NSK Challenge PWA for full-screen landscape factory floor training"
      >
        <span className="text-sm">📲</span>
        <span className="hidden sm:inline">INSTALL APP</span>
        <span className="sm:hidden">PWA</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
      </button>

      {/* Check Home Screen Notification */}
      {showCheckHomeScreen && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 rounded-xl bg-slate-950/98 border border-emerald-500/80 shadow-[0_8px_30px_rgba(16,185,129,0.3)] text-white text-xs z-50 animate-slide-up backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-emerald-400 font-heading font-black mb-1">
            <span>✓</span>
            <span>Check Your Home Screen!</span>
          </div>
          <p className="text-slate-300 leading-snug">
            App installed! Please check your phone&apos;s <strong>Home Screen</strong> to launch the game in full-screen.
          </p>
        </div>
      )}

      {/* iOS Safari Tip */}
      {showIOSTip && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl text-white text-xs z-50 animate-slide-up backdrop-blur-md">
          <p className="font-heading font-bold text-amber-400 mb-1">Install on iPhone / iPad:</p>
          <p className="text-slate-300">
            Tap the <strong>Share</strong> button <span className="text-blue-400">⎋</span> at the bottom of Safari, then choose <strong>&quot;Add to Home Screen&quot; ⊞</strong>. Then check your Home Screen!
          </p>
        </div>
      )}
    </div>
  );
}
