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
 * Creates high-res texture for lane letters (A, B, C, D) on 3D Gate Signs
 */
function createLetterTexture(letter, colorCss = '#38BDF8', bgCss = '#080c18') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Background rounded rect
  ctx.fillStyle = bgCss;
  ctx.fillRect(0, 0, 256, 256);

  // Outer Neon Glow Border
  ctx.strokeStyle = colorCss;
  ctx.lineWidth = 14;
  ctx.strokeRect(8, 8, 240, 240);

  // Inner subtle box
  ctx.fillStyle = `${colorCss}25`;
  ctx.fillRect(20, 20, 216, 216);

  // Text
  ctx.font = '900 140px "Outfit", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = colorCss;
  ctx.shadowBlur = 18;
  ctx.fillText(letter, 128, 134);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates 4 3D Portal Gates (A, B, C, D) with distinct neon colors
 */
function create3DGates() {
  const gatesAssembly = new THREE.Group();
  gatesAssembly.name = 'GatesAssembly';

  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x1e2638,
    metalness: 0.85,
    roughness: 0.25,
  });

  const archMat = new THREE.MeshStandardMaterial({
    color: 0x2d3748,
    metalness: 0.9,
    roughness: 0.2,
  });

  const gateWidth = 1.82;
  const gateHeight = 2.45;
  const postRadius = 0.09;

  LANE_X.forEach((x, idx) => {
    const gateGroup = new THREE.Group();
    gateGroup.position.x = x;
    const label = LANE_LABELS[idx];
    const theme = LANE_COLORS[label];

    // Left Column
    const leftCol = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, gateHeight, 16), pillarMat);
    leftCol.position.set(-gateWidth / 2, gateHeight / 2, 0);
    gateGroup.add(leftCol);

    // Right Column
    const rightCol = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, gateHeight, 16), pillarMat);
    rightCol.position.set(gateWidth / 2, gateHeight / 2, 0);
    gateGroup.add(rightCol);

    // Top Header Crossbar
    const header = new THREE.Mesh(new THREE.BoxGeometry(gateWidth + 0.15, 0.24, 0.26), archMat);
    header.position.set(0, gateHeight + 0.1, 0);
    gateGroup.add(header);

    // Neon Accent Lightstrip on Crossbar
    const neonStripMat = new THREE.MeshBasicMaterial({ color: theme.hex });
    const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(gateWidth, 0.05, 0.28), neonStripMat);
    neonStrip.position.set(0, gateHeight + 0.1, 0);
    gateGroup.add(neonStrip);

    // Floating 3D Glowing Sign Box on top
    const letterTex = createLetterTexture(label, theme.css);
    const signMat = new THREE.MeshBasicMaterial({
      map: letterTex,
      transparent: true,
    });
    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.76, 0.14), [
      pillarMat,
      pillarMat,
      pillarMat,
      pillarMat,
      signMat, // Front face with letter
      signMat, // Back face
    ]);
    signMesh.position.set(0, gateHeight + 0.62, 0);
    gateGroup.add(signMesh);

    // Translucent Energy Barrier / Portal Sheet
    const barrierMat = new THREE.MeshBasicMaterial({
      color: theme.hex,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const barrier = new THREE.Mesh(new THREE.PlaneGeometry(gateWidth - 0.1, gateHeight - 0.1), barrierMat);
    barrier.position.set(0, gateHeight / 2, 0);
    gateGroup.add(barrier);

    gatesAssembly.add(gateGroup);
  });

  return gatesAssembly;
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
    const floorGeo = new THREE.PlaneGeometry(12, 80, 1, 40);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c101d,
      roughness: 0.35,
      metalness: 0.7,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -25);
    scene.add(floor);
    floorRef.current = floor;

    // Lane Dividers (Luminous yellow/blue highway markings)
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

    // Animated highway road dashes spaced at exact 3.8m intervals (38m / 10 = 3.8m)
    const roadDashes = [];
    const dashGeo = new THREE.BoxGeometry(0.09, 0.025, 1.6);
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    for (let z = -43.6; z <= 12; z += 3.8) {
      [-2.0, 0.0, 2.0].forEach((dx) => {
        const dash = new THREE.Mesh(dashGeo, dashMat);
        dash.position.set(dx, 0.02, z);
        scene.add(dash);
        roadDashes.push(dash);
      });
    }

    // Guard Rails (Side safety walls)
    const railGeo = new THREE.BoxGeometry(0.15, 0.5, 80);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
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

    // 6. 3D Player Character Container
    const playerContainer = new THREE.Group();
    playerContainer.name = 'PlayerContainer';
    playerContainer.position.set(currentXRef.current, 0, PLAYER_Z);

    // Glowing ground shadow / track aura beneath runner
    const shadowGeo = new THREE.PlaneGeometry(1.3, 1.3);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    playerContainer.add(shadowMesh);

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

      // 1. Move road dashes at exact synchronized speed
      roadDashes.forEach((dash) => {
        dash.position.z += syncSpeed * safeDelta;
        if (dash.position.z > 9.6) {
          dash.position.z -= 53.2; // 14 intervals * 3.8m = 53.2m
        }
      });

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
