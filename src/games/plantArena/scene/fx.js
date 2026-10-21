// Cheap glow, light-pool and spark effects. Everything here is additive,
// unlit and pooled so it costs almost nothing on budget GPUs.
import * as THREE from 'three';
import { canvasTexture } from './toon.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

let radialTex;
export function radialTexture() {
  if (!radialTex) {
    radialTex = canvasTexture(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  return radialTex;
}

let plateauTex;
// Glow that stays strong out to ~55% of its radius before fading: reads as a
// pool of coloured light spilling round a machine rather than a soft dot.
export function plateauTexture() {
  if (!plateauTex) {
    plateauTex = canvasTexture(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.8)');
      g.addColorStop(0.75, 'rgba(255,255,255,0.3)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }
  return plateauTex;
}

// Flat additive glow on the floor: lamp pools, red alarm glow, green "saved" glow.
export function floorGlow(radius, color, opacity = 0.5, { plateau = false } = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({
      map: plateau ? plateauTexture() : radialTexture(), color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  m.renderOrder = 2;
  m.name = 'floorGlow';
  return m;
}

// Camera-facing halo used around lamps and emissive parts (fake bloom).
export function halo(size, color, opacity = 0.6) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  s.scale.set(size, size, 1);
  return s;
}

// Electric arcs + hot sparks crackling over an attacked machine.
export function createSparks({ arcs = 5, sparks = 46, radius = 1.8, height = 2.4 } = {}) {
  const group = new THREE.Group();
  group.name = 'sparks';
  const SEG = 7;
  const arcGeo = new THREE.BufferGeometry();
  const arcPos = new Float32Array(arcs * SEG * 2 * 3);
  arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
  const arcMat = new THREE.LineBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (const [dx, dy] of [[0, 0], [0.025, 0.02], [-0.02, -0.025]]) {
    const arcLines = new THREE.LineSegments(arcGeo, arcMat);
    arcLines.position.set(dx, dy, 0);
    arcLines.frustumCulled = false;
    group.add(arcLines);
  }

  const sGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(sparks * 3);
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const vel = new Float32Array(sparks * 3);
  const life = new Float32Array(sparks);
  const sMat = new THREE.PointsMaterial({ color: '#ffd27a', size: 0.2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const points = new THREE.Points(sGeo, sMat);
  points.frustumCulled = false;
  group.add(points);

  const flash = halo(2.6, '#ffae3d', 0.0);
  flash.position.y = height * 0.7;
  group.add(flash);

  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let arcTimer = 0;
  const respawn = (i) => {
    const a = rand() * Math.PI * 2;
    sPos[i * 3] = Math.cos(a) * radius * 0.5;
    sPos[i * 3 + 1] = height * (0.4 + rand() * 0.5);
    sPos[i * 3 + 2] = Math.sin(a) * radius * 0.5;
    vel[i * 3] = Math.cos(a) * (1 + rand() * 3);
    vel[i * 3 + 1] = 1 + rand() * 3;
    vel[i * 3 + 2] = Math.sin(a) * (1 + rand() * 3);
    life[i] = 0.3 + rand() * 0.6;
  };
  for (let i = 0; i < sparks; i++) { respawn(i); life[i] *= rand(); }

  return {
    group,
    update(dt, t) {
      arcTimer -= dt;
      if (arcTimer <= 0) {
        arcTimer = 0.06;
        let k = 0;
        for (let a = 0; a < arcs; a++) {
          const a0 = rand() * Math.PI * 2, a1 = a0 + 1 + rand() * 2;
          const y0 = height * (0.3 + rand() * 0.6), y1 = height * (0.3 + rand() * 0.6);
          let px = Math.cos(a0) * radius, py = y0, pz = Math.sin(a0) * radius;
          for (let s = 1; s <= SEG; s++) {
            const f = s / SEG;
            const ang = a0 + (a1 - a0) * f;
            const nx = Math.cos(ang) * radius + (rand() - 0.5) * 0.35;
            const ny = y0 + (y1 - y0) * f + (rand() - 0.5) * 0.35;
            const nz = Math.sin(ang) * radius + (rand() - 0.5) * 0.35;
            arcPos.set([px, py, pz, nx, ny, nz], k);
            k += 6;
            px = nx; py = ny; pz = nz;
          }
        }
        arcGeo.attributes.position.needsUpdate = true;
        arcMat.opacity = rand() > 0.25 ? 0.95 : 0.2;
      }
      for (let i = 0; i < sparks; i++) {
        life[i] -= dt;
        if (life[i] <= 0) { respawn(i); continue; }
        vel[i * 3 + 1] -= 9.8 * dt;
        sPos[i * 3] += vel[i * 3] * dt;
        sPos[i * 3 + 1] = Math.max(0.05, sPos[i * 3 + 1] + vel[i * 3 + 1] * dt);
        sPos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      }
      sGeo.attributes.position.needsUpdate = true;
      flash.material.opacity = Math.max(0, Math.sin(t * 23) * Math.sin(t * 7.3)) * 0.8;
    },
  };
}

// Many static floor glows baked into one additive mesh (one draw call).
export function mergedFloorGlows(items) {
  const geos = items.map(({ x, z, radius, color, opacity, y = 0.03 }) => {
    const g = new THREE.PlaneGeometry(radius * 2, radius * 2);
    g.rotateX(-Math.PI / 2);
    g.translate(x, y, z);
    const c = new THREE.Color(color).multiplyScalar(opacity);
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < g.attributes.position.count; i++) c.toArray(col, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshBasicMaterial({
    map: radialTexture(), vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  mesh.renderOrder = 2;
  mesh.name = 'floorGlows';
  return mesh;
}

// Static halos as one point cloud.
export function mergedHalos(points, size, color, opacity = 0.5) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({
    map: radialTexture(), size, color: new THREE.Color(color).multiplyScalar(opacity), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  p.name = 'halos';
  return p;
}

// Bright ring plus a sparkle burst, pooled. Used when a bearing lands and
// again when it is picked up, so both moments read without new geometry.
export function createPop(scene, { color = '#ffd27a', grains = 26 } = {}) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.42, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const pos = new Float32Array(grains * 3);
  const vel = new Float32Array(grains * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color, size: 0.17, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  pts.frustumCulled = false;
  pts.visible = false;
  scene.add(pts);

  let life = 0;
  let span = 0.5;
  return {
    fire(x, z, { scale = 1, seconds = 0.5 } = {}) {
      ring.position.set(x, 0.09, z);
      ring.scale.setScalar(scale);
      ring.visible = true;
      for (let i = 0; i < grains; i++) {
        pos.set([x, 0.3, z], i * 3);
        const a = Math.random() * Math.PI * 2;
        const sp = (1.6 + Math.random() * 3.4) * scale;
        vel.set([Math.cos(a) * sp, 2.2 + Math.random() * 3.4, Math.sin(a) * sp], i * 3);
      }
      geo.attributes.position.needsUpdate = true;
      pts.visible = true;
      span = seconds;
      life = seconds;
    },
    update(dt) {
      if (life <= 0) return;
      life -= dt;
      const t = 1 - life / span;
      ring.scale.setScalar(ring.scale.x + dt * 7);
      ring.material.opacity = Math.max(0, 1 - t);
      for (let i = 0; i < grains; i++) {
        vel[i * 3 + 1] -= 11 * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] = Math.max(0.05, pos[i * 3 + 1] + vel[i * 3 + 1] * dt);
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      }
      geo.attributes.position.needsUpdate = true;
      pts.material.opacity = Math.max(0, 1 - t);
      if (life <= 0) { ring.visible = false; pts.visible = false; }
    },
  };
}

// Flame licking off a rig once its countdown is past halfway. One additive
// Points cloud per rig, hidden until it is needed, so an idle rig costs
// nothing to draw.
export function createFire({ count = 40, radius = 1.15, height = 2.8 } = {}) {
  const group = new THREE.Group();
  group.name = 'fire';
  group.visible = false;

  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const span = new Float32Array(count);

  const seed = (i, stagger = false) => {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = 0.15;
    pos[i * 3 + 2] = Math.sin(a) * r;
    vel[i * 3] = (Math.random() - 0.5) * 0.5;
    vel[i * 3 + 1] = 1.5 + Math.random() * 2.1;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    span[i] = 0.5 + Math.random() * 0.7;
    life[i] = stagger ? Math.random() * span[i] : span[i];
  };
  for (let i = 0; i < count; i++) seed(i, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: '#ff8a26',
    size: 0.62,
    map: radialTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  group.add(pts);

  // Heat pooled on the floor under the flame.
  const pool = floorGlow(radius * 1.9, '#ff6a18', 0);
  pool.position.y = 0.05;
  group.add(pool);

  let heat = 0;
  return {
    group,
    // 0 = not burning, 1 = fully alight
    setHeat(v) {
      heat = Math.max(0, Math.min(1, v));
      group.visible = heat > 0.01;
    },
    update(dt, t) {
      if (!group.visible) return;
      for (let i = 0; i < count; i++) {
        life[i] -= dt;
        if (life[i] <= 0) { seed(i); continue; }
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt * (0.6 + heat * 0.8);
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (pos[i * 3 + 1] > height) life[i] = 0;
      }
      geo.attributes.position.needsUpdate = true;
      const flicker = 0.82 + Math.sin(t * 19) * 0.1 + Math.sin(t * 7.3) * 0.08;
      mat.opacity = heat * flicker;
      mat.size = 0.44 + heat * 0.3;
      pool.material.opacity = heat * 0.42 * flicker;
    },
  };
}
