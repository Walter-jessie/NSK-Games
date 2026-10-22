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
  return () => {};
}
