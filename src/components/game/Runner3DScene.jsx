import React, { useEffect, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Global cache for optimized 4.9MB runner model so it only downloads and parses once across entire session
let cachedRunnerGltf = null;
let gltfLoadingPromise = null;

export function loadRunnerModel() {
  if (cachedRunnerGltf) return Promise.resolve(cachedRunnerGltf);
  if (gltfLoadingPromise) return gltfLoadingPromise;

  const loader = new GLTFLoader();
  const url = `${import.meta.env.BASE_URL}models/runner2.glb`;
  gltfLoadingPromise = new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        cachedRunnerGltf = gltf;
        resolve(gltf);
      },
      undefined,
      (err) => {
        // Fallback to runner.glb
        const fallbackUrl = `${import.meta.env.BASE_URL}models/runner.glb`;
        loader.load(
          fallbackUrl,
          (gltf2) => {
            cachedRunnerGltf = gltf2;
            resolve(gltf2);
          },
          undefined,
          (err2) => {
            gltfLoadingPromise = null;
            reject(err2);
          }
        );
      }
    );
  });
  return gltfLoadingPromise;
}

// Preload immediately so the 3D model is ready before game countdown finishes
if (typeof window !== 'undefined') {
  loadRunnerModel().catch(() => {});
}

const LANE_X = [-3.0, -1.0, 1.0, 3.0]; // X coordinates for lanes A, B, C, D
const LANE_LABELS = ['A', 'B', 'C', 'D'];
// Lane-change easing rate, per second. Higher arrives sooner.
const LANE_EASE = 26;
export const LANE_COLORS = {
  A: { hex: 0x06b6d4, css: '#06b6d4', name: 'Cyan' },
  B: { hex: 0x3b82f6, css: '#3b82f6', name: 'Electric Blue' },
  C: { hex: 0xa855f7, css: '#a855f7', name: 'Purple' },
  D: { hex: 0xf59e0b, css: '#f59e0b', name: 'Amber' },
};
const PLAYER_Z = -1.5;
const GATE_SPAWN_Z = -38;
const GATE_PASS_Z = 0.5;

/**
 * Sign face for one lane: a lit plate carrying the lane letter.
 * Drawn wide rather than square so it reads as plant signage bolted to a
 * gantry instead of a floating cube.
 */
function createLaneSignTexture(letter, colorCss) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Plate
  ctx.fillStyle = '#0d1522';
  ctx.fillRect(0, 0, 512, 256);

  // Lit face in the lane colour, inset so the plate edge stays visible
  ctx.fillStyle = colorCss;
  ctx.fillRect(14, 14, 484, 228);

  // Darker reading panel behind the letter, for contrast against the colour
  ctx.fillStyle = 'rgba(6, 11, 20, 0.92)';
  ctx.fillRect(150, 34, 212, 188);

  // Bolt heads at the corners
  ctx.fillStyle = '#0d1522';
  for (const [bx, by] of [[36, 36], [476, 36], [36, 220], [476, 220]]) {
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = '900 170px "Outfit", system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 256, 136);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Portal membrane for a gate opening. Light gathers at the floor and along
 * both edges and thins out through the middle, so the opening glows without
 * fogging the track the player is trying to read through it.
 * Built once and tinted per lane by the material colour.
 */
let portalTexture = null;
function getPortalTexture() {
  if (portalTexture) return portalTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const vertical = ctx.createLinearGradient(0, 256, 0, 0);
  vertical.addColorStop(0, 'rgba(255,255,255,0.95)');
  vertical.addColorStop(0.35, 'rgba(255,255,255,0.18)');
  vertical.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, 128, 256);

  // Keep the centre clear: the player reads the track through this.
  ctx.globalCompositeOperation = 'destination-in';
  const horizontal = ctx.createLinearGradient(0, 0, 128, 0);
  horizontal.addColorStop(0, 'rgba(255,255,255,1)');
  horizontal.addColorStop(0.5, 'rgba(255,255,255,0.1)');
  horizontal.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, 0, 128, 256);

  portalTexture = new THREE.CanvasTexture(canvas);
  portalTexture.colorSpace = THREE.SRGBColorSpace;
  portalTexture.needsUpdate = true;
  return portalTexture;
}

/**
 * Overhead lane gantry.
 *
 * One beam spanning all four lanes on two end posts, the way a real plant
 * marks bays, rather than four separate free-standing arches. Each lane gets a
 * lit sign on the beam face and a blade hanging between it and its neighbour,
 * so the lanes read without a translucent sheet across the track.
 */
function create3DGates() {
  const gatesAssembly = new THREE.Group();
  gatesAssembly.name = 'GatesAssembly';

  const SPAN = 8.4;          // clears lanes at -3 .. 3 with a margin
  const BEAM_Y = 2.95;
  const POST_X = SPAN / 2;

  // Painted steel, not bare metal: this scene has no environment map, and a
  // high-metalness material with nothing to reflect renders almost black.
  const steel = new THREE.MeshStandardMaterial({ color: 0xb9c4d2, metalness: 0.25, roughness: 0.5 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x5b697c, metalness: 0.2, roughness: 0.58 });
  const hazard = new THREE.MeshStandardMaterial({ color: 0xf2b705, metalness: 0.3, roughness: 0.6 });

  // ── Main beam: a box section with a lower flange, so it reads as structure ──
  const beam = new THREE.Mesh(new THREE.BoxGeometry(SPAN, 0.42, 0.34), steel);
  beam.position.set(0, BEAM_Y, 0);
  gatesAssembly.add(beam);

  const flange = new THREE.Mesh(new THREE.BoxGeometry(SPAN, 0.1, 0.52), steelDark);
  flange.position.set(0, BEAM_Y - 0.26, 0);
  gatesAssembly.add(flange);

  // ── End posts, with hazard banding at knee height ──
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, BEAM_Y + 0.2, 0.28), steel);
    post.position.set(side * POST_X, (BEAM_Y + 0.2) / 2, 0);
    gatesAssembly.add(post);

    const band = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), hazard);
    band.position.set(side * POST_X, 0.55, 0);
    gatesAssembly.add(band);

    // Gusset tying post to beam
    const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.2), steelDark);
    gusset.position.set(side * (POST_X - 0.32), BEAM_Y - 0.5, 0);
    gusset.rotation.z = side * Math.PI / 4;
    gatesAssembly.add(gusset);
  }

  // ── Inner pillars, floor to beam, dividing the four openings ──
  const PILLAR_H = BEAM_Y - 0.31; // stops under the beam flange
  const pillarGeo = new THREE.BoxGeometry(0.16, PILLAR_H, 0.24);
  const pillarBandGeo = new THREE.BoxGeometry(0.2, 0.26, 0.28);
  for (const x of [-2, 0, 2]) {
    const pillar = new THREE.Mesh(pillarGeo, steelDark);
    pillar.position.set(x, PILLAR_H / 2, 0);
    gatesAssembly.add(pillar);

    // Same hazard banding as the end posts, so the row reads as one structure
    const band = new THREE.Mesh(pillarBandGeo, hazard);
    band.position.set(x, 0.55, 0);
    gatesAssembly.add(band);
  }

  // ── Per-lane signage and floor marking ──
  LANE_X.forEach((x, idx) => {
    const label = LANE_LABELS[idx];
    const theme = LANE_COLORS[label];

    // Lit sign on the beam face. emissiveMap keeps it readable at distance
    // without the flat unlit look of a basic material.
    const tex = createLaneSignTexture(label, theme.css);
    const signMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 1.15,
      metalness: 0.1,
      roughness: 0.6,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.72, 0.1), [
      steelDark, steelDark, steelDark, steelDark, signMat, signMat,
    ]);
    sign.position.set(x, BEAM_Y + 0.52, 0.06);
    gatesAssembly.add(sign);

    // Short hanger from beam to sign
    const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), steelDark);
    hanger.position.set(x, BEAM_Y + 0.22, 0.06);
    gatesAssembly.add(hanger);

    // Lane colour laid on the floor, which is what the player actually aims at
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.46),
      new THREE.MeshBasicMaterial({ color: theme.hex, transparent: true, opacity: 0.85 }),
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(x, 0.03, 0);
    gatesAssembly.add(strip);

    // ── Portal: membrane across the opening, plus a lit lintel and jambs ──
    const openW = 1.84;
    const openH = BEAM_Y - 0.33;

    const membrane = new THREE.Mesh(
      new THREE.PlaneGeometry(openW, openH),
      new THREE.MeshBasicMaterial({
        map: getPortalTexture(),
        color: theme.hex,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    membrane.position.set(x, openH / 2, 0);
    membrane.renderOrder = 2;
    gatesAssembly.add(membrane);

    const glow = new THREE.MeshBasicMaterial({ color: theme.hex });

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(openW, 0.07, 0.1), glow);
    lintel.position.set(x, openH, 0.13);
    gatesAssembly.add(lintel);

    for (const side of [-1, 1]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.05, openH, 0.1), glow);
      jamb.position.set(x + side * (openW / 2), openH / 2, 0.13);
      gatesAssembly.add(jamb);
    }
  });

  return gatesAssembly;
}

/** Forward chevron painted on the floor of the player's lane. */
let arrowTexture = null;
function getArrowTexture() {
  if (arrowTexture) return arrowTexture;
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 64;
  const ctx = c.getContext('2d');

  // A stroked chevron, not a solid arrow: two thick arms meeting at a point,
  // pointing away from the camera once the quad is laid flat.
  ctx.strokeStyle = '#6ef09a';
  ctx.lineWidth = 17;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 4;
  ctx.shadowColor = '#22c55e';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(14, 50);
  ctx.lineTo(48, 17);
  ctx.lineTo(82, 50);
  ctx.stroke();

  arrowTexture = new THREE.CanvasTexture(c);
  arrowTexture.colorSpace = THREE.SRGBColorSpace;
  return arrowTexture;
}

/**
 * Shop-floor atmosphere: fine steel motes drifting down the bay with a few
 * warm grinding sparks among them.
 *
 * One Points cloud, so the whole effect is a single draw call. Colour is per
 * vertex rather than per material, which is what lets the cool motes and the
 * warm sparks share that one cloud. Kept clear of the middle of the track so
 * nothing drifts across the lane the player is reading.
 */
const MOTE_COUNT = 180;
function createShopFloorMotes() {
  const sprite = document.createElement('canvas');
  sprite.width = 32;
  sprite.height = 32;
  const sctx = sprite.getContext('2d');
  const grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 32, 32);
  const spriteTex = new THREE.CanvasTexture(sprite);

  const positions = new Float32Array(MOTE_COUNT * 3);
  const colors = new Float32Array(MOTE_COUNT * 3);
  const drift = new Float32Array(MOTE_COUNT);
  const baseY = new Float32Array(MOTE_COUNT);

  const place = (i) => {
    // Push each mote out of the centre so the lanes stay clean to read.
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (1.4 + Math.random() * 4.6);
    // Kept low: higher up and against the dark sky they read as stars rather
    // than as dust hanging in a lit bay.
    const y = 0.12 + Math.random() * 1.9;
    const z = -40 + Math.random() * 42;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    baseY[i] = y;
    drift[i] = 0.4 + Math.random() * 1.6;

    // Roughly one in five is a warm spark off a grinding wheel.
    if (Math.random() < 0.2) {
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.62;
      colors[i * 3 + 2] = 0.24;
    } else {
      colors[i * 3] = 0.82;
      colors[i * 3 + 1] = 0.89;
      colors[i * 3 + 2] = 1.0;
    }
  };
  for (let i = 0; i < MOTE_COUNT; i++) place(i);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.115,
      map: spriteTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.name = 'ShopFloorMotes';
  points.frustumCulled = false;

  points.userData.update = (advance, timestamp) => {
    const attr = geo.attributes.position;
    const t = timestamp * 0.001;
    for (let i = 0; i < MOTE_COUNT; i++) {
      // Motes hang in the air, so they travel slower than the track itself.
      let z = attr.array[i * 3 + 2] + advance * drift[i];
      if (z > 3) {
        z -= 44;
        attr.array[i * 3] = (Math.random() < 0.5 ? -1 : 1) * (1.4 + Math.random() * 4.6);
      }
      attr.array[i * 3 + 2] = z;
      attr.array[i * 3 + 1] = baseY[i] + Math.sin(t * 0.8 + i) * 0.07;
    }
    attr.needsUpdate = true;
  };

  return points;
}

export default function Runner3DScene({
  playerLane = 1,
  gateProgress = 0, // 0 to 1 (0 = far away, 1 = collision line)
  feedbackType = null, // 'correct' | 'wrong' | null
  currentSpeed = 0.028,
  isPaused = false,
  className = '',
}) {
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const mixerRef = useRef(null);
  const gatesRef = useRef(null);
  const floorRef = useRef(null);
  const animFrameRef = useRef(null);
  const targetXRef = useRef(LANE_X[playerLane]);
  const currentXRef = useRef(LANE_X[playerLane]);
  const isPausedRef = useRef(isPaused);

  // Sync isPaused and pause/resume animation mixer
  useEffect(() => {
    isPausedRef.current = isPaused;
    if (mixerRef.current) {
      mixerRef.current.timeScale = isPaused ? 0 : 1;
    }
  }, [isPaused]);

  // Keep target lane in sync
  // Layout effect, not effect: the target must be in place before the browser
  // paints, otherwise every lane change costs a frame before the runner moves.
  useLayoutEffect(() => {
    targetXRef.current = LANE_X[playerLane] ?? 0;
  }, [playerLane]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    let isDisposed = false;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x223449, 0.016);

    // 2. 2.5D Highway Camera (Behind & slightly above runner)
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 100);
    camera.position.set(0, 2.8, 4.5);
    camera.lookAt(0, 1.1, -12);

    // 3. WebGL Renderer (Tuned for 60fps on mobile chipsets)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.55;
    container.appendChild(renderer.domElement);

    // 4. Industrial Factory Floor & 4 Lanes
    // Flat plane: the old 40 length segments produced 80 triangles for a
    // surface that only ever needed two.
    const floorGeo = new THREE.PlaneGeometry(12, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111726,
      roughness: 0.4,
      metalness: 0.5,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -25);
    scene.add(floor);
    floorRef.current = floor;

    // Lane Dividers
    const dividerGeo = new THREE.BoxGeometry(0.04, 0.015, 80);
    const dividerMat = new THREE.MeshBasicMaterial({
      color: 0x1e3a8a,
      transparent: true,
      opacity: 0.45,
    });
    [-2.0, 0.0, 2.0].forEach((divX) => {
      const divider = new THREE.Mesh(dividerGeo, dividerMat);
      divider.position.set(divX, 0.01, -25);
      scene.add(divider);
    });

    // Factory safety marking down both edges of the bay, with the dark keyline
    // a painted floor line always carries.
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xf2b705,
      roughness: 0.65,
      metalness: 0.1,
      emissive: 0x6b4e00,
      emissiveIntensity: 0.6,
    });
    const keylineMat = new THREE.MeshBasicMaterial({ color: 0x0b0f18 });
    [-4.18, 4.18].forEach((ex) => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.016, 80), edgeMat);
      edge.position.set(ex, 0.012, -25);
      scene.add(edge);

      const keyline = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.018, 80), keylineMat);
      keyline.position.set(ex + (ex < 0 ? 0.18 : -0.18), 0.013, -25);
      scene.add(keyline);
    });

    // Animated highway road dashes at 3.8m intervals.
    // One InstancedMesh: this used to be 45 separate meshes, so 45 draw calls
    // and 45 transform updates every frame.
    const DASH_ROWS = 15;
    const DASH_LANES = [-2.0, 0.0, 2.0];
    const DASH_COUNT = DASH_ROWS * DASH_LANES.length;
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    const dashes = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.09, 0.025, 1.6),
      dashMat,
      DASH_COUNT,
    );
    dashes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    dashes.frustumCulled = false;
    const dashX = new Float32Array(DASH_COUNT);
    const dashZ = new Float32Array(DASH_COUNT);
    const dummy = new THREE.Object3D();
    let di = 0;
    for (let row = 0; row < DASH_ROWS; row++) {
      for (const dx of DASH_LANES) {
        dashX[di] = dx;
        dashZ[di] = -43.6 + row * 3.8;
        di++;
      }
    }
    scene.add(dashes);

    // Forward chevrons painted ahead of the player, in whichever lane the
    // player is in. Three instances, one draw call.
    const ARROW_COUNT = 3;
    const ARROW_GAP = 1.05;
    const arrows = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.92, 0.62),
      new THREE.MeshBasicMaterial({
        map: getArrowTexture(),
        color: 0x5bf08a,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      ARROW_COUNT,
    );
    arrows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    arrows.frustumCulled = false;
    const arrowZ = new Float32Array(ARROW_COUNT);
    let arrowLaneX = currentXRef.current;
    for (let i = 0; i < ARROW_COUNT; i++) arrowZ[i] = PLAYER_Z - 1.7 - i * ARROW_GAP;

    // Per-instance colour, so one chevron can brighten at a time without
    // needing a material each. setColorAt allocates the attribute.
    const ARROW_BASE = new THREE.Color(0x5bf08a);
    const arrowColor = new THREE.Color();
    for (let i = 0; i < ARROW_COUNT; i++) arrows.setColorAt(i, ARROW_BASE);
    scene.add(arrows);

    // Seed every instance matrix now. The animation loop renders a single
    // static frame while paused and returns before it scrolls anything, so
    // without this the tutorial frame would show all instances stacked at the
    // origin.
    for (let i = 0; i < DASH_COUNT; i++) {
      dummy.position.set(dashX[i], 0.02, dashZ[i]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      dashes.setMatrixAt(i, dummy.matrix);
    }
    dashes.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < ARROW_COUNT; i++) {
      dummy.position.set(currentXRef.current, 0.022, arrowZ[i]);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      arrows.setMatrixAt(i, dummy.matrix);
    }
    arrows.instanceMatrix.needsUpdate = true;

    // Guard Rails (Side safety walls)
    const railGeo = new THREE.BoxGeometry(0.15, 0.5, 80);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x27354a, metalness: 0.4, roughness: 0.5 });
    [-4.5, 4.5].forEach((rx) => {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(rx, 0.25, -25);
      scene.add(rail);
    });

    // 5. Lighting
    const dirLight = new THREE.DirectionalLight(0xffffff, 3.4);
    dirLight.position.set(4, 12, 6);
    scene.add(dirLight);

    // Sky/ground fill. This replaces a static blue point light: point lights
    // shade per pixel across the whole track, a hemisphere light is near free,
    // and it lifts the floor and rails far more evenly.
    const skyFill = new THREE.HemisphereLight(0xcfe4ff, 0x33414f, 1.9);
    scene.add(skyFill);

    // Dynamic Player Spotlight (follows player X)
    const playerSpot = new THREE.PointLight(0x93c5fd, 3.0, 8.0);
    playerSpot.position.set(0, 3.0, PLAYER_Z + 1.2);
    scene.add(playerSpot);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambientLight);

    // Shop-floor atmosphere (single draw call)
    const motes = createShopFloorMotes();
    scene.add(motes);

    // 6. 3D Player Character Container
    const playerContainer = new THREE.Group();
    playerContainer.name = 'PlayerContainer';
    playerContainer.position.set(currentXRef.current, 0, PLAYER_Z);


    scene.add(playerContainer);
    playerRef.current = playerContainer;

    loadRunnerModel()
      .then((gltf) => {
        if (isDisposed) return; // Disposed guard

        const runner = cloneSkeleton(gltf.scene);
        runner.name = 'MixamoRunner';
        // Face forward along track toward portal gates (-Z)
        runner.rotation.y = Math.PI;
        runner.scale.set(1.0, 1.0, 1.0);

        runner.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = 0.35;
              child.material.metalness = 0.25;
            }
          }
        });

        playerContainer.add(runner);

        // Play Mixamo running animation
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(runner);
          mixerRef.current = mixer;
          const runAction = mixer.clipAction(gltf.animations[0]);
          runAction.play();
          if (isPausedRef.current) {
            mixer.timeScale = 0; // Freeze while paused
          }
        }
      })
      .catch((err) => {
        console.error('GLTFLoader runner model load error:', err);
      });

    // 7. 3D Gates Assembly
    const gates = create3DGates();
    gates.position.z = GATE_SPAWN_Z;
    scene.add(gates);
    gatesRef.current = gates;

    // 8. Render & Animation Loop
    let lastTime = performance.now();
    let hasRenderedPreview = false;

    const animate = (timestamp) => {
      animFrameRef.current = requestAnimationFrame(animate);

      // If paused (e.g. during tutorial), render a single static preview frame and sleep
      if (isPausedRef.current) {
        lastTime = timestamp;
        if (!hasRenderedPreview) {
          renderer.render(scene, camera);
          hasRenderedPreview = true;
        }
        return;
      }
      hasRenderedPreview = false;

      const delta = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      const safeDelta = Math.min(Math.max(delta, 0.001), 0.05); // Safe delta avoiding NaN/hitch
      const speed = currentSpeedRef.current || 0.017;

      // Exact synchronized 3D speed matching portal gate velocity
      const syncSpeed = (38 / 78) * (speed * 1000);

      // 1. Scroll the track. Dashes, chevrons and side plant are each a single
      // InstancedMesh, so this writes matrices rather than touching the scene
      // graph, and each costs one draw call however many pieces it shows.
      const advance = syncSpeed * safeDelta;

      for (let i = 0; i < DASH_COUNT; i++) {
        let z = dashZ[i] + advance;
        if (z > 9.6) z -= 53.2; // 14 intervals * 3.8m
        dashZ[i] = z;
        dummy.position.set(dashX[i], 0.02, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        dashes.setMatrixAt(i, dummy.matrix);
      }
      dashes.instanceMatrix.needsUpdate = true;

      // A pulse running outward through the chevrons, nearest first. Three
      // colour writes a frame; the geometry never moves.
      const pulse = (timestamp * 0.0022) % 1;
      for (let i = 0; i < ARROW_COUNT; i++) {
        const phase = (pulse - i * 0.26 + 1) % 1;
        const peak = Math.max(0, 1 - Math.abs(phase - 0.35) * 3.4);
        arrowColor.copy(ARROW_BASE).multiplyScalar(0.4 + peak * 0.95);
        arrows.setColorAt(i, arrowColor);
      }
      if (arrows.instanceColor) arrows.instanceColor.needsUpdate = true;

      // Chevrons hold station ahead of the runner and only follow the lane
      // sideways, so this writes nothing while the player stays put.
      if (currentXRef.current !== arrowLaneX) {
        arrowLaneX = currentXRef.current;
        for (let i = 0; i < ARROW_COUNT; i++) {
          dummy.position.set(arrowLaneX, 0.022, arrowZ[i]);
          dummy.rotation.set(-Math.PI / 2, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          arrows.setMatrixAt(i, dummy.matrix);
        }
        arrows.instanceMatrix.needsUpdate = true;
      }

      // 1b. Drift the shop-floor motes down the bay
      motes.userData.update(syncSpeed * safeDelta, timestamp);

      // 2. Position portal gates in the exact same render frame (eliminates 1-frame React delay)
      if (gatesRef.current) {
        gatesRef.current.position.z = GATE_SPAWN_Z + gateProgressRef.current * (GATE_PASS_Z - GATE_SPAWN_Z);
      }

      // 3. Update character running animation
      if (mixerRef.current) {
        const speedScale = Math.max(0.9, syncSpeed / 6.2);
        mixerRef.current.update(safeDelta * speedScale);
      }

      // Horizontal lane transition. Frame-rate independent exponential easing:
      // the old fixed per-frame fraction eased differently at 30 and 60 fps.
      // The snap threshold is wide enough that the runner arrives cleanly
      // instead of creeping the last millimetre into the lane.
      const diffX = targetXRef.current - currentXRef.current;
      if (Math.abs(diffX) < 0.01) {
        currentXRef.current = targetXRef.current;
      } else {
        currentXRef.current += diffX * (1 - Math.exp(-LANE_EASE * safeDelta));
      }

      if (playerRef.current) {
        playerRef.current.position.x = currentXRef.current;
        playerSpot.position.x = currentXRef.current;
      }

      // Render
      renderer.render(scene, camera);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 800;
      const newH = container.clientHeight || 450;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      playerRef.current = null;
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Keep currentSpeed in sync via ref so animate loop always has latest speed
  const currentSpeedRef = useRef(currentSpeed);
  useEffect(() => {
    currentSpeedRef.current = currentSpeed;
  }, [currentSpeed]);

  // Keep gateProgress in sync via ref so animate loop renders gates with 0ms delay
  const gateProgressRef = useRef(gateProgress);
  useEffect(() => {
    gateProgressRef.current = gateProgress;
  }, [gateProgress]);

  // Color flash when collision feedback occurs (only runs when feedbackType changes, avoiding 60fps traversal overhead)
  useEffect(() => {
    if (gatesRef.current) {
      gatesRef.current.traverse((child) => {
        if (child.isMesh && child.material && !Array.isArray(child.material) && child.material.color) {
          if (child.userData.origHex === undefined) {
            child.userData.origHex = child.material.color.getHex();
          }
          if (feedbackType === 'correct') {
            child.material.color.setHex(0x10b981); // Emerald pulse
          } else if (feedbackType === 'wrong') {
            child.material.color.setHex(0xef4444); // Crimson warning
          } else if (child.userData.origHex !== undefined) {
            child.material.color.setHex(child.userData.origHex);
          }
        }
      });
    }
  }, [feedbackType]);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
}
