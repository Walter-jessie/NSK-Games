import React, { useState, useEffect } from 'react';
import { isFullscreen, toggleFullscreen } from '../../utils/fullscreen';

/**
 * Quick 1-tap Fullscreen Toggle Button
 * Allows user to hide phone status bar and address bar instantly.
 */
export default function FullscreenToggleButton({ className = '' }) {
  const [fullscreenActive, setFullscreenActive] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setFullscreenActive(isFullscreen());
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    setFullscreenActive(isFullscreen());

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    toggleFullscreen();
  };

  return (
    <button
      id="btn-toggle-fullscreen"
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold transition-all shadow-sm active:scale-95 ${
        fullscreenActive
          ? 'bg-emerald-500/15 border border-emerald-400/50 text-emerald-400 hover:bg-emerald-500/25'
          : 'bg-black/40 hover:bg-black/60 border border-white/20 text-slate-200 hover:text-white'
      } ${className}`}
      title={fullscreenActive ? 'Exit Fullscreen' : 'Enter Fullscreen (Hides Phone Status Bar)'}
    >
      <span className="text-xs sm:text-sm">{fullscreenActive ? '⛷' : '⛶'}</span>
      <span className="hidden sm:inline text-[10px] tracking-wider uppercase">
        {fullscreenActive ? 'FULL' : 'FULLSCREEN'}
      </span>
    </button>
  );
}
