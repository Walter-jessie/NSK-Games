// Builds the 60 m x 40 m NSK Global Technology Testing Arena from factoryLayout.json.
import * as THREE from 'three';
import { PALETTE as C, PartBuilder, canvasTexture, surfaceMaterial } from './toon.js';
import { createMachine } from './machines.js';
import { createCrateField } from './characters.js';
import { placeProps } from './props.js';
import { mergedFloorGlows, mergedHalos } from './fx.js';
import { mergeStatic } from './toon.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Blueprint uses z = north; in world space north is away from the camera (-Z).
export const toWorld = ([x, z]) => new THREE.Vector3(x, 0, -z);

// Deterministic noise so renders are identical every run.
function rng(seed) { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); }

function floorMaterial() {
  const rand = rng(7);
  const map = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#3d4148';
    ctx.fillRect(0, 0, w, h);
    // concrete speckle
    for (let i = 0; i < 9000; i++) {
      const v = 40 + rand() * 50;
      ctx.fillStyle = `rgba(${v},${v + 3},${v + 8},${0.25 + rand() * 0.3})`;
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
    }
    // oil stains
    for (let i = 0; i < 5; i++) {
      const x = rand() * w, y = rand() * h, r = 20 + rand() * 60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(15,14,12,0.35)'); g.addColorStop(1, 'rgba(15,14,12,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // cracks
    ctx.strokeStyle = 'rgba(18,18,20,0.55)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      let x = rand() * w, y = rand() * h; ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (rand() - 0.5) * 60; y += (rand() - 0.5) * 60; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // slab joints
    ctx.strokeStyle = '#25282d'; ctx.lineWidth = 5; ctx.strokeRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.strokeRect(4, 4, w - 8, h - 8);
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(16, 11);
  map.anisotropy = 4;
  return surfaceMaterial({ map, roughness: 0.88, metalness: 0.05 });
}

function wallMaterial(height) {
  const rand = rng(11);
  const map = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#2a2f37';
    ctx.fillRect(0, 0, w, h);
    for (const [x, pw] of [[10, w / 2 - 15], [w / 2 + 5, w / 2 - 15]]) {
      ctx.fillStyle = '#333944';
      ctx.fillRect(x, 12, pw, h * 0.62);
      ctx.strokeStyle = '#1a1d23'; ctx.lineWidth = 4; ctx.strokeRect(x, 12, pw, h * 0.62);
    }
    // grime streaks
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(10,10,12,${0.05 + rand() * 0.12})`;
      ctx.fillRect(rand() * w, rand() * h * 0.5, 2 + rand() * 6, 40 + rand() * 160);
    }
    // rust
    for (let i = 0; i < 12; i++) {
      const x = rand() * w, y = rand() * h * 0.8, r = 6 + rand() * 22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(140,70,30,0.35)'); g.addColorStop(1, 'rgba(140,70,30,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // orange accent band
    ctx.fillStyle = '#c4581d';
    ctx.fillRect(0, h * 0.68, w, h * 0.05);
    ctx.fillStyle = '#1b1e24';
    ctx.fillRect(0, h * 0.73, w, h * 0.11);
    // worn hazard skirting
    ctx.fillStyle = '#b8861c';
    ctx.fillRect(0, h * 0.84, w, h * 0.16);
    ctx.fillStyle = '#16171b';
    for (let i = -h; i < w + h; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, h * 0.84); ctx.lineTo(i + 32, h * 0.84); ctx.lineTo(i + 32 - 82, h); ctx.lineTo(i - 82, h);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 60; i++) ctx.fillRect(rand() * w, h * 0.84 + rand() * h * 0.16, 3 + rand() * 10, 2 + rand() * 4);
  });
  map.wrapS = THREE.RepeatWrapping;
  return { map, height };
}

function buildWall(length, height, material) {
  const geo = new THREE.BoxGeometry(length, height, 0.6);
  const mat = surfaceMaterial({ map: material.map.clone(), roughness: 0.7, metalness: 0.35 });
  mat.map.needsUpdate = true;
  mat.map.repeat.set(length / (height * 0.9), 1);
  return new THREE.Mesh(geo, mat);
}

function banner(text, sub) {
  const map = canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = C.white;
    ctx.beginPath(); ctx.roundRect(0, 0, w, h, 30); ctx.fill();
    ctx.fillStyle = '#122a52';
    ctx.beginPath(); ctx.roundRect(10, 10, w - 20, h - 20, 24); ctx.fill();
    ctx.fillStyle = C.nskRed;
    ctx.beginPath(); ctx.roundRect(30, 40, 260, h - 80, 16); ctx.fill();
    ctx.fillStyle = C.white;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '900 110px "Arial Black", Arial, sans-serif';
    ctx.fillText('NSK', 160, h / 2 + 4);
    ctx.textAlign = 'left';
    const fit = (str, weight, size, maxW) => {
      do { ctx.font = `${weight} ${size}px "Arial Black", Arial, sans-serif`; size -= 2; } while (ctx.measureText(str).width > maxW && size > 12);
    };
    fit(text, 900, 72, w - 360);
    ctx.fillText(text, 320, h / 2 - 30);
    ctx.fillStyle = '#ffd34a';
    fit(sub, 800, 38, w - 360);
    ctx.fillText(sub, 324, h / 2 + 50);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(11, 2.75), new THREE.MeshBasicMaterial({ map, color: '#b9bcc4' }));
}

function spawnPad() {
  const map = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(16,48,98,0.85)';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c9cfda'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 28, 0, 7); ctx.stroke();
    ctx.setLineDash([28, 18]); ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 60, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.nskRed;
    ctx.beginPath(); ctx.roundRect(116, 196, 280, 120, 18); ctx.fill();
    ctx.fillStyle = C.white;
    ctx.font = '900 96px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NSK', w / 2, h / 2 + 4);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), surfaceMaterial({ map, transparent: true, depthWrite: false, roughness: 0.8 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  m.receiveShadow = true;
  return m;
}

let blobTex;
export function blobShadow(radius, opacity = 0.35) {
  if (!blobTex) {
    blobTex = canvasTexture(64, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(20,16,40,1)');
      g.addColorStop(1, 'rgba(20,16,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.015;
  m.name = 'blobShadow';
  return m;
}

export function createArena(layout) {
  const group = new THREE.Group();
  group.name = 'plantArena';
  const { width: W, depth: D } = layout.arena;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 4, D + 4), floorMaterial());
  floor.receiveShadow = true;
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // Floor markings: roaming highways, lane arrows and machine bays.
  const decals = new PartBuilder('floorMarkings');
  // Three heights, so the layers stack instead of fighting for the same pixels:
  // road markings, then the machine bay plate over them, then the bay outline.
  const flat = (w, d, color, x, z) => decals.box(w, 0.01, d, color, { p: [x, 0.012, z] });
  const bayPlate = (w, d, color, x, z) => decals.box(w, 0.01, d, color, { p: [x, 0.018, z] });
  const bayLine = (w, d, color, x, z) => decals.box(w, 0.01, d, color, { p: [x, 0.024, z] });

  // A bay is the footprint a machine owns. Road paint stops here.
  // Sized just over the bench itself (2.3 x 1.8 half-extents) rather than the
  // old oversized outline, which pushed into the central highway.
  const BAY_HW = 2.8;
  const BAY_HD = 2.1;
  const bays = layout.machines.map((m) => toWorld(m.pos));
  const inBay = (x, z, pad = 0) =>
    bays.some((b) => Math.abs(x - b.x) <= BAY_HW + pad && Math.abs(z - b.z) <= BAY_HD + pad);

  // Carriageways, drawn as runs that break at every bay they would cross.
  const runs = (from, to, blocked) => {
    const out = [];
    const STEP = 0.5;
    let start = null;
    for (let v = from; v <= to + 1e-6; v += STEP) {
      if (blocked(v)) {
        if (start !== null && v - STEP - start > 1.2) out.push([start, v - STEP]);
        start = null;
      } else if (start === null) {
        start = v;
      }
    }
    if (start !== null && to - start > 1.2) out.push([start, to]);
    return out;
  };

  const band = (lo, hi, thickness, color, axis, offset) => {
    const len = hi - lo;
    const mid = (lo + hi) / 2;
    if (axis === 'x') flat(len, thickness, color, mid, offset);
    else flat(thickness, len, color, offset, mid);
  };

  // East-west highway and its edge lines, broken around the bays.
  for (const [lo, hi] of runs(-(W / 2 - 1), W / 2 - 1, (x) => inBay(x, 0, 0.2))) {
    band(lo, hi, 4.2, '#2c3037', 'x', 0);
    for (const s of [-1, 1]) band(lo, hi, 0.2, '#b8861c', 'x', s * 2.2);
  }
  // North-south spine and its edge lines. This is the one that used to run
  // straight through the machines standing at x = 0.
  for (const [lo, hi] of runs(-(D / 2 - 1), D / 2 - 1, (z) => inBay(0, z, 0.2))) {
    band(lo, hi, 4.2, '#2c3037', 'z', 0);
    for (const s of [-1, 1]) band(lo, hi, 0.2, '#b8861c', 'z', s * 2.2);
  }

  // Centre dashes, skipped wherever a bay owns the floor.
  for (let x = -27; x <= 27; x += 3) if (Math.abs(x) > 3 && !inBay(x, 0, 0.4)) flat(1.4, 0.18, '#8f8668', x, 0);
  for (let z = -17; z <= 17; z += 3) if (Math.abs(z) > 3 && !inBay(0, z, 0.4)) flat(0.18, 1.4, '#8f8668', 0, z);

  // Perimeter lines hug the walls, clear of everything.
  for (const s of [-1, 1]) {
    flat(W - 2, 0.25, '#b8861c', 0, s * (D / 2 - 1.2));
    flat(0.25, D - 2, '#b8861c', s * (W / 2 - 1.2), 0);
  }

  for (const b of bays) {
    // Solid plate first, so no road paint shows through under a machine.
    bayPlate(BAY_HW * 2, BAY_HD * 2, '#1b1f26', b.x, b.z);
    bayLine(BAY_HW * 2, 0.2, '#d06a22', b.x, b.z - BAY_HD);
    bayLine(BAY_HW * 2, 0.2, '#d06a22', b.x, b.z + BAY_HD);
    bayLine(0.2, BAY_HD * 2, '#d06a22', b.x - BAY_HW, b.z);
    bayLine(0.2, BAY_HD * 2, '#d06a22', b.x + BAY_HW, b.z);
  }
  group.add(decals.build({ outline: 0 }));
  group.add(spawnPad());

  // Walls: tall on the far (north) side and flanks, low rail on the camera side.
  const tall = 5.5;
  const wm = wallMaterial(tall);
  const north = buildWall(W + 1.2, tall, wm);
  north.position.set(0, tall / 2, -D / 2 - 0.3);
  const west = buildWall(D, tall, wm);
  west.rotation.y = Math.PI / 2;
  west.position.set(-W / 2 - 0.3, tall / 2, 0);
  const east = west.clone();
  east.position.x = W / 2 + 0.3;
  for (const w of [north, west, east]) w.receiveShadow = true;
  group.add(north, west, east);

  const trim = new PartBuilder('wallTrim');
  // low south rail
  trim.box(W + 1.2, 0.5, 0.4, C.gunmetal, { p: [0, 0.25, D / 2 + 0.3] });
  trim.box(W + 1.2, 0.12, 0.5, '#b8861c', { p: [0, 0.56, D / 2 + 0.3] });
  for (let x = -W / 2; x <= W / 2; x += 4) trim.box(0.12, 1.1, 0.12, C.steel, { p: [x, 0.55, D / 2 + 0.3] });
  trim.box(W + 1.2, 0.1, 0.1, C.steel, { p: [0, 1.1, D / 2 + 0.3] });
  // pipes along north wall
  for (const [y, col, r] of [[4.55, '#8a2a22', 0.2], [5.1, '#6d7480', 0.15]]) {
    trim.cyl(r, r, W, col, { p: [0, y, -D / 2 + 0.25], r: [0, 0, Math.PI / 2] }, 8);
    for (let x = -W / 2 + 3; x < W / 2; x += 6) trim.box(0.18, r * 2.6, r * 2.6, C.gunmetal, { p: [x, y, -D / 2 + 0.25] });
  }
  for (const side of [-1, 1]) {
    trim.cyl(0.18, 0.18, D, C.steel, { p: [side * (W / 2 - 0.05), 4.6, 0], r: [Math.PI / 2, 0, 0] }, 8);
  }
  // corner pillars
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) {
    trim.box(1.4, z < 0 ? tall + 0.6 : 1.4, 1.4, C.gunmetal, { p: [x, z < 0 ? (tall + 0.6) / 2 : 0.7, z] });
    trim.box(1.5, 0.3, 1.5, '#b8861c', { p: [x, z < 0 ? tall + 0.6 : 1.4, z] });
  }
  // blast doors (blueprint's orange gates)
  const door = (x, z, rotY) => {
    const d = new PartBuilder('door');
    d.box(6.4, 4.4, 0.4, C.gunmetal, { p: [0, 2.2, 0] });
    d.box(5.6, 3.8, 0.45, '#c46a1c', { p: [0, 1.9, 0] });
    for (let i = -2; i <= 2; i++) d.box(0.5, 3.8, 0.47, '#1c1d22', { p: [i * 1.1, 1.9, 0], r: [0, 0, 0.6] });
    d.box(0.12, 3.8, 0.5, C.ink, { p: [0, 1.9, 0] });
    d.box(1.2, 0.35, 0.5, '#ff2a3a', { p: [0, 4.15, 0.05], glow: true });
    const g = d.build({ outline: 2.6 });
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    return g;
  };
  group.add(door(0, -D / 2 + 0.05, 0), door(-W / 2 + 0.05, 0, Math.PI / 2), door(W / 2 - 0.05, 0, -Math.PI / 2));
  // wall lamps
  const lampGlows = [];
  for (let x = -W / 2 + 5; x < W / 2; x += 10) {
    if (Math.abs(x) < 4 || Math.abs(Math.abs(x) - 14) < 6.5) continue;
    trim.box(1.2, 0.3, 0.3, '#ffd59a', { p: [x, 2.9, -D / 2 + 0.2], glow: true });
    trim.box(1.4, 0.45, 0.2, C.ink, { p: [x, 2.9, -D / 2 + 0.05] });
    lampGlows.push([x, -D / 2 + 0.6]);
  }
  for (let z = -D / 2 + 5; z < D / 2; z += 10) {
    if (Math.abs(z) < 4) continue;
    for (const side of [-1, 1]) {
      trim.box(0.3, 0.3, 1.2, '#ffd59a', { p: [side * (W / 2 - 0.1), 2.9, z], glow: true });
      lampGlows.push([side * (W / 2 - 0.6), z]);
    }
  }
  group.add(trim.build({ outline: 2.6 }));
  const glows = lampGlows.map(([x, z]) => ({ x, z, radius: 3.4, color: '#ff9a3c', opacity: 0.4 }));
  for (const x of [-22, -7, 7, 22]) for (const z of [-8, 8]) glows.push({ x, z, radius: 6.5, color: '#ffcf8a', opacity: 0.16, y: 0.025 });
  group.add(mergedFloorGlows(glows));
  group.add(mergedHalos(lampGlows.map(([x, z]) => [x, 2.9, z + (z < -D / 2 + 1 ? 0.3 : 0)]), 2.4, '#ffb060', 0.5));
  const propColliders = placeProps(group, W, D);

  const b1 = banner('GLOBAL TECH ARENA', 'PRECISION BEARINGS · 10 REAL-WORLD APPLICATIONS');
  b1.position.set(-14, 2.95, -D / 2 + 0.02);
  const b2 = banner('PLANT ARENA REPAIR', 'KEEP EVERY MACHINE SPINNING!');
  b2.position.set(14, 2.95, -D / 2 + 0.02);
  group.add(b1, b2);

  // Machines
  const machines = new Map();
  for (const m of layout.machines) {
    const machine = createMachine(m.code);
    machine.group.position.copy(toWorld(m.pos));
    const shadow = blobShadow(3.4, 0.3);
    machine.group.add(shadow);
    group.add(machine.group);
    machines.set(m.code, machine);
  }

  const crates = createCrateField(
    layout.decoyCrates.map(([x, z], i) => [x, -z, (i * 0.37) % 0.6 - 0.3]),
    layout.nskCrates.map(([x, z], i) => [x, -z, (i * 0.53) % 0.5 - 0.25]),
  );
  group.add(crates.group);

  mergeStatic(group);

  return {
    group,
    machines,
    crates,
    propColliders,
    update(dt, t) { for (const m of machines.values()) m.update(dt, t); },
  };
}

// Moody plant lighting: dark cool ambient, one warm key light (with a shadow
// map only on the high tier), lamp pools faked with floor decals, and a small
// pool of red point lights handed to whichever machines are under attack.
export function addArenaLights(scene, renderer, tier) {
  scene.background = new THREE.Color('#090b10');
  scene.fog = new THREE.Fog('#090b10', 38, 90);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if (tier.envReflections) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.22;
  }
  scene.add(new THREE.HemisphereLight('#5d6e8c', '#1c140e', tier.envReflections ? 0.9 : 1.3));
  const sun = new THREE.DirectionalLight('#ffd9ac', tier.envReflections ? 2.4 : 2.7);
  sun.position.set(-14, 26, 12);
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight('#6f8fd6', 0.6);
  rim.position.set(18, 14, -20);
  scene.add(rim);
  if (tier.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    sun.castShadow = true;
    sun.shadow.mapSize.set(tier.shadowMapSize, tier.shadowMapSize);
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.04;
    const c = sun.shadow.camera;
    c.left = -18; c.right = 18; c.top = 14; c.bottom = -14; c.near = 1; c.far = 70;
  }
  const alarmLights = [];
  for (let i = 0; i < tier.statusLights; i++) {
    const l = new THREE.PointLight('#ff3a22', 0, 13, 1.4);
    scene.add(l);
    alarmLights.push(l);
  }
  return {
    sun,
    // Shadow frustum follows the camera focus so a 1024 map stays sharp.
    follow(focus, wide = false) {
      sun.position.set(focus.x - 14, 26, focus.z + 12);
      sun.target.position.copy(focus);
      if (tier.shadows) {
        const c = sun.shadow.camera;
        const s = wide ? 2.2 : 1;
        c.left = -18 * s; c.right = 18 * s; c.top = 14 * s; c.bottom = -14 * s;
        c.updateProjectionMatrix();
      }
    },
    update(t, machines) {
      let i = 0;
      for (const m of machines.values()) {
        if (m.status !== 'attacked' || i >= alarmLights.length) continue;
        const l = alarmLights.at(i++);
        l.position.copy(m.group.position).add(new THREE.Vector3(0, 4.2, 2.6));
        l.intensity = 55 + Math.sin(t * 8) * 20;
      }
      for (; i < alarmLights.length; i++) alarmLights.at(i).intensity = 0;
    },
  };
}
