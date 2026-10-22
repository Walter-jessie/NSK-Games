import * as THREE from 'three';

/**
 * Background atmosphere for the runner bay: bearing parts and engineering
 * notation drifting past, well outside the lanes.
 *
 * Built to stay out of the way. Everything is unlit wireframe or flat text at
 * low opacity, sits beyond the guard rails and above head height, and drifts
 * slower than the track so it reads as distance rather than as something
 * coming at the player. Nothing crosses the four lanes.
 *
 * Cost: one InstancedMesh per shape and one per notation panel, so the whole
 * field is a handful of draw calls with no lighting work at all.
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

const HOLO = '#6fd6ff';
const HOLO_WARM = '#ffc06a';

/** Maths and engineering notation an NSK trainee would recognise. */
const NOTATION = [
  'π',
  '2πr',
  'πr²',
  'ω = 2πn / 60',
  'τ = F · r',
  'σ = F / A',
  'L₁₀ = (C/P)³',
  'Ø 40 H7',
  'Ra 0.20 µm',
  'SUJ2 · 100Cr6',
  'NSK 6208ZZ',
];

function notationTexture(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.font = '600 62px "Outfit", "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#bfe9ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  // Rule under the text, the way a callout on a drawing is underlined.
  ctx.fillStyle = '#4ea8d8';
  ctx.fillRect(96, 108, 320, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Dial with a sweep arrow and an RPM label. */
function rpmTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = '#8fdcff';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  // open dial
  ctx.beginPath();
  ctx.arc(128, 120, 78, Math.PI * 0.78, Math.PI * 0.22);
  ctx.stroke();
  // sweep arrowhead at the open end
  ctx.fillStyle = '#8fdcff';
  ctx.beginPath();
  ctx.moveTo(196, 86);
  ctx.lineTo(214, 118);
  ctx.lineTo(178, 116);
  ctx.closePath();
  ctx.fill();
  // needle
  ctx.beginPath();
  ctx.moveTo(128, 120);
  ctx.lineTo(176, 76);
  ctx.stroke();
  ctx.font = '700 46px "Outfit", "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#bfe9ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RPM', 128, 206);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function scatter(rand) {
  const side = rand() < 0.5 ? -1 : 1;
  // Bias towards the near end. Spread evenly, most of the field bunches at the
  // horizon, which is exactly where the question panel starts.
  const near = Math.pow(rand(), 0.55);
  return {
    x: side * (SIDE_NEAR + rand() * (SIDE_FAR - SIDE_NEAR)),
    y: Y_LOW + rand() * (Y_HIGH - Y_LOW),
    z: Z_START + near * Z_SPAN,
  };
}

export function createSkyProps({ count = 5, seed = 1 } = {}) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  const group = new THREE.Group();
  group.name = 'SkyProps';

  // Wireframe so the parts read as holographic schematics rather than as
  // solid objects the player might mistake for obstacles.
  const line = (color, opacity) =>
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity, depthWrite: false, toneMapped: false });

  const shapes = [
    { geo: new THREE.TorusGeometry(1.15, 0.34, 5, 14), mat: line(HOLO, 0.16), spin: 0.26 },        // bearing ring
    { geo: new THREE.IcosahedronGeometry(0.72, 0), mat: line(HOLO, 0.18), spin: 0.5 },            // rolling element
    { geo: new THREE.CylinderGeometry(1.0, 1.0, 0.26, 12, 1), mat: line(HOLO_WARM, 0.15), spin: 0.3 }, // cog
    { geo: new THREE.TorusGeometry(0.9, 0.16, 4, 10), mat: line(HOLO_WARM, 0.13), spin: 0.42 },       // snap ring
    { geo: new THREE.BoxGeometry(1.5, 0.42, 0.42), mat: line(HOLO, 0.12), spin: 0.3 },            // gauge block
  ];

  const dummy = new THREE.Object3D();
  const fields = [];

  for (const { geo, mat, spin } of shapes) {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    const items = [];
    for (let i = 0; i < count; i++) {
      const p = scatter(rand);
      items.push({
        ...p,
        rx: rand() * Math.PI,
        ry: rand() * Math.PI,
        rate: spin * (0.5 + rand()),
        drift: 0.22 + rand() * 0.3,   // slower than the track, so it sits back
        scale: 0.6 + rand() * 0.6,
      });
    }
    fields.push({ mesh, items });
    group.add(mesh);
  }

  // Notation panels. One plane geometry, one material per phrase, so each
  // reads differently without a texture atlas.
  const panelGeo = new THREE.PlaneGeometry(5.4, 1.35);
  const panels = [];
  // Panels scale with `count` as well. Left at a fixed three, a small count
  // thinned the shapes out but left the text field as busy as ever.
  const panelCount = Math.max(1, Math.round(count / 2));
  for (let i = 0; i < panelCount; i++) {
    const text = NOTATION[Math.floor(rand() * NOTATION.length)];
    const mat = new THREE.MeshBasicMaterial({
      map: notationTexture(text),
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(panelGeo, mat);
    const p = scatter(rand);
    mesh.position.set(p.x, p.y, p.z);
    mesh.frustumCulled = false;
    panels.push({ mesh, drift: 0.2 + rand() * 0.22 });
    group.add(mesh);
  }

  // RPM dials, square rather than the wide notation panels.
  const dialGeo = new THREE.PlaneGeometry(1.7, 1.7);
  const dialTex = rpmTexture();
  for (let i = 0; i < Math.max(1, Math.round(count / 3)); i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: dialTex,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(dialGeo, mat);
    const p = scatter(rand);
    mesh.position.set(p.x, p.y, p.z);
    mesh.frustumCulled = false;
    panels.push({ mesh, drift: 0.2 + rand() * 0.22 });
    group.add(mesh);
  }

  return {
    group,
    /** advance: metres the track moved this frame. */
    update(advance, t) {
      for (const { mesh, items } of fields) {
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          it.z += advance * it.drift;
          if (it.z > Z_END) {
            const p = scatter(rand);
            it.x = p.x;
            it.y = p.y;
            it.z = Z_START;
          }
          dummy.position.set(it.x, it.y, it.z);
          dummy.rotation.set(it.rx + t * it.rate * 0.4, it.ry + t * it.rate, 0);
          dummy.scale.setScalar(it.scale);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }

      for (const p of panels) {
        p.mesh.position.z += advance * p.drift;
        if (p.mesh.position.z > Z_END) {
          const n = scatter(rand);
          p.mesh.position.set(n.x, n.y, Z_START);
        }
        // Face the camera, which looks down the +z axis from behind the runner.
        p.mesh.rotation.y = p.mesh.position.x > 0 ? -0.5 : 0.5;
      }
    },
    dispose() {
      for (const { mesh } of fields) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      panelGeo.dispose();
      for (const p of panels) {
        p.mesh.material.map?.dispose();
        p.mesh.material.dispose();
      }
    },
  };
}
