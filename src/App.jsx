import React, { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import CinematicSplashScreen from './components/common/CinematicSplashScreen';
import MobilePWAInstallOverlay from './components/common/MobilePWAInstallOverlay';
import { isFullscreen, requestFullscreen, initFullscreenRecovery } from './utils/fullscreen';

import LoginPage from './pages/LoginPage';
import LandscapeEnforcer from './components/common/LandscapeEnforcer';

// Lazy-load secondary pages for smaller initial bundle
const HubPage = lazy(() => import('./pages/HubPage'));
const BearingRunnerPage = lazy(() => import('./pages/BearingRunnerPage'));
const ScoreResultPage = lazy(() => import('./pages/ScoreResultPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const BearingCheckPage = lazy(() => import('./pages/BearingCheckPage'));
const PlantArenaPage = lazy(() => import('./games/plantArena'));
import { submitScore } from './services/supabaseService';

// Loading spinner
function LoadingScreen() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-nsk-bg">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin h-8 w-8 text-nsk-primary-light" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-nsk-text-secondary font-body">Loading...</p>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return children;
}

// Game 2: Plant Arena Repair route wrapper
function PlantArenaRoute() {
  const navigate = useNavigate();
  const { employeeId, department } = useAuthStore();

  const handleExit = useCallback(() => {
    navigate('/hub');
  }, [navigate]);

  const handleSubmitScore = useCallback(
    (result) => {
      // Game 2 scoring is paused as of now
      console.log('[Plant Arena] Scoring paused for Game 2:', result);
    },
    []
  );

  return (
    <PlantArenaPage
      employeeId={employeeId || 'NSK-GUEST'}
      onExit={handleExit}
      onSubmitScore={handleSubmitScore}
    />
  );
}

/**
 * AAA Game-Style Fullscreen Recovery Overlay
 * When the user swipes down and the phone system notification bar causes
 * fullscreen to exit, this bar slides down from the top (like the notification
 * shade itself) telling the user "tap anywhere" to get back to immersive mode.
 * Auto-hides after 3 seconds just like AAA games.
 */
function FullscreenRecoveryOverlay({ visible, onTap }) {
  const [retracting, setRetracting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setRetracting(false);
    } else if (mounted) {
      // Trigger retract animation before unmounting
      setRetracting(true);
      const timer = setTimeout(() => setMounted(false), 350);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <div
      className={`fs-recovery-overlay ${retracting ? 'fs-recovery--retracting' : ''}`}
      onClick={onTap}
      onTouchStart={onTap}
      style={{ touchAction: 'manipulation' }}
    >
      <div className="flex items-center justify-center gap-3 px-4 py-2.5 bg-gradient-to-b from-[#0a0e18]/97 via-[#0c1020]/95 to-transparent backdrop-blur-xl border-b border-white/10">
        {/* Pulsing tap indicator */}
        <div className="fs-recovery-pulse flex items-center gap-2">
          <span className="text-red-400 text-base">👆</span>
          <span className="text-[11px] sm:text-xs font-bold tracking-wider text-slate-200 uppercase font-heading">
            Tap anywhere to go immersive
          </span>
        </div>

        {/* 3s countdown visual — thin animated bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-red-400"
            style={{
              animation: 'fsCountdownShrink 3s linear forwards',
              transformOrigin: 'left',
            }}
          />
        </div>
      </div>

      {/* Inline keyframes for countdown bar */}
      <style>{`
        @keyframes fsCountdownShrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fsRecoveryVisible, setFsRecoveryVisible] = useState(false);
  const navigate = useNavigate();
  const initialNavRef = useRef(true);

  useEffect(() => {
    // Only reset to login on the initial app load/mount
    if (initialNavRef.current) {
      initialNavRef.current = false;
      navigate('/', { replace: true });
    }
  }, []);

  const handleRecoveryTap = useCallback(() => {
    setFsRecoveryVisible(false);
    requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    // Attempt fullscreen orientation lock where supported (mobile Chrome/Android PWA)
    if (window.screen?.orientation?.lock) {
      window.screen.orientation.lock('landscape').catch(() => {});
    }

    // ═══ AAA Game Fullscreen Recovery System ═══
    // Initialise the recovery listener — when the system notification bar
    // causes fullscreen to exit, the overlay slides down and auto-recovers.
    const cleanupRecovery = initFullscreenRecovery((isRecovering) => {
      setFsRecoveryVisible(isRecovering);
    });

    // Auto-enter fullscreen on first user touch/click on mobile
    const handleGesture = () => {
      if (isFullscreen()) return;
      const ua = navigator.userAgent || '';
      const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua) || (window.innerWidth <= 840);
      if (isMobile) {
        requestFullscreen().catch(() => {});
      }
    };

    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('touchstart', handleGesture, { passive: true });

    return () => {
      cleanupRecovery();
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, []);

  return (
    <div className="h-full w-full bg-nsk-bg overflow-hidden relative">
      {/* Cinematic NSK Logo Intro Splash Screen (Shown immediately on app launch) */}
      {showSplash && (
        <CinematicSplashScreen onComplete={() => setShowSplash(false)} durationMs={3800} />
      )}

      {/* ═══ AAA Game Fullscreen Recovery Overlay ═══ */}
      <FullscreenRecoveryOverlay
        visible={fsRecoveryVisible}
        onTap={handleRecoveryTap}
      />

      {/* ═══ Dedicated Landscape Enforcer (Prompts rotation if device held in portrait) ═══ */}
      <LandscapeEnforcer />

      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/install" element={<MobilePWAInstallOverlay />} />
          <Route path="/hub" element={<ProtectedRoute><HubPage /></ProtectedRoute>} />
          <Route path="/game/bearing-runner" element={<ProtectedRoute><BearingRunnerPage /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><ScoreResultPage /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
          <Route path="/bearing-check" element={<ProtectedRoute><BearingCheckPage /></ProtectedRoute>} />
          <Route path="/game/plant-arena" element={<ProtectedRoute><PlantArenaRoute /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
