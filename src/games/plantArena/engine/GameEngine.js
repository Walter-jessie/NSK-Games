// Three.js side of Plant Arena Repair: builds the arena, reads the game store
// every frame and makes the world match it (player, drones, crates, machine
// states, effects, camera). It never changes game rules itself.
import * as THREE from 'three';
import { createArena, addArenaLights, blobShadow } from '../scene/arena.js';
import { MACHINE_FX } from '../scene/machines.js';
import { createWorker, createDrone, createBearingPickup } from '../scene/characters.js';
import { outlineResolution } from '../scene/toon.js';
import { createPop, radialTexture } from '../scene/fx.js';
import { guessTier, createFpsGuard, TIERS } from '../scene/quality.js';
import { createArenaGame } from './arenaGameStore.js';

const STATUS_TO_SCENE = { ok: 'ok', incoming: 'ok', attacked: 'attacked', failed: 'failed', saved: 'saved' };

function splinterBurst(scene) {
  // Pooled debris burst for smashed crates (one Points object, reused).
  // Per-vertex colour lets one cloud throw pale wood chips for an empty crate
  // and chips plus hot sparks for one that held a bearing.
  const N = 110;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const spin = new Float32Array(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.26,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.visible = false;
  scene.add(pts);

  // Flash at the moment of impact, brighter for a crate that pays out.
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({
      map: radialTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  flash.rotation.x = -Math.PI / 2;
  flash.position.y = 0.06;
  flash.visible = false;
  scene.add(flash);

  let life = 0;
  let flashLife = 0;
  const WOOD = [0.79, 0.51, 0.18];
  const PALE = [0.62, 0.55, 0.44];
  const SPARK = [1.0, 0.72, 0.26];

  return {
    fire(x, z, nsk = true) {
      for (let i = 0; i < N; i++) {
        pos.set([x + (Math.random() - 0.5) * 0.3, 0.55 + Math.random() * 0.5, z + (Math.random() - 0.5) * 0.3], i * 3);
        const a = Math.random() * Math.PI * 2;
        const s = 2.4 + Math.random() * 6.2;
        vel.set([Math.cos(a) * s, 3.4 + Math.random() * 6, Math.sin(a) * s], i * 3);
        spin[i] = 0.6 + Math.random() * 0.8;

        // A third of the debris is spark-coloured when the crate held a bearing.
        const c = nsk && i % 3 === 0 ? SPARK : nsk ? WOOD : PALE;
        col.set(c, i * 3);
      }
      geo.attributes.color.needsUpdate = true;
      life = 1.25;
      pts.visible = true;

      flash.position.set(x, 0.06, z);
      flash.material.color.setRGB(...(nsk ? [1, 0.78, 0.36] : [0.7, 0.66, 0.6]));
      flash.scale.setScalar(nsk ? 1 : 0.6);
      flashLife = nsk ? 0.3 : 0.18;
      flash.visible = true;
    },
    update(dt) {
      if (flashLife > 0) {
        flashLife -= dt;
        flash.material.opacity = Math.max(0, flashLife * 3);
        flash.scale.multiplyScalar(1 + dt * 5);
        if (flashLife <= 0) flash.visible = false;
      }
      if (life <= 0) return;
      life -= dt;
      for (let i = 0; i < N; i++) {
        vel[i * 3 + 1] -= 15 * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] = Math.max(0.05, pos[i * 3 + 1] + vel[i * 3 + 1] * dt);
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        // Drag, so chips settle instead of sliding away forever.
        vel[i * 3] *= 1 - 1.6 * dt * spin[i];
        vel[i * 3 + 2] *= 1 - 1.6 * dt * spin[i];
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = Math.min(1, life * 1.6);
      if (life <= 0) pts.visible = false;
    },
  };
}

function repairRing(scene) {
  // Expanding green shock ring on a successful repair.
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.2, 40),
    new THREE.MeshBasicMaterial({ color: '#46f08a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  scene.add(mesh);
  let life = 0;
  return {
    fire(x, z) { mesh.position.set(x, 0.4, z); life = 0.7; mesh.visible = true; },
    update(dt) {
      if (life <= 0) return;
      life -= dt;
      const k = 1 - life / 0.7;
      mesh.scale.setScalar(1 + k * 4);
      mesh.material.opacity = 1 - k;
      if (life <= 0) mesh.visible = false;
    },
  };
}

function smokeColumn(scene, x, z) {
  // Dark smoke rising from a failed machine.
  const N = 14;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const phase = new Float32Array(N);
  for (let i = 0; i < N; i++) phase[i] = i / N;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: radialTexture(), color: '#2b2b30', size: 2.2, transparent: true, opacity: 0.7, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  return (dt) => {
    for (let i = 0; i < N; i++) {
      phase[i] = (phase[i] + dt * 0.35) % 1;
      const p = phase[i];
      pos.set([x + Math.sin(i * 7.1 + p * 3) * 0.6 * p, 1.2 + p * 6, z + Math.cos(i * 3.3) * 0.5 * p], i * 3);
    }
    geo.attributes.position.needsUpdate = true;
  };
}

export class GameEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} layout factoryLayout.json
   * @param {{ seed?: number, quality?: 'low'|'high', onEvent?: (e) => void }} options
   */
  constructor(canvas, layout, options = {}) {
    this.canvas = canvas;
    this.layout = layout;
    this.onEvent = options.onEvent ?? (() => {});
    this.input = { x: 0, z: 0 };
    this.keys = new Set();
    this.markersLayer = null;
    this.running = false;
    this.disposed = false;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer = renderer;
    this.tier = options.quality ? TIERS[options.quality] : guessTier(renderer);
    MACHINE_FX.sparks = this.tier.sparks;
    MACHINE_FX.arcs = this.tier.arcs;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    this.scene = scene;
    this.lights = addArenaLights(scene, renderer, this.tier);
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.5, 140);

    this.arena = createArena(layout);
    scene.add(this.arena.group);
    this.game = createArenaGame(layout, { seed: options.seed ?? Date.now(), extraColliders: this.arena.propColliders });

    this.worker = createWorker();
    this.worker.group.scale.setScalar(1.3);
    this.worker.group.add(blobShadow(0.7));
    scene.add(this.worker.group);

    this.dronePool = [];
    this.droneById = new Map();
    this.pickupById = new Map();
    this.pickupPool = [];
    this.smoke = new Map();
    this.splinters = splinterBurst(scene);
    this.repairFx = repairRing(scene);
    // Landing and collecting a bearing both had no feedback at all.
    this.landFx = createPop(scene, { color: '#ffd27a', grains: 22 });
    this.collectFx = createPop(scene, { color: '#46f08a', grains: 30 });

    this.fpsGuard = createFpsGuard(() => this.downgrade());
    this.camFocus = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.clockTime = 0;

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.onKey = this.onKey.bind(this);
    this.onVisibility = this.onVisibility.bind(this);
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
    this.snapCamera();
    this.game.subscribe((e) => this.handleEvent(e));
    this.last = performance.now();
    this.running = true;
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ---------------- public API ---------------- */
  start() { this.game.start(); }
  act() { return this.game.act(); }
  setJoystick(x, z) { this.input.joyX = x; this.input.joyZ = z; }
  snapshot() { return this.game.snapshot(); }
  setMarkersLayer(el) { this.markersLayer = el; this.markers = new Map(); }

  dispose() {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.scene.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) { m.map?.dispose?.(); m.dispose?.(); }
    });
    this.renderer.dispose();
  }

  /* ---------------- internals ---------------- */
  onKey(e) {
    const down = e.type === 'keydown';
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      if (down) this.keys.add(k); else this.keys.delete(k);
      e.preventDefault?.();
    }
    if (down && (k === ' ' || k === 'e' || k === 'enter') && !e.repeat) this.act();
  }

  onVisibility() {
    if (document.hidden) { this.running = false; cancelAnimationFrame(this.raf); }
    else if (!this.disposed && !this.running) { this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.loop); }
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.tier.pixelRatio));
    this.renderer.setSize(w, h, false);
    this.renderer.getDrawingBufferSize(outlineResolution);
    this.camera.aspect = w / h;
    // Narrow screens see a bit further so the player keeps the same view width.
    this.camera.fov = this.camera.aspect < 1.6 ? 44 : 38;
    this.camera.updateProjectionMatrix();
  }

  downgrade() {
    if (this.tier.name === 'low') return;
    this.tier = TIERS.low;
    this.renderer.shadowMap.enabled = false;
    this.lights.sun.castShadow = false;
    this.scene.environment = null;
    const pointLights = [];
    this.scene.traverse((o) => {
      if (o.isPointLight) pointLights.push(o);
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; });
    });
    // Removed after the walk: removing children while traversing skips or breaks nodes.
    for (const l of pointLights) l.removeFromParent();
    this.resize();
    this.onEvent({ type: 'qualityChanged', tier: 'low' });
  }

  readInput() {
    let x = this.input.joyX ?? 0;
    let z = this.input.joyZ ?? 0;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) z -= 1;
    if (k.has('s') || k.has('arrowdown')) z += 1;
    if (this.autopilot) ({ x, z } = this.autopilot(this.game.state));
    return { x, z };
  }

  handleEvent(e) {
    if (e.type === 'bearingLanded') {
      this.landFx.fire(e.x, e.z, { scale: 0.8, seconds: 0.45 });
    } else if (e.type === 'bearingCollected') {
      this.collectFx.fire(e.x, e.z, { scale: 1.15, seconds: 0.5 });
    } else if (e.type === 'crateSmashed') {
      this.arena.crates.smash(e.index, e.nsk);
      this.splinters.fire(e.x, e.z, e.nsk);
    } else if (e.type === 'machineRepaired') {
      const m = this.arena.machines.get(e.machine);
      this.repairFx.fire(m.group.position.x, m.group.position.z);
    } else if (e.type === 'machineFailed') {
      const m = this.game.state.machines.find((x) => x.code === e.machine);
      this.smoke.set(e.machine, smokeColumn(this.scene, m.x, m.z));
    }
    this.onEvent(e);
  }

  snapCamera() {
    const p = this.game.state.player;
    this.camFocus.set(p.x, 0, p.z);
    this.placeCamera();
  }

  placeCamera() {
    const f = this.camFocus;
    this.camera.position.set(f.x, 23, f.z + 17.5);
    this.camLook.set(f.x, 0, f.z - 1.2);
    this.camera.lookAt(this.camLook);
    this.lights.follow(f);
  }

  syncDrones() {
    const live = new Set();
    for (const d of this.game.state.drones) {
      live.add(d.id);
      let v = this.droneById.get(d.id);
      if (!v) {
        v = this.dronePool.pop() ?? (() => {
          const nd = createDrone();
          const sh = blobShadow(1.1, 0.3);
          this.scene.add(nd.group, sh);
          nd.shadow = sh;
          return nd;
        })();
        v.group.visible = v.shadow.visible = true;
        v.group.position.set(d.x, d.y, d.z);
        this.droneById.set(d.id, v);
      }
      const g = v.group;
      const dx = d.x - g.position.x, dz = d.z - g.position.z;
      if (Math.hypot(dx, dz) > 0.01) g.rotation.y = Math.atan2(dx, dz);
      g.position.set(d.x, d.mode === 'attacking' ? 4.6 : d.y, d.z);
      v.beam.visible = d.mode === 'attacking';
      v.shadow.position.set(d.x, 0, d.z);
    }
    for (const [id, v] of this.droneById) {
      if (live.has(id)) continue;
      v.group.visible = v.shadow.visible = false;
      this.dronePool.push(v);
      this.droneById.delete(id);
    }
  }

  syncPickups() {
    for (const pk of this.game.state.pickups) {
      let v = this.pickupById.get(pk.id);
      if (!v && !pk.collected) {
        v = this.pickupPool.pop() ?? (() => { const b = createBearingPickup(); this.scene.add(b.group); return b; })();
        v.group.visible = true;
        v.group.position.set(pk.x, 0.9, pk.z);
        this.pickupById.set(pk.id, v);
      }
      if (v && pk.collected) {
        v.group.visible = false;
        this.pickupPool.push(v);
        this.pickupById.delete(pk.id);
      }
    }
  }

  updateMarkers() {
    if (!this.markersLayer) return;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const seen = new Set();
    const playing = this.game.state.phase === 'playing';
    // Keep markers clear of the HUD: top bar, and the mini-map in the top-right corner.
    const barH = Math.min(54, Math.max(32, h * 0.075));
    const mapW = Math.min(w * 0.17, h * 0.3), mapBottom = barH + 8 + mapW / 1.5 + 40;
    const left = 36, right = w - 36, top = barH + 76, bottom = h - 16;
    for (const m of this.game.state.machines) {
      if (!playing || m.status !== 'attacked') continue;
      seen.add(m.code);
      let el = this.markers.get(m.code);
      if (!el) {
        el = document.createElement('div');
        el.className = 'pa-marker';
        el.innerHTML = '<div class="pa-marker-pill">REPAIR</div><div class="pa-marker-ring"><span></span><i class="pa-marker-arrow"></i></div>';
        this.markersLayer.appendChild(el);
        this.markers.set(m.code, el);
      }
      this.tmp.set(m.x, 3.6, m.z).project(this.camera);
      let sx = (this.tmp.x * 0.5 + 0.5) * w;
      let sy = (-this.tmp.y * 0.5 + 0.5) * h;
      const off = sx < left || sx > right || sy < top || sy > bottom || this.tmp.z > 1;
      if (off) {
        // Pin the timer ring to the edge of the screen with an arrow pointing at the machine.
        const l = 44, r = w - 44, tp = barH + 52, bt = h - 44;
        const cx = (l + r) / 2, cy = (tp + bt) / 2;
        const ang = Math.atan2(sy - cy, sx - cx);
        const rx = (r - l) / 2, ry = (bt - tp) / 2;
        const t = Math.min(rx / Math.abs(Math.cos(ang) || 1e-6), ry / Math.abs(Math.sin(ang) || 1e-6));
        sx = cx + Math.cos(ang) * t;
        sy = cy + Math.sin(ang) * t;
        el.style.setProperty('--arrow', `${ang}rad`);
      }
      if (sx > w - mapW - 50 && sy < mapBottom) sy = mapBottom;
      el.classList.toggle('off', off);
      el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, ${off ? -50 : -100}%)`;
      const secs = Math.ceil(m.timer);
      el.style.setProperty('--p', `${(m.timer / m.timerMax) * 100}%`);
      el.classList.toggle('urgent', m.timer < 6);
      const span = el.querySelector('span');
      if (span.textContent !== `${secs}`) span.textContent = `${secs}`;
    }
    for (const [code, el] of this.markers) {
      if (!seen.has(code)) { el.remove(); this.markers.delete(code); }
    }
  }

  loop(now) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.clockTime += dt;
    const t = this.clockTime;
    this.fpsGuard(dt);

    this.game.update(dt, this.readInput());
    const s = this.game.state;

    // player
    const p = s.player;
    this.worker.group.position.set(p.x, 0, p.z);
    const cur = this.worker.group.rotation.y;
    let diff = p.facing - cur;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.worker.group.rotation.y = cur + diff * Math.min(1, dt * 14);
    this.worker.update(dt, s.phase === 'playing' ? p.speed01 : 0);
    this.worker.setCarried(s.bearings);

    // machines
    for (const m of s.machines) {
      const v = this.arena.machines.get(m.code);
      const want = STATUS_TO_SCENE[m.status];
      if (v.status !== want) v.setStatus(want, { hold: true });
    }
    this.arena.update(dt, t);
    this.lights.update(t, this.arena.machines);

    this.syncDrones();
    for (const v of this.droneById.values()) v.update(dt, t);
    this.syncPickups();
    for (const v of this.pickupById.values()) v.update(dt, t);
    this.splinters.update(dt);
    this.repairFx.update(dt);
    this.landFx.update(dt);
    this.collectFx.update(dt);
    for (const fn of this.smoke.values()) fn(dt);

    // camera follows with a little lead in the run direction
    const lead = 2.2 * p.speed01;
    this.tmp.set(p.x + Math.sin(p.facing) * lead, 0, p.z + Math.cos(p.facing) * lead);
    this.tmp.x = Math.max(-22, Math.min(22, this.tmp.x));
    this.tmp.z = Math.max(-14, Math.min(15, this.tmp.z));
    this.camFocus.lerp(this.tmp, 1 - Math.exp(-dt * 4));
    this.placeCamera();

    this.renderer.render(this.scene, this.camera);
    this.updateMarkers();
    this.onFrame?.(s);
  }
}
