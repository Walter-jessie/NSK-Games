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
export function createSparks({ arcs = 3, sparks = 24, radius = 1.6, height = 2.2 } = {}) {
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
  const sMat = new THREE.PointsMaterial({ color: '#ffb547', size: 0.14, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
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
