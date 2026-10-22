/**
 * Universal Mobile Fullscreen Utility — AAA Game Immersive Mode
 *
 * Handles Android Chrome, Safari, and other mobile browsers.
 * Entering fullscreen hides both the phone's system status bar (clock, battery, notifications)
 * and the browser's URL/address bar for a pure native arcade console experience.
 *
 * AAA GAME BEHAVIOR:
 * - Uses `navigationUI: 'hide'` for softer system bar (swipe shows it briefly, auto-hides)
 * - Listens for fullscreen exit (user pulled down system notification bar)
 * - Immediately re-enters fullscreen on the very next touch/click (< 3s window)
 * - This makes swiping down feel like "peek at notifications" instead of "exit the game"
 */

// ─── Track fullscreen recovery state ─────────────────────────
let _recoveryTimerId = null;
let _recoveryActive = false;
let _recoveryCallback = null; // external callback for UI overlay
let _wasFullscreenBeforeExit = false;

export function isFullscreen() {
  if (typeof document === 'undefined') return false;
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

/**
 * Request fullscreen with AAA-game immersive settings.
 * `navigationUI: 'hide'` tells Android Chrome to use immersive sticky mode
 * where the system bar auto-hides after a brief swipe-down peek.
 */
export async function requestFullscreen() {
  if (typeof document === 'undefined') return false;
  const docEl = document.documentElement;
  const opts = { navigationUI: 'hide' };

  try {
    if (docEl.requestFullscreen) {
      await docEl.requestFullscreen(opts);
      _wasFullscreenBeforeExit = true;
      _cancelRecovery();
      return true;
    } else if (docEl.webkitRequestFullscreen) {
      await docEl.webkitRequestFullscreen();
      _wasFullscreenBeforeExit = true;
      _cancelRecovery();
      return true;
    } else if (docEl.mozRequestFullScreen) {
      await docEl.mozRequestFullScreen();
      _wasFullscreenBeforeExit = true;
      _cancelRecovery();
      return true;
    } else if (docEl.msRequestFullscreen) {
      await docEl.msRequestFullscreen();
      _wasFullscreenBeforeExit = true;
      _cancelRecovery();
      return true;
    }
  } catch (err) {
    console.debug('Fullscreen request deferred/rejected:', err);
    return false;
  }
  return false;
}

export async function exitFullscreen() {
  if (typeof document === 'undefined') return false;
  _wasFullscreenBeforeExit = false; // intentional exit, don't recover

  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
      return true;
    } else if (document.mozCancelFullScreen) {
      await document.mozCancelFullScreen();
      return true;
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
      return true;
    }
  } catch (err) {
    console.debug('Exit fullscreen error:', err);
    return false;
  }
  return false;
}

export async function toggleFullscreen() {
  if (isFullscreen()) {
    return await exitFullscreen();
  } else {
    return await requestFullscreen();
  }
}

// ─── AAA Game Fullscreen Recovery System ─────────────────────
// When the system notification bar or back button causes fullscreen to exit,
// auto re-enter on the next user touch/click.

function _cancelRecovery() {
  if (_recoveryTimerId) {
    clearTimeout(_recoveryTimerId);
    _recoveryTimerId = null;
  }
  _recoveryActive = false;
}

/**
 * Initialize the AAA-game fullscreen recovery system.
 * Call this once on app mount.
 *
 * @param {function} onRecoveryStateChange - Callback(isRecovering: boolean)
 *        called when recovery overlay should show/hide
 */
export function initFullscreenRecovery(onRecoveryStateChange) {
  if (typeof document === 'undefined') return () => {};

  _recoveryCallback = onRecoveryStateChange || null;

  const triggerRecovery = async () => {
    if (!_recoveryActive) return;
    _cancelRecovery();
    window.removeEventListener('pointerdown', triggerRecovery, true);
    window.removeEventListener('touchstart', triggerRecovery, true);
    window.removeEventListener('click', triggerRecovery, true);

    try {
      await requestFullscreen();
      if (window.screen?.orientation?.lock) {
        await window.screen.orientation.lock('landscape').catch(() => {});
      }
    } catch (e) {
      console.debug('Recovery fullscreen request failed:', e);
    }

    if (_recoveryCallback) _recoveryCallback(false);
  };

  const armRecoveryListeners = () => {
    window.addEventListener('pointerdown', triggerRecovery, { capture: true, once: true });
    window.addEventListener('touchstart', triggerRecovery, { capture: true, once: true });
    window.addEventListener('click', triggerRecovery, { capture: true, once: true });
  };

  const handleFullscreenChange = () => {
    const fs = isFullscreen();
    if (fs) {
      _wasFullscreenBeforeExit = true;
      _cancelRecovery();
      if (_recoveryCallback) _recoveryCallback(false);
      // Re-enforce orientation lock while in fullscreen
      if (window.screen?.orientation?.lock) {
        window.screen.orientation.lock('landscape').catch(() => {});
      }
    } else if (_wasFullscreenBeforeExit) {
      // Fullscreen was lost unexpectedly (e.g. Back button or system gesture)
      _recoveryActive = true;
      if (_recoveryCallback) _recoveryCallback(true);
      armRecoveryListeners();
    }
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);

  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    window.removeEventListener('pointerdown', triggerRecovery, true);
    window.removeEventListener('touchstart', triggerRecovery, true);
    window.removeEventListener('click', triggerRecovery, true);
    _cancelRecovery();
  };
}
