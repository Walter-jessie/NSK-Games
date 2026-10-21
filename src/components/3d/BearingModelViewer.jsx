import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  DIMENSIONS,
  ballPositions,
  createCageGeometry,
  createCageRivetGeometry,
  createInnerRingGeometry,
  createOuterRingGeometry,
} from './bearingGeometry.js';

// Official NSK mark, loaded once and shared by every rebuild of the assembly.
let nskLogoTexture = null;
function getNskLogoTexture() {
  if (!nskLogoTexture) {
    nskLogoTexture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}images/nsk_logo.png`);
    nskLogoTexture.colorSpace = THREE.SRGBColorSpace;
    nskLogoTexture.anisotropy = 4;
  }
  return nskLogoTexture;
}

/**
 * Creates dynamic 3D Deep Groove Ball Bearing geometry matching parts collected (0 to 10).
 * High-precision chrome steel rings, mirror chrome balls, machined brass cage, nitrile seals.
 */
function createDynamicBearing(partsCount = 10) {
  const bearingGroup = new THREE.Group();
  bearingGroup.name = 'BearingAssembly';

  const d = DIMENSIONS;
  // The reference model is built at its own scale; the camera here expects an
  // outer radius near 3.3, so the finished assembly is scaled up as a whole.
  const SCALE = 2.0;

  // ── Materials, matching the NSK reference model ──
  const ringSteel = new THREE.MeshPhysicalMaterial({
    color: 0xcfd5dd, metalness: 1, roughness: 0.22, envMapIntensity: 1.25,
  });
  const innerSteel = new THREE.MeshPhysicalMaterial({
    color: 0xc3c9d2, metalness: 1, roughness: 0.2, envMapIntensity: 1.25,
  });
  const ballChrome = new THREE.MeshPhysicalMaterial({
    color: 0xeef1f5, metalness: 1, roughness: 0.09, envMapIntensity: 1.5,
  });
  const cageSteel = new THREE.MeshPhysicalMaterial({
    color: 0x8f959e, metalness: 1, roughness: 0.38, envMapIntensity: 1,
  });

  // Uninstalled parts read as dull, unfinished metal.
  const damagedSteel = new THREE.MeshStandardMaterial({
    color: 0x475569, metalness: 0.6, roughness: 0.7, wireframe: partsCount === 0,
  });

  // ── Slot 1: Outer Ring ──
  const outerRing = new THREE.Mesh(createOuterRingGeometry(), partsCount >= 1 ? ringSteel : damagedSteel);
  outerRing.castShadow = true;
  outerRing.receiveShadow = true;
  bearingGroup.add(outerRing);

  // ── Slot 2: Inner Ring, with the NSK hub cap closing the bore ──
  const innerRing = new THREE.Mesh(createInnerRingGeometry(), partsCount >= 2 ? innerSteel : damagedSteel);
  innerRing.castShadow = true;
  innerRing.receiveShadow = true;
  bearingGroup.add(innerRing);

  if (partsCount >= 2) {
    const capR = d.innerBoreR * 1.02;
    const capT = 0.06;

    const capPlate = new THREE.Mesh(new THREE.CylinderGeometry(capR, capR, capT, 72), innerSteel);
    capPlate.rotation.x = Math.PI / 2;
    capPlate.castShadow = true;
    bearingGroup.add(capPlate);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(capR * 0.985, 0.016, 10, 64), cageSteel);
    for (const side of [1, -1]) {
      const r = rim.clone();
      r.position.z = (side * capT) / 2;
      bearingGroup.add(r);
    }

    // toneMapped:false holds exact NSK red; ACES otherwise pulls it to orange.
    const logoW = capR * 1.5;
    const logoMat = new THREE.MeshBasicMaterial({
      map: getNskLogoTexture(), alphaTest: 0.45, toneMapped: false,
    });
    const logoGeo = new THREE.PlaneGeometry(logoW, logoW * (341 / 1024));
    for (const side of [1, -1]) {
      const logo = new THREE.Mesh(logoGeo, logoMat);
      logo.position.z = side * (capT / 2 + 0.005);
      if (side === -1) logo.rotation.y = Math.PI; // readable from behind too
      bearingGroup.add(logo);
    }
  }

  // ── Slot 3: Chrome Balls ──
  if (partsCount >= 3) {
    const ballGeo = new THREE.SphereGeometry(d.ballR, 24, 18);
    for (const [x, y, z] of ballPositions()) {
      const ball = new THREE.Mesh(ballGeo, ballChrome);
      ball.position.set(x, y, z);
      ball.castShadow = true;
      bearingGroup.add(ball);
    }
  }

  // ── Slot 4: Retainer Cage (collars and bridges; rivets arrive at slot 8) ──
  if (partsCount >= 4) {
    const cage = new THREE.Mesh(createCageGeometry(), cageSteel);
    cage.castShadow = true;
    bearingGroup.add(cage);
  }

  const annulus = new THREE.RingGeometry(d.innerR + 0.02, d.outerBoreR - 0.02, 64);

  // ── Slot 5: Contact Seal (nitrile, front face) ──
  if (partsCount >= 5) {
    const seal = new THREE.Mesh(
      annulus,
      new THREE.MeshStandardMaterial({
        color: 0x1e293b, roughness: 0.85, metalness: 0.1,
        transparent: true, opacity: 0.55, side: THREE.DoubleSide,
      }),
    );
    seal.position.z = d.width / 2 + 0.004;
    bearingGroup.add(seal);
  }

  // ── Slot 6: Synthetic Grease (polyurea film packed into the raceway) ──
  if (partsCount >= 6) {
    const grease = new THREE.Mesh(
      new THREE.TorusGeometry(d.pitchR, d.ballR * 0.8, 10, 72),
      new THREE.MeshStandardMaterial({
        color: 0xd9b26a, roughness: 0.45, metalness: 0, transparent: true, opacity: 0.45,
      }),
    );
    bearingGroup.add(grease);
  }

  // ── Slot 7: Dust Shield (pressed steel, back face) ──
  if (partsCount >= 7) {
    const shield = new THREE.Mesh(
      annulus,
      new THREE.MeshStandardMaterial({
        color: 0xb8c2cf, metalness: 0.9, roughness: 0.3, envMapIntensity: 1.2,
        transparent: true, opacity: 0.6, side: THREE.DoubleSide,
      }),
    );
    shield.position.z = -d.width / 2 - 0.004;
    bearingGroup.add(shield);
  }

  // ── Slot 8: Retainer Rivets (join the cage bridges) ──
  if (partsCount >= 8) {
    const rivets = new THREE.Mesh(createCageRivetGeometry(), cageSteel);
    bearingGroup.add(rivets);
  }

  // ── Slot 9: Snap Ring (axial lock, seated on the outer ring) ──
  if (partsCount >= 9) {
    const snapRing = new THREE.Mesh(
      new THREE.TorusGeometry(d.outerR + 0.02, 0.028, 10, 80),
      ringSteel,
    );
    snapRing.position.z = d.width * 0.3;
    bearingGroup.add(snapRing);
  }

  // ── Slot 10: Bearing Housing (the cast collar the bearing presses into) ──
  if (partsCount >= 10) {
    const housing = new THREE.Mesh(
      new THREE.TorusGeometry(d.outerR + 0.15, 0.1, 14, 80),
      new THREE.MeshStandardMaterial({
        color: 0x55606e, metalness: 0.55, roughness: 0.62, envMapIntensity: 1.1,
      }),
    );
    bearingGroup.add(housing);
  }

  // ── Golden Master Precision Ring Aura (Installed if partsCount === 10) ──
  if (partsCount === 10) {
    const aura = new THREE.Mesh(
      new THREE.RingGeometry(d.outerR + 0.08, d.outerR + 0.16, 64),
      new THREE.MeshBasicMaterial({
        color: 0x10b981, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
      }),
    );
    bearingGroup.add(aura);
  }

  bearingGroup.scale.setScalar(SCALE);
  return bearingGroup;
}

export default function BearingModelViewer({
  correctCount = 10, // 0 to 10 answers
  className = '',
  style = {},
}) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);
  const correctCountRef = useRef(correctCount);

  useEffect(() => {
    correctCountRef.current = correctCount;
  }, [correctCount]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera with pleasant isometric framing (centered for full-height display)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 5.5);

    // 3. WebGL Renderer with High-Quality Tonemapping (Mobile Optimized)
    const renderer = new THREE.WebGLRenderer({
       antialias: true,
       alpha: true,
       powerPreference: 'high-performance',
       precision: 'mediump',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 4. Studio Environment for metal reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment(renderer);
    scene.environment = pmremGenerator.fromScene(roomEnv).texture;

    // 5. Lighting tuned for CAD technical white backdrop
    const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    mainKeyLight.position.set(6, 9, 7);
    mainKeyLight.castShadow = true;
    scene.add(mainKeyLight);

    const blueRimLight = new THREE.DirectionalLight(0x0284c7, 1.5);
    blueRimLight.position.set(-6, -2, -4);
    scene.add(blueRimLight);

    const redRimLight = new THREE.DirectionalLight(0xe11d48, 1.2);
    redRimLight.position.set(5, -4, -3);
    scene.add(redRimLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Soft Contact Shadow under bearing
    const shadowGeo = new THREE.PlaneGeometry(8, 8);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.28)');
    grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.10)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true });
    const groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.y = -3.2;
    scene.add(groundShadow);

    // 6. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 4.2;
    controls.maxDistance = 14.0;
    controlsRef.current = controls;

    // 7. Dynamic Assembled Bearing Model
    const bearing = createDynamicBearing(correctCount);
    // Attractive default engineering perspective tilt
    const defaultTiltX = 0.38;
    const defaultTiltY = -0.42;
    bearing.rotation.x = defaultTiltX;
    bearing.rotation.y = defaultTiltY;
    scene.add(bearing);

    // 8. Animation & Physics Simulation Loop (Speed & Wobble driven by correctCount)
    let lastTime = performance.now();
    const animate = (timestamp) => {
      animFrameRef.current = requestAnimationFrame(animate);

      const delta = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      const safeDelta = Math.min(delta, 0.05);

      const count = correctCountRef.current;
      const quality = Math.max(0, Math.min(10, count)) / 10; // 0.0 to 1.0

      // Dynamic rotation speed (from near zero/stutter up to 12,000 RPM feel)
      const baseSpeed = 0.003 + quality * 0.065;

      // Friction stutter for sub-standard assemblies (< 6 parts)
      let stutter = 1.0;
      if (quality === 0) {
        stutter = 0.05; // Jammed/stalled
      } else if (quality < 0.6) {
        // Irregular mechanical catch & slip
        stutter = 0.5 + 0.45 * Math.sin(timestamp * 0.012) + (Math.sin(timestamp * 0.035) * 0.2);
        stutter = Math.max(0.08, stutter);
      }

      bearing.rotation.z += baseSpeed * safeDelta * 60 * stutter;

      // Mild mechanical runout / wobble on X & Y axes
      // Perfect assembly (10/10) = 0 wobble. Sub-optimal = mild realistic wobble (max ~0.04 rad)
      const wobbleAmp = (1.0 - quality) * 0.038;
      const wobbleFreq = 3.5 + (1.0 - quality) * 2.0;
      bearing.rotation.x = defaultTiltX + Math.sin(timestamp * 0.003 * wobbleFreq) * wobbleAmp;
      bearing.rotation.y = defaultTiltY + Math.cos(timestamp * 0.0025 * wobbleFreq * 1.2) * wobbleAmp;

      controls.update();
      renderer.render(scene, camera);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 500;
      const newH = container.clientHeight || 500;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 10. Cleanup
    return () => {
      resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [correctCount]);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden ${className}`}
      style={{ touchAction: 'none', ...style }}
    />
  );
}
