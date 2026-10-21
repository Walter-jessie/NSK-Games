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

  // Options for smoother system bar behavior (Android Chrome 87+)
  const opts = { navigationUI: 'hide' };

  try {
    if (docEl.requestFullscreen) {
      await docEl.requestFullscreen(opts);
      _wasFullscreenBeforeExit = true;
      _cancelRecovery();
      return true;
    } else if (docEl.webkitRequestFullscreen) {
      // Safari/older WebKit don't support opts, just enter fullscreen
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
    // Browser may reject if not triggered by direct user gesture
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
// When the system notification bar causes fullscreen to exit,
// auto re-enter on the next user touch within 3 seconds.

function _cancelRecovery() {
  if (_recoveryTimerId) {
    clearTimeout(_recoveryTimerId);
    _recoveryTimerId = null;
  }
  _recoveryActive = false;
}

function _onRecoveryTouch() {
  if (!_recoveryActive) return;
  _cancelRecovery();
  // Re-enter fullscreen immediately on this user gesture
  requestFullscreen().catch(() => {});
  // Notify UI to hide the recovery overlay
  if (_recoveryCallback) _recoveryCallback(false);
}

/**
 * Initialize the AAA-game fullscreen recovery system.
 * Call this once on app mount.
 *
 * @param {function} onRecoveryStateChange - Callback(isRecovering: boolean)
 *        called when recovery overlay should show/hide
 */
export function initFullscreenRecovery(onRecoveryStateChange) {
  _recoveryCallback = onRecoveryStateChange || null;

  const handleFullscreenChange = () => {
    if (isFullscreen()) {
      // Entered fullscreen — clear any recovery state
      _wasFullscreenBeforeExit = true;
      _cancelRecovery();
      if (_recoveryCallback) _recoveryCallback(false);
      return;
    }

    // Fullscreen just exited
    if (!_wasFullscreenBeforeExit) return; // intentional exit, skip recovery

    // System notification bar swipe-down detected!
    // Activate recovery mode: re-enter fullscreen on next touch within 3s
    _recoveryActive = true;
    if (_recoveryCallback) _recoveryCallback(true);

    // Listen for the next touch/click to re-enter immediately
    const touchHandler = () => {
      _onRecoveryTouch();
      window.removeEventListener('touchstart', touchHandler, true);
      window.removeEventListener('click', touchHandler, true);
    };
    window.addEventListener('touchstart', touchHandler, { capture: true, passive: true });
    window.addEventListener('click', touchHandler, { capture: true, passive: true });

    // Auto-retract after 3 seconds: hide the recovery overlay,
    // but keep listening for re-entry on next gesture (via App.jsx global handler)
    _recoveryTimerId = setTimeout(() => {
      _recoveryActive = false;
      if (_recoveryCallback) _recoveryCallback(false);
      window.removeEventListener('touchstart', touchHandler, true);
      window.removeEventListener('click', touchHandler, true);
    }, 3000);
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);

  // Return cleanup function
  return () => {
    _cancelRecovery();
    _recoveryCallback = null;
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
  };
}
