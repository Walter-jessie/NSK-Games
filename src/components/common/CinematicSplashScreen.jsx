import React, { useState, useEffect } from 'react';
import soundEffects from '../../services/audioService';

/**
 * Cinematic NSK Title Splash Screen
 * - Red-themed geometric polygon backdrop (matching NSK brand, zero lens flare)
 * - Immediate visual presence: NO 1-second delay, logo appears immediately on frame 1
 * - Pure NSK red logo centered on screen with deep ambient glow
 * - Zero text clutter
 * - Smooth cinematic fade-out before transitioning to the login page
 */
export default function CinematicSplashScreen({ onComplete, durationMs = 4000 }) {
  const [phase, setPhase] = useState('visible'); // 'visible' | 'exiting' | 'done'

  useEffect(() => {
    // Play cinematic intro sound immediately
    soundEffects.playCinematicIntro();

    // 1. Slow cinematic fade-out begins near the end (~3000ms)
    const exitTimer = setTimeout(() => {
      setPhase('exiting');
    }, Math.max(durationMs - 1000, 1000));

    // 2. Complete transition and unmount at durationMs (~4000ms)
    const finishTimer = setTimeout(() => {
      setPhase('done');
      if (onComplete) onComplete();
    }, durationMs);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onComplete]);

  if (phase === 'done') return null;

  const handleInteraction = () => {
    soundEffects.playCinematicIntro();
  };

  return (
    <div
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      className={`fixed inset-0 z-[1000000] flex items-center justify-center bg-black overflow-hidden select-none transition-opacity duration-1000 ease-in-out ${
        phase === 'exiting' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Red-themed Geometric Backdrop (No Lens Flare) */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[4500ms] ease-out scale-100"
        style={{
          backgroundImage: 'url("./cinematic_bg.jpg"), url("/cinematic_bg.jpg")',
        }}
      />

      {/* Dark vignette overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/70 pointer-events-none" />

      {/* Immediate Official NSK Red Logo - zero initial delay */}
      <div
        className={`relative z-10 transition-all duration-1000 ease-out transform ${
          phase === 'exiting' ? 'opacity-0 scale-105' : 'opacity-100 scale-100 animate-fade-in'
        }`}
      >
        <img
          src="./nsk_logo.png"
          alt="NSK"
          className="w-64 sm:w-80 md:w-[420px] max-w-[80vw] max-h-[35vh] h-auto object-contain"
        />
      </div>
    </div>
  );
}
