import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  DIMENSIONS,
  ballPositions,
  createCageGeometry,
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

  // 1. Static Inner Group: Inner ring, cap plate, rim, and NSK logo (stays static, does NOT rotate)
  const staticInnerGroup = new THREE.Group();
  staticInnerGroup.name = 'StaticInnerAssembly';
  bearingGroup.add(staticInnerGroup);

  // 2. Rotating Outer Group: Balls, outer ring, retainer cage, and aura (rotates with RPM)
  const rotatingOuterGroup = new THREE.Group();
  rotatingOuterGroup.name = 'RotatingOuterAssembly';
  bearingGroup.add(rotatingOuterGroup);

  bearingGroup.userData.staticInnerGroup = staticInnerGroup;
  bearingGroup.userData.rotatingOuterGroup = rotatingOuterGroup;

  const d = DIMENSIONS;
  const SCALE = 2.0;

  // ── Materials: Lighter, brighter metallic tones to eliminate dark shadowing ──
  const ringSteel = new THREE.MeshPhysicalMaterial({
    color: 0xdde4ed, metalness: 0.96, roughness: 0.16, envMapIntensity: 1.35,
  });
  const innerSteel = new THREE.MeshPhysicalMaterial({
    color: 0xd4dbe5, metalness: 0.96, roughness: 0.14, envMapIntensity: 1.35,
  });
  const ballChrome = new THREE.MeshPhysicalMaterial({
    color: 0xf6f8fc, metalness: 0.98, roughness: 0.05, envMapIntensity: 1.6,
  });
  const cageSteel = new THREE.MeshPhysicalMaterial({
    color: 0xa8b0bd, metalness: 0.92, roughness: 0.28, envMapIntensity: 1.15,
  });

  // ── Slot 1: Inner Casing + Hub Cap + NSK Logo (STATIC - never rotates) ──
  if (partsCount >= 1) {
    const innerRing = new THREE.Mesh(createInnerRingGeometry(), innerSteel);
    innerRing.castShadow = true;
    innerRing.receiveShadow = true;
    staticInnerGroup.add(innerRing);

    const capR = d.innerBoreR * 1.02;
    const capT = 0.06;

    const capPlate = new THREE.Mesh(new THREE.CylinderGeometry(capR, capR, capT, 72), innerSteel);
    capPlate.rotation.x = Math.PI / 2;
    capPlate.castShadow = true;
    staticInnerGroup.add(capPlate);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(capR * 0.985, 0.016, 10, 64), cageSteel);
    for (const side of [1, -1]) {
      const r = rim.clone();
      r.position.z = (side * capT) / 2;
      staticInnerGroup.add(r);
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
      staticInnerGroup.add(logo);
    }
  }

  // ── Slot 2: Bearing Balls (ROTATING) ──
  if (partsCount >= 2) {
    const ballGeo = new THREE.SphereGeometry(d.ballR, 24, 18);
    for (const [x, y, z] of ballPositions()) {
      const ball = new THREE.Mesh(ballGeo, ballChrome);
      ball.position.set(x, y, z);
      ball.castShadow = true;
      rotatingOuterGroup.add(ball);
    }
  }

  // ── Slot 3: Outer Casing (ROTATING) ──
  if (partsCount >= 3) {
    const outerRing = new THREE.Mesh(createOuterRingGeometry(), ringSteel);
    outerRing.castShadow = true;
    outerRing.receiveShadow = true;
    rotatingOuterGroup.add(outerRing);
  }

  // ── Slot 4: Retainer Cage (ROTATING) ──
  if (partsCount >= 4) {
    const cage = new THREE.Mesh(createCageGeometry(), cageSteel);
    cage.castShadow = true;
    rotatingOuterGroup.add(cage);
  }

  // ── Golden Master Precision Ring Aura (ROTATING) ──
  if (partsCount === 10) {
    const aura = new THREE.Mesh(
      new THREE.RingGeometry(d.outerR + 0.08, d.outerR + 0.16, 64),
      new THREE.MeshBasicMaterial({
        color: 0x10b981, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
      }),
    );
    rotatingOuterGroup.add(aura);
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 4. Studio Environment for metal reflections (Lifting black areas for brilliant reflections)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment(renderer);

    // Brighten the room's dark walls, floor, and boxes to eliminate black reflection spots
    roomEnv.traverse((child) => {
      if (child.isMesh && child.material) {
        if (child.material.color) {
          child.material.color.setHex(0xd6deea); // Soft bright studio gray-white
        }
        child.material.roughness = 0.3;
      }
    });

    // Add ambient fill light to roomEnv so unlit angles receive soft bounce light
    const envAmbient = new THREE.AmbientLight(0xffffff, 6.0);
    roomEnv.add(envAmbient);

    // Add bright softbox light panels in roomEnv top, bottom, and sides
    const envTop = new THREE.DirectionalLight(0xffffff, 8.0);
    envTop.position.set(0, 15, 0);
    roomEnv.add(envTop);

    const envBottom = new THREE.DirectionalLight(0xe8f0fe, 5.0);
    envBottom.position.set(0, -10, 0);
    roomEnv.add(envBottom);

    const envSide = new THREE.DirectionalLight(0xffffff, 4.0);
    envSide.position.set(10, 0, 10);
    roomEnv.add(envSide);

    scene.environment = pmremGenerator.fromScene(roomEnv).texture;

    // 5. Lighting tuned for CAD technical white backdrop
    const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    mainKeyLight.position.set(6, 9, 7);
    mainKeyLight.castShadow = true;
    scene.add(mainKeyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.8);
    fillLight.position.set(-6, -4, 4);
    scene.add(fillLight);

    const topFill = new THREE.DirectionalLight(0xffffff, 1.4);
    topFill.position.set(0, 8, -4);
    scene.add(topFill);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
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

      // ── Outer Ring, Balls, and Retainer Cage spin with RPM ──
      // ── Inner Casing and NSK Hub Cap remain completely static ──
      if (bearing.userData.rotatingOuterGroup) {
        bearing.userData.rotatingOuterGroup.rotation.z += baseSpeed * safeDelta * 60 * stutter;
      }

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
