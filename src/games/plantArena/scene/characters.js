// Player technician, rogue drones, crates and bearing pickups.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE as C, PartBuilder, addBearing, canvasTexture, outlineGeometry, outlineMaterial, surfaceMaterial } from './toon.js';

const part = (name, fn, outline = 2.2) => {
  const b = new PartBuilder(name);
  fn(b);
  return b.build({ outline });
};

/* ---------------- NSK technician (player) ---------------- */
export function createWorker() {
  const root = new THREE.Group();
  root.name = 'worker';
  const rig = new THREE.Group();
  root.add(rig);

  const torso = part('torso', (b) => {
    b.box(0.62, 0.62, 0.42, C.nskBlue, { p: [0, 0.98, 0] });
    b.box(0.64, 0.12, 0.44, C.ink, { p: [0, 0.72, 0] }); // belt
    b.box(0.14, 0.08, 0.02, C.yellow, { p: [0, 0.72, 0.225] });
    b.box(0.08, 0.5, 0.02, C.hazard, { p: [-0.18, 1.0, 0.215] }); // hi-vis straps
    b.box(0.08, 0.5, 0.02, C.hazard, { p: [0.18, 1.0, 0.215] });
    b.box(0.2, 0.12, 0.02, C.white, { p: [0.15, 1.15, 0.22] }); // badge
    // bearing backpack (holds up to 5)
    b.box(0.56, 0.62, 0.3, C.gunmetal, { p: [0, 1.02, -0.34] });
    b.box(0.6, 0.1, 0.34, C.hazard, { p: [0, 1.36, -0.34] });
    b.cyl(0.07, 0.09, 0.16, C.steel, { p: [-0.16, 0.66, -0.34] }, 8);
    b.cyl(0.07, 0.09, 0.16, C.steel, { p: [0.16, 0.66, -0.34] }, 8);
    // head
    b.sphere(0.36, '#ffcf9e', { p: [0, 1.62, 0.02], s: [1, 0.95, 0.95] }, 12, 8);
    b.sphere(0.07, '#f4b07c', { p: [0, 1.58, 0.36] }, 8, 6); // nose
    b.sphere(0.075, '#ffcf9e', { p: [-0.36, 1.6, 0] }, 6, 5); // ears
    b.sphere(0.075, '#ffcf9e', { p: [0.36, 1.6, 0] }, 6, 5);
    // hard hat
    b.sphere(0.4, C.yellow, { p: [0, 1.74, 0], s: [1, 0.72, 1] }, 12, 5);
    b.cyl(0.46, 0.46, 0.05, C.yellow, { p: [0, 1.72, 0.05] }, 12);
    b.box(0.08, 0.06, 0.6, '#ffe27a', { p: [0, 2.0, 0] });
    b.box(0.22, 0.1, 0.02, C.nskBlue, { p: [0, 1.86, 0.37], r: [-0.4, 0, 0] });
    // face: big cartoon eyes and grin
    b.sphere(0.09, C.white, { p: [-0.12, 1.63, 0.31] }, 7, 5);
    b.sphere(0.09, C.white, { p: [0.12, 1.63, 0.31] }, 7, 5);
    b.sphere(0.045, C.ink, { p: [-0.12, 1.63, 0.39] }, 6, 5);
    b.sphere(0.045, C.ink, { p: [0.12, 1.63, 0.39] }, 6, 5);
    b.add(new THREE.TorusGeometry(0.1, 0.028, 4, 8, Math.PI), '#7a2b20', { p: [0, 1.5, 0.33], r: [0.25, 0, Math.PI] }); // grin
    b.box(0.08, 0.05, 0.08, '#5a3416', { p: [-0.16, 1.73, 0.3] }); // brows
    b.box(0.08, 0.05, 0.08, '#5a3416', { p: [0.16, 1.73, 0.3] });
  });
  rig.add(torso);

  const limb = (name, len, color, cuff) =>
    part(name, (b) => {
      b.box(0.18, len, 0.2, color, { p: [0, -len / 2, 0] });
      b.box(0.21, 0.16, 0.24, cuff, { p: [0, -len + 0.06, cuff === C.ink ? 0.04 : 0] });
    });
  const legL = limb('legL', 0.6, '#0a3a80', C.ink);
  const legR = limb('legR', 0.6, '#0a3a80', C.ink);
  legL.position.set(-0.16, 0.68, 0);
  legR.position.set(0.16, 0.68, 0);
  const armL = limb('armL', 0.55, C.nskBlue, '#ff8a1f');
  const armR = limb('armR', 0.55, C.nskBlue, '#ff8a1f');
  armL.position.set(-0.42, 1.25, 0);
  armR.position.set(0.42, 1.25, 0);
  rig.add(legL, legR, armL, armR);

  // Bearings carried in the backpack, shown as little rings on top.
  const carried = [];
  for (let i = 0; i < 5; i++) {
    const r = part(`carried${i}`, (b) => { b.torus(0.07, 0.03, C.steel, {}, 4, 8); b.cyl(0.05, 0.05, 0.03, C.nskRed, { r: [Math.PI / 2, 0, 0] }, 8); }, 1.4);
    r.position.set(-0.22 + i * 0.11, 1.46, -0.34);
    r.rotation.x = Math.PI / 2.5;
    r.visible = false;
    rig.add(r);
    carried.push(r);
  }

  let phase = 0;
  return {
    group: root,
    setCarried(n) { carried.forEach((c, i) => { c.visible = i < n; }); },
    update(dt, speed01) {
      phase += dt * (4 + 8 * speed01);
      const swing = Math.sin(phase) * 0.7 * speed01;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.9;
      armR.rotation.x = swing * 0.9;
      rig.position.y = Math.abs(Math.sin(phase)) * 0.07 * speed01;
      rig.rotation.x = 0.12 * speed01;
    },
  };
}

/* ---------------- Rogue sabotage drone ---------------- */
let rotorTex;
function rotorBlurTexture() {
  if (!rotorTex) {
    rotorTex = canvasTexture(128, 128, (ctx, w, h) => {
      ctx.translate(w / 2, h / 2);
      ctx.fillStyle = 'rgba(190,200,215,0.18)';
      ctx.beginPath(); ctx.arc(0, 0, 62, 0, 7); ctx.fill();
      for (let i = 0; i < 2; i++) {
        ctx.rotate(Math.PI / 2 * i);
        const g = ctx.createLinearGradient(-60, 0, 60, 0);
        g.addColorStop(0, 'rgba(220,228,240,0)'); g.addColorStop(0.5, 'rgba(220,228,240,0.75)'); g.addColorStop(1, 'rgba(220,228,240,0)');
        ctx.fillStyle = g; ctx.fillRect(-60, -5, 120, 10);
      }
      ctx.fillStyle = '#1b1d22'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
    });
    rotorTex.center.set(0.5, 0.5);
  }
  return rotorTex;
}

export function createDrone() {
  const root = new THREE.Group();
  root.name = 'drone';
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  bodyGroup.add(
    part('droneBody', (b) => {
      b.sphere(0.55, '#2a2233', { s: [1, 0.62, 1] }, 14, 8);
      b.cyl(0.58, 0.58, 0.12, C.nskRed, { p: [0, 0, 0] }, 16);
      b.sphere(0.3, C.white, { p: [0, 0.0, 0.42], s: [1.15, 0.8, 0.6] }, 12, 8);
      b.sphere(0.2, '#ff2a3a', { p: [0, -0.02, 0.56], s: [1, 0.8, 0.6], glow: true }, 10, 8); // angry eye
            b.box(0.36, 0.06, 0.06, '#2a2233', { p: [-0.13, 0.24, 0.6], r: [0, 0, -0.45] }); // scowl brow
      b.box(0.36, 0.06, 0.06, '#2a2233', { p: [0.13, 0.24, 0.6], r: [0, 0, 0.45] });
      b.cyl(0.03, 0.03, 0.4, C.ink, { p: [0, 0.5, 0] }, 6); // antenna
      b.sphere(0.08, '#ff2a3a', { p: [0, 0.72, 0], glow: true }, 6, 5);
      // arms
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        b.box(0.75, 0.08, 0.12, '#3a3046', { p: [Math.cos(a) * 0.7, 0.05, Math.sin(a) * 0.7], r: [0, -a, 0] });
        b.cyl(0.13, 0.13, 0.14, C.ink, { p: [Math.cos(a) * 1.05, 0.08, Math.sin(a) * 1.05] }, 8);
      }
      // claws
      b.box(0.06, 0.38, 0.06, C.steel, { p: [-0.14, -0.45, 0.1], r: [0, 0, 0.3] });
      b.box(0.06, 0.38, 0.06, C.steel, { p: [0.14, -0.45, 0.1], r: [0, 0, -0.3] });
    }),
  );
  // Spinning props drawn as one motion-blur disc mesh (1 draw call for all 4).
  const rotorGeos = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const g = new THREE.CircleGeometry(0.34, 16);
    g.rotateX(-Math.PI / 2);
    g.translate(Math.cos(a) * 1.05, 0.18, Math.sin(a) * 1.05);
    rotorGeos.push(g);
  }
  const rotorMat = new THREE.MeshBasicMaterial({ map: rotorBlurTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const rotorDisc = new THREE.Mesh(mergeGeometries(rotorGeos), rotorMat);
  rotorDisc.name = 'rotorBlur';
  bodyGroup.add(rotorDisc);
  // Red search-light cone
  const coneMat = new THREE.MeshBasicMaterial({ color: '#ff2a3a', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 16, 1, true), coneMat);
  beam.position.y = -1.4;
  beam.name = 'beam';
  bodyGroup.add(beam);

  return {
    group: root,
    beam,
    update(dt, t) {
      rotorMat.map.rotation = t * 31;
      bodyGroup.position.y = Math.sin(t * 3 + root.id) * 0.12;
      bodyGroup.rotation.z = Math.sin(t * 2.1 + root.id) * 0.08;
      coneMat.opacity = 0.16 + Math.abs(Math.sin(t * 6)) * 0.12;
    },
  };
}

/* ---------------- Crates ---------------- */
function crateTexture(nsk) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const base = nsk ? C.woodAmber : C.woodDark;
    const plank = nsk ? '#b06f22' : '#3a1602';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = plank;
    ctx.lineWidth = 4;
    for (let y = 0; y < h; y += 52) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    // frame + cross brace
    ctx.fillStyle = nsk ? '#8a5216' : '#2b1001';
    ctx.fillRect(0, 0, w, 30); ctx.fillRect(0, h - 30, w, 30); ctx.fillRect(0, 0, 30, h); ctx.fillRect(w - 30, 0, 30, h);
    if (!nsk) {
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(Math.PI / 4); ctx.fillRect(-18, -160, 36, 320); ctx.restore();
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (const [x, y] of [[15, 15], [w - 15, 15], [15, h - 15], [w - 15, h - 15]]) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
    if (nsk) {
      ctx.fillStyle = C.white;
      ctx.beginPath(); ctx.roundRect(42, 80, w - 84, 96, 12); ctx.fill();
      ctx.fillStyle = C.nskRed;
      ctx.beginPath(); ctx.roundRect(50, 88, w - 100, 80, 8); ctx.fill();
      ctx.fillStyle = C.white;
      ctx.font = '900 64px "Arial Black", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('NSK', w / 2, 130);
    }
  });
}

const CRATE_SIZE = 1.0;
export function createCrateField(decoyPositions, nskPositions) {
  const group = new THREE.Group();
  group.name = 'crates';
  const geo = new THREE.BoxGeometry(CRATE_SIZE, CRATE_SIZE, CRATE_SIZE);
  const hull = outlineGeometry(geo);
  const make = (positions, nsk) => {
    const mat = surfaceMaterial({ map: crateTexture(nsk) });
    const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const ink = new THREE.InstancedMesh(hull, outlineMaterial(2.4), positions.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    positions.forEach(([x, z, rot = 0], i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
      m.compose(new THREE.Vector3(x, CRATE_SIZE / 2, z), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
      ink.setMatrixAt(i, m);
    });
    mesh.name = nsk ? 'nskCrates' : 'decoyCrates';
    group.add(mesh, ink);
    return { mesh, ink };
  };
  const decoys = make(decoyPositions, false);
  const nsk = make(nskPositions, true);
  return {
    group,
    // Hide a smashed NSK crate by collapsing its instance.
    smash(index) {
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      nsk.mesh.setMatrixAt(index, zero);
      nsk.ink.setMatrixAt(index, zero);
      nsk.mesh.instanceMatrix.needsUpdate = true;
      nsk.ink.instanceMatrix.needsUpdate = true;
    },
    decoys,
    nsk,
  };
}

/* ---------------- Bearing pickup ---------------- */
export function createBearingPickup() {
  const root = new THREE.Group();
  root.name = 'bearingPickup';
  const spin = part('pickup', (b) => {
    addBearing(b, 0.32, {}, { seal: C.nskRed });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.sphere(0.07, C.white, { p: [Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0] }, 6, 5);
    }
    b.cyl(0.1, 0.1, 0.12, C.steelDark, { r: [Math.PI / 2, 0, 0] }, 10);
  });
  root.add(spin);
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.6, 24),
    new THREE.MeshBasicMaterial({ color: C.yellow, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.75;
  root.add(glow);
  return {
    group: root,
    update(dt, t) {
      spin.rotation.y += dt * 2.5;
      spin.position.y = Math.sin(t * 3) * 0.1;
      glow.scale.setScalar(1 + Math.sin(t * 4) * 0.1);
    },
  };
}
