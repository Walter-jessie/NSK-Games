import * as THREE from 'three';

/**
 * Background atmosphere for the runner bay: engineering notation drifting past,
 * well outside the lanes.
 *
 * Text only. The field used to carry wireframe cogs, rings and gauge blocks as
 * well, but solid shapes out in the periphery read as obstacles the player
 * might need to dodge, which is the opposite of what a backdrop should do. A
 * floating symbol never reads as something coming at you.
 *
 * Everything sits beyond the guard rails, below the HUD, at low opacity, and
 * drifts slower than the track so it reads as distance. Nothing crosses the
 * four lanes.
 *
 * Cost: one draw call per panel, no lighting work, and the glyph textures are
 * built once and shared, so recycling a panel only swaps which map it points at.
 */

// The question panel and answer lanes own the top ~42% of the screen, so the
// only space actually visible is the two wedges either side of the track,
// below the horizon. These bounds keep the field in those wedges: out past
// the rails at +/-4.5, and low rather than up in the sky where the HUD is.
const SIDE_NEAR = 6.5;
const SIDE_FAR = 19;
const Y_LOW = 0.35;
const Y_HIGH = 4.6;
// Near enough to sit in the side wedges rather than converging on the
// horizon, which is where the HUD begins.
const Z_START = -42;
const Z_END = 9;
const Z_SPAN = Z_END - Z_START;

const COOL = { fill: '#bfe9ff', rule: '#4ea8d8' };
const WARM = { fill: '#ffd9a8', rule: '#d8923f' };

const FONT = '600 76px "Outfit", "Segoe UI", system-ui, sans-serif';
const PANEL_H = 1.5;   // world height of a panel; width follows the glyph

/**
 * Symbols and notation an NSK trainee would recognise: bare constants and
 * units alongside the formulas they turn up in.
 */
const NOTATION = [
  'π',
  '2πr',
  'πr²',
  'Ω',
  'Ω = V / I',
  'ω = 2πn / 60',
  'τ = F · r',
  'σ = F / A',
  'Σ F = 0',
  'Δt',
  'µm',
  'kN',
  'N · m',
  '°C',
  'Ø 40 H7',
  'Ra 0.20 µm',
  'L₁₀ = (C/P)³',
  'η = Pout / Pin',
  'SUJ2 · 100Cr6',
  'NSK 6208ZZ',
];

/**
 * Glyph drawn on a canvas cropped to the text itself, so a bare 'π' becomes a
 * small panel and a full formula a wide one. A fixed-width plane left short
 * symbols floating in the middle of a mostly empty quad.
 */
const textureCache = new Map();
function notationTexture(text, warm) {
  const cacheKey = (warm ? 'w:' : 'c:') + text;
  const hit = textureCache.get(cacheKey);
  if (hit) return hit;

  const theme = warm ? WARM : COOL;
  const pad = 30;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = FONT;

  const c = document.createElement('canvas');
  c.width = Math.max(128, Math.ceil(probe.measureText(text).width) + pad * 2);
  c.height = 160;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = FONT;
  ctx.fillStyle = theme.fill;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, 72);
  // Rule under the text, the way a callout on a drawing is underlined.
  ctx.fillStyle = theme.rule;
  ctx.fillRect(pad, 126, c.width - pad * 2, 4);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData.aspect = c.width / c.height;
  textureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Place one panel. `side` is passed in rather than rolled: each panel keeps the
 * side it was born on, so the field stays balanced left to right. Rolling it
 * per panel, and again on every recycle, let a handful of panels drift onto the
 * same side and left one wedge of the screen empty.
 */
function scatter(rand, side) {
  // Bias towards the near end. Spread evenly, most of the field bunches at the
  // horizon, which is exactly where the question panel starts.
  const near = Math.pow(rand(), 0.55);
  return {
    x: side * (SIDE_NEAR + rand() * (SIDE_FAR - SIDE_NEAR)),
    y: Y_LOW + rand() * (Y_HIGH - Y_LOW),
    z: Z_START + near * Z_SPAN,
  };
}

/** `count` is the number of notation panels in the air at once. */
export function createSkyProps({ count = 5, seed = 1 } = {}) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  const group = new THREE.Group();
  group.name = 'SkyProps';

  const panelGeo = new THREE.PlaneGeometry(1, 1);
  const panels = [];

  // A panel takes its width from whichever glyph it is currently showing, so
  // sizing happens here and again on every recycle.
  const dress = (panel) => {
    const tex = notationTexture(
      NOTATION[Math.floor(rand() * NOTATION.length)],
      rand() < 0.3,
    );
    panel.mesh.material.map = tex;
    panel.mesh.material.needsUpdate = true;
    panel.mesh.scale.set(PANEL_H * tex.userData.aspect * panel.size, PANEL_H * panel.size, 1);
  };

  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(panelGeo, mat);
    mesh.frustumCulled = false;
    const side = i % 2 === 0 ? -1 : 1;
    const p = scatter(rand, side);
    mesh.position.set(p.x, p.y, p.z);

    const panel = { mesh, side, drift: 0.2 + rand() * 0.22, size: 0.8 + rand() * 0.7 };
    dress(panel);
    panels.push(panel);
    group.add(mesh);
  }

  return {
    group,
    /** advance: metres the track moved this frame. */
    update(advance) {
      for (const panel of panels) {
        panel.mesh.position.z += advance * panel.drift;
        if (panel.mesh.position.z > Z_END) {
          const n = scatter(rand, panel.side);
          panel.mesh.position.set(n.x, n.y, Z_START);
          panel.drift = 0.2 + rand() * 0.22;
          panel.size = 0.8 + rand() * 0.7;
          dress(panel); // a fresh phrase, so the field does not loop visibly
        }
        // Face the camera, which looks down the +z axis from behind the runner.
        panel.mesh.rotation.y = panel.mesh.position.x > 0 ? -0.5 : 0.5;
      }
    },
    dispose() {
      panelGeo.dispose();
      for (const panel of panels) panel.mesh.material.dispose();
      for (const tex of textureCache.values()) tex.dispose();
      textureCache.clear();
    },
  };
}

export default createSkyProps;
