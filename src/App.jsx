import React, { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import CinematicSplashScreen from './components/common/CinematicSplashScreen';
import MobilePWAInstallOverlay from './components/common/MobilePWAInstallOverlay';
import { requestFullscreen, isFullscreen, initFullscreenRecovery } from './utils/fullscreen';

import LoginPage from './pages/LoginPage';
import LandscapeEnforcer from './components/common/LandscapeEnforcer';
import TermsOverlay from './components/common/TermsOverlay';

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
      submitScore({
        employeeId: employeeId || 'NSK-GUEST',
        department: department || 'plant_cn',
        score: result.score || 0,
        accuracy: result.integrity || 100,
        correctCount: result.repairs || 0,
        game: 'plant_arena',
      }).catch((err) => console.warn('Submit Plant Arena score error:', err));
    },
    [employeeId, department]
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
  const [termsAccepted, setTermsAccepted] = useState(() => {
    try {
      return sessionStorage.getItem('nsk_terms_accepted') === 'true';
    } catch {
      return false;
    }
  });
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [flipAngle, setFlipAngle] = useState(90);
  const navigate = useNavigate();
  const location = useLocation();
  const initialNavRef = useRef(true);

  const handleAcceptTerms = useCallback(() => {
    try {
      sessionStorage.setItem('nsk_terms_accepted', 'true');
    } catch (e) {
      console.warn('sessionStorage unavailable:', e);
    }
    setTermsAccepted(true);
    setShowTermsModal(false);
    requestFullscreen().catch(() => {});
    if (window.screen?.orientation?.lock) {
      window.screen.orientation.lock('landscape').catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleOpenTerms = () => setShowTermsModal(true);
    window.addEventListener('nsk-open-terms', handleOpenTerms);
    return () => window.removeEventListener('nsk-open-terms', handleOpenTerms);
  }, []);

  useEffect(() => {
    return initFullscreenRecovery();
  }, []);

  // Chrome offers its own "install this app" banner as soon as a site has a
  // manifest and a service worker. Swallow it to avoid random resize bursts.
  useEffect(() => {
    const swallow = (e) => { e.preventDefault(); return false; };
    window.addEventListener('beforeinstallprompt', swallow);
    return () => window.removeEventListener('beforeinstallprompt', swallow);
  }, []);

  // Dynamic viewport tracking for automatic mobile landscape display
  const getDims = useCallback(() => {
    if (typeof window === 'undefined') return { isPortrait: false, w: 1000, h: 600 };
    const vv = window.visualViewport;
    const w = vv ? vv.width : window.innerWidth;
    const h = vv ? vv.height : window.innerHeight;
    return {
      isPortrait: h > w,
      w: Math.round(w),
      h: Math.round(h),
    };
  }, []);

  const [viewportDim, setViewportDim] = useState(getDims);

  const handleViewportChange = useCallback(() => {
    setViewportDim(getDims());
  }, [getDims]);

  useEffect(() => {
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    window.addEventListener('popstate', handleViewportChange);
    document.addEventListener('fullscreenchange', handleViewportChange);
    document.addEventListener('webkitfullscreenchange', handleViewportChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      window.removeEventListener('popstate', handleViewportChange);
      document.removeEventListener('fullscreenchange', handleViewportChange);
      document.removeEventListener('webkitfullscreenchange', handleViewportChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
    };
  }, [handleViewportChange]);

  // Keep root rem font size and --app-vh strictly calibrated to the landscape short-axis
  // regardless of physical rotation, navigation, back button, or fullscreen transitions.
  useEffect(() => {
    const short = viewportDim.isPortrait ? viewportDim.w : viewportDim.h;
    const px = Math.min(17.5, Math.max(13, short / 25));
    document.documentElement.style.fontSize = `${px.toFixed(2)}px`;
    document.documentElement.style.setProperty('--app-vh', `${(short / 100).toFixed(2)}px`);
    document.documentElement.style.setProperty('--app-height', `${short}px`);
  }, [viewportDim]);

  useEffect(() => {
    // Only reset to login on the initial app load/mount
    if (initialNavRef.current) {
      initialNavRef.current = false;
      navigate('/', { replace: true });
    }
  }, []);

  // Maintain landscape orientation lock and re-sync dimensions across navigation and back actions
  useEffect(() => {
    handleViewportChange();
    if (window.screen?.orientation?.lock) {
      window.screen.orientation.lock('landscape').catch(() => {});
    }
  }, [location.pathname, handleViewportChange]);

  // When device is in portrait (mobile orientation locked or upright),
  // automatically run in landscape as default so the user naturally rotates their phone
  // without having to enable auto-rotate in phone settings.
  const isMobilePortrait = viewportDim.isPortrait;
  const containerStyle = isMobilePortrait
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${viewportDim.h}px`,
        height: `${viewportDim.w}px`,
        transform: flipAngle === 90 ? 'rotate(90deg) translateY(-100%)' : 'rotate(-90deg) translateX(-100%)',
        transformOrigin: 'top left',
        overflow: 'hidden',
        fontSize: `clamp(13px, calc(${viewportDim.w}px / 25), 17.5px)`,
      }
    : {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      };

  return (
    <div className="h-full w-full bg-nsk-bg overflow-hidden relative" style={containerStyle}>
      {/* Cinematic NSK Logo Intro Splash Screen (Shown immediately on link click) */}
      {showSplash && (
        <CinematicSplashScreen onComplete={() => setShowSplash(false)} durationMs={3800} />
      )}

      {/* Terms of Use Gatekeeper Overlay (White CAD theme, appears at start right after logo splash) */}
      <TermsOverlay
        isOpen={(!termsAccepted && !showSplash) || showTermsModal}
        isGatekeeper={!termsAccepted}
        onAccept={handleAcceptTerms}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Non-intrusive 180° Flip button (Only visible if device is portrait-locked and user tilts the opposite way) */}
      {isMobilePortrait && (
        <button
          type="button"
          onClick={() => setFlipAngle((prev) => (prev === 90 ? -90 : 90))}
          className="fixed top-2.5 right-2.5 z-[999998] px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 active:bg-cyan-600/80 text-white/80 hover:text-white border border-white/15 text-[10px] font-mono tracking-wider backdrop-blur-md transition-all flex items-center gap-1 select-none pointer-events-auto cursor-pointer"
          title="Flip 180° orientation"
        >
          <span>🔄</span>
          <span>FLIP</span>
        </button>
      )}

      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          {/* Backup route: PWA install overlay preserved safely as requested */}
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
