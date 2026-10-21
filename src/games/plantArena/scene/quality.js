// Quality tiers so the arena runs on ₹10,000 phones (Mali-G52 / Adreno 610
// class) and still looks rich on better devices. The tier is guessed up front
// from the device, then lowered automatically if the measured frame rate drops.
export const TIERS = {
  low: {
    name: 'low',
    pixelRatio: 1.0,
    shadows: false, // blob shadows only
    shadowMapSize: 0,
    statusLights: 0, // attacked machines glow with floor decals only
    envReflections: false,
    sparks: 14,
    arcs: 2,
    outlines: true,
    maxFps: 45,
  },
  high: {
    name: 'high',
    pixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    statusLights: 3,
    envReflections: true,
    sparks: 28,
    arcs: 3,
    outlines: true,
    maxFps: 60,
  },
};

const BUDGET_GPU = /(mali-g(31|51|52|57|68)|mali-t|adreno \(tm\) (3|4|5|6[0-1])\d\d|powervr|ge8320|img)/i;

export function guessTier(renderer) {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('quality') && TIERS[params.get('quality')]) return TIERS[params.get('quality')];
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    const memory = navigator.deviceMemory ?? 4;
    const cores = navigator.hardwareConcurrency ?? 4;
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    if (BUDGET_GPU.test(gpu) || (mobile && (memory <= 4 || cores <= 4))) return TIERS.low;
    return mobile ? TIERS.low : TIERS.high;
  } catch {
    return TIERS.low;
  }
}

// Watches the frame rate for the first seconds of play and calls onDowngrade
// once if a high tier device cannot hold ~40 fps.
export function createFpsGuard(onDowngrade, { sampleSeconds = 4, minFps = 40 } = {}) {
  let elapsed = 0;
  let frames = 0;
  let done = false;
  return (dt) => {
    if (done) return;
    elapsed += dt;
    frames++;
    if (elapsed >= sampleSeconds) {
      done = true;
      if (frames / elapsed < minFps) onDowngrade();
    }
  };
}
