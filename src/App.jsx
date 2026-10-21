import React, { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import CinematicSplashScreen from './components/common/CinematicSplashScreen';
import MobilePWAInstallOverlay from './components/common/MobilePWAInstallOverlay';

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

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();
  const initialNavRef = useRef(true);

  useEffect(() => {
    // Only reset to login on the initial app load/mount
    if (initialNavRef.current) {
      initialNavRef.current = false;
      navigate('/', { replace: true });
    }
  }, []);

  useEffect(() => {
    // Attempt landscape orientation lock where supported without forcing fullscreen dialog
    if (window.screen?.orientation?.lock) {
      window.screen.orientation.lock('landscape').catch(() => {});
    }
  }, []);

  return (
    <div className="h-full w-full bg-nsk-bg overflow-hidden relative">
      {/* Cinematic NSK Logo Intro Splash Screen (Shown immediately on app launch) */}
      {showSplash && (
        <CinematicSplashScreen onComplete={() => setShowSplash(false)} durationMs={3800} />
      )}

      {/* ═══ Mobile PWA Install Overlay (First screen on mobile) ═══ */}
      <MobilePWAInstallOverlay />

      {/* ═══ Dedicated Landscape Enforcer (Prompts rotation if device held in portrait) ═══ */}
      <LandscapeEnforcer />

      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/install" element={<MobilePWAInstallOverlay forced />} />
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
