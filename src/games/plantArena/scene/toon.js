// Cartoon toolkit shared by every Plant Arena model.
// Models are built from simple primitives, merged into one vertex-coloured
// mesh per moving part, and given a cheap inverted-hull ink outline. That
// keeps the whole arena at a few dozen draw calls on budget phones.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const PALETTE = {
  ink: '#1b1530',
  nskBlue: '#0b4fae',
  nskBlueLight: '#3c8cf0',
  nskRed: '#e3262f',
  white: '#f4f6fb',
  steel: '#b9c3d3',
  steelDark: '#6d7a90',
  gunmetal: '#3b4458',
  yellow: '#ffc928',
  orange: '#ff8a1f',
  hazard: '#ffb400',
  green: '#3ee07b',
  teal: '#22c3c9',
  purple: '#8b5cf6',
  woodDark: '#451a03',
  woodAmber: '#c9832e',
};

let gradientMap;
export function toonGradient() {
  if (!gradientMap) {
    const data = new Uint8Array([70, 150, 215, 255]);
    gradientMap = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
    gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
}

// Lit surface used by every model. 'realistic' = PBR with environment
// reflections (the default look); 'toon' = the original flat cartoon shading.
export const LOOK = { mode: 'realistic' };

export function surfaceMaterial(opts = {}) {
  if (LOOK.mode === 'toon') {
    const { roughness, metalness, ...rest } = opts;
    return new THREE.MeshToonMaterial({ gradientMap: toonGradient(), ...rest });
  }
  return new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.28, ...opts });
}

const materials = new Map();
export function toonMaterial(key = 'vc', opts = {}) {
  if (!materials.has(key)) {
    materials.set(key, surfaceMaterial({ vertexColors: true, ...opts }));
  }
  return materials.get(key);
}

export function glowMaterial(key = 'glow', opts = {}) {
  if (!materials.has(key)) {
    materials.set(key, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, ...opts }));
  }
  return materials.get(key);
}

const outlineMaterials = new Map();
export const outlineResolution = new THREE.Vector2(1280, 720);
// Ink outline sized in screen pixels (with a small world-space floor) so it
// stays bold at any zoom, like hand-drawn cartoon lines.
export function outlineMaterial(pixels = 2.2, color = PALETTE.ink) {
  if (LOOK.mode === 'realistic') { pixels = Math.min(pixels, 1.3); color = '#06070b'; }
  const key = `${pixels}|${color}`;
  if (!outlineMaterials.has(key)) {
    outlineMaterials.set(
      key,
      new THREE.ShaderMaterial({
        uniforms: {
          pixels: { value: pixels },
          resolution: { value: outlineResolution },
          inkColor: { value: new THREE.Color(color) },
        },
        vertexShader: /* glsl */ `
          uniform float pixels;
          uniform vec2 resolution;
          void main() {
            mat4 mv = modelViewMatrix;
            #ifdef USE_INSTANCING
              mv = modelViewMatrix * instanceMatrix;
            #endif
            vec4 clip = projectionMatrix * mv * vec4(position, 1.0);
            vec3 n = normalize(mat3(mv) * normal);
            vec2 dir = (projectionMatrix * vec4(n, 0.0)).xy;
            float len = length(dir);
            if (len > 1e-4) clip.xy += (dir / len) * pixels * 2.0 / resolution * clip.w;
            clip.z += 0.0004 * clip.w;
            gl_Position = clip;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 inkColor;
          void main() { gl_FragColor = vec4(inkColor, 1.0); }`,
        side: THREE.BackSide,
      }),
    );
  }
  return outlineMaterials.get(key);
}

// Position-only copy with welded, averaged normals so the hull has no cracks.
export function outlineGeometry(geometry) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geometry.getAttribute('position').clone());
  if (geometry.index) g.setIndex(geometry.index.clone());
  const welded = mergeVertices(g, 1e-3);
  welded.computeVertexNormals();
  return welded;
}

export function withOutline(mesh, thickness = 2.2) {
  const hull = new THREE.Mesh(outlineGeometry(mesh.geometry), outlineMaterial(thickness));
  hull.name = `${mesh.name || 'mesh'}_ink`;
  mesh.add(hull);
  return mesh;
}

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();

// Collects primitive parts and bakes them into one merged mesh.
export class PartBuilder {
  constructor(name = 'part') {
    this.name = name;
    this.solid = [];
    this.glow = [];
  }

  add(geometry, color, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], glow = false } = {}) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.deleteAttribute('uv');
    tmpEuler.set(r[0], r[1], r[2]);
    tmpQuat.setFromEuler(tmpEuler);
    tmpMatrix.compose(new THREE.Vector3(...p), tmpQuat, new THREE.Vector3(...s));
    g.applyMatrix4(tmpMatrix);
    const c = new THREE.Color(color);
    const count = g.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) c.toArray(colors, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    (glow ? this.glow : this.solid).push(g);
    return this;
  }

  box(w, h, d, color, t) { return this.add(new THREE.BoxGeometry(w, h, d), color, t); }
  cyl(rt, rb, h, color, t, seg = 10) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, t); }
  sphere(r, color, t, ws = 10, hs = 8) { return this.add(new THREE.SphereGeometry(r, ws, hs), color, t); }
  torus(r, tube, color, t, rs = 6, ts = 14) { return this.add(new THREE.TorusGeometry(r, tube, rs, ts), color, t); }
  cone(r, h, color, t, seg = 10) { return this.add(new THREE.ConeGeometry(r, h, seg), color, t); }

  build({ outline = 2.2 } = {}) {
    const group = new THREE.Group();
    group.name = this.name;
    if (this.solid.length) {
      const geo = mergeGeometries(this.solid);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, toonMaterial());
      mesh.name = `${this.name}_body`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (outline) withOutline(mesh, outline);
      group.add(mesh);
    }
    if (this.glow.length) {
      const mesh = new THREE.Mesh(mergeGeometries(this.glow), glowMaterial());
      mesh.name = `${this.name}_glow`;
      group.add(mesh);
    }
    return group;
  }
}

// A coloured bearing ring, the visual "NSK bearing" used on machines and pickups.
export function addBearing(b, radius, t = {}, { outer = PALETTE.steel, balls = PALETTE.white, seal = PALETTE.nskBlue } = {}) {
  const tube = radius * 0.28;
  b.torus(radius, tube, outer, t, 5, 12);
  b.torus(radius * 0.62, tube * 0.7, seal, t, 4, 10);
  return b;
}

export function countTriangles(object) {
  let tris = 0;
  object.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const n = g.index ? g.index.count / 3 : g.getAttribute('position').count / 3;
    tris += n * (o.isInstancedMesh ? o.count : 1);
  });
  return Math.round(tris);
}

// Canvas texture helper for signs, crates and decals.
export function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 1;
  return tex;
}

// Bakes every static toon/outline mesh under `root` into one mesh per
// material, cutting draw calls. Subtrees marked userData.spin / dynamic /
// skipMerge (moving parts, other models) are left untouched.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];
  const visit = (obj) => {
    for (const child of [...obj.children]) {
      const u = child.userData;
      if (u.spin || u.dynamic || u.skipMerge) continue;
      if (child.isMesh && !child.isInstancedMesh && (child.material === toonMaterial() || child.material.isShaderMaterial)) {
        const g = child.geometry.clone();
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, child.matrixWorld));
        if (!buckets.has(child.material)) buckets.set(child.material, []);
        buckets.get(child.material).push(g);
        victims.push(child);
      }
      visit(child);
    }
  };
  visit(root);
  for (const v of victims) {
    // keep any non-mergeable children (e.g. lamps) by re-parenting them
    for (const c of [...v.children]) if (!victims.includes(c)) { v.parent.attach(c); }
    v.parent.remove(v);
  }
  for (const [material, geos] of buckets) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), material);
    mesh.name = material.isShaderMaterial ? 'merged_ink' : 'merged_body';
    if (!material.isShaderMaterial) { mesh.castShadow = true; mesh.receiveShadow = true; }
    root.add(mesh);
  }
  return root;
}
