// The 10 NSK application test benches. Each factory returns a cartoon model
// built in local space: bench top at y = 0.3, footprint 4.6 m x 3.6 m, front
// facing +Z (towards the game camera).
import * as THREE from 'three';
import { PALETTE as C, PartBuilder, addBearing, canvasTexture, toonMaterial, surfaceMaterial, mergeStatic } from './toon.js';
import { createFire, createSparks, floorGlow, halo } from './fx.js';

export const MACHINE_FX = { sparks: 24, arcs: 3 };

const TOP = 0.3;
const W = 4.6;
const D = 3.6;

let benchTopMaterial;
function benchTop() {
  if (!benchTopMaterial) {
    const map = canvasTexture(512, 400, (ctx, w, h) => {
      ctx.fillStyle = '#2c3038';
      ctx.fillRect(0, 0, w, h);
      // diamond tread plate
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 3;
      for (let y = 0; y < h; y += 22) {
        for (let x = (y / 22) % 2 ? 11 : 0; x < w; x += 22) {
          ctx.beginPath();
          ctx.moveTo(x, y + 4);
          ctx.lineTo(x + 8, y - 2);
          ctx.stroke();
        }
      }
      // hazard border
      const b = 34;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.rect(b, b, w - 2 * b, h - 2 * b);
      ctx.clip('evenodd');
      ctx.fillStyle = '#c08a1e';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = C.ink;
      for (let i = -h; i < w + h; i += 44) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 22, 0);
        ctx.lineTo(i + 22 - h, h);
        ctx.lineTo(i - h, h);
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, w - 6, h - 6);
      ctx.strokeRect(b, b, w - 2 * b, h - 2 * b);
    });
    benchTopMaterial = surfaceMaterial({ map, roughness: 0.55, metalness: 0.5 });
  }
  return benchTopMaterial;
}

function nameplate(code, title, accent) {
  const map = canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 26);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(8, 8, 128, h - 16, 20);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.font = '900 44px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code.replace('APP_', ''), 72, h / 2 + 2);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    let size = 46;
    ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
    while (ctx.measureText(title).width > w - 170 && size > 20) {
      size -= 2;
      ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
    }
    ctx.fillText(title, 152, h / 2 + 2);
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.6),
    new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false }),
  );
  mesh.name = 'nameplate';
  return mesh;
}

// Stable per-machine randomness: the same rig always collapses the same way,
// so a failure does not reshuffle itself on every frame or every run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function codeSeed(code) {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Wreckage shown once a rig is lost. Deliberately generic: a collapsed rig
 * reads the same whichever application it was, and the nameplate and the dead
 * lamp already say which one went down. Built once, hidden until needed.
 */
const SCORCH = ['#24282f', '#32373f', '#1a1d23', '#3d3229'];
function debrisPile(code) {
  const rand = mulberry32(codeSeed(code));
  const b = new PartBuilder('debris');
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const spread = (r) => (rand() * 2 - 1) * r;

  // Broken casing: chunks tipped at random across the bench top.
  for (let i = 0; i < 11; i++) {
    const w = 0.2 + rand() * 0.38;
    const hgt = 0.12 + rand() * 0.26;
    b.box(w, hgt, 0.2 + rand() * 0.34, pick(SCORCH), {
      p: [spread(1.75), hgt / 2 + 0.02, spread(1.25)],
      r: [spread(0.5), rand() * Math.PI, spread(0.5)],
    });
  }
  // Buckled panels, leaning over rather than lying flat.
  for (let i = 0; i < 3; i++) {
    b.box(0.72 + rand() * 0.5, 0.045, 0.5 + rand() * 0.4, pick(SCORCH), {
      p: [spread(1.5), 0.2 + rand() * 0.2, spread(1.0)],
      r: [Math.PI / 2.4 + spread(0.4), rand() * Math.PI, spread(0.6)],
    });
  }
  // Pipe offcuts.
  for (let i = 0; i < 2; i++) {
    b.cyl(0.075, 0.075, 0.6 + rand() * 0.5, '#4a4f58', {
      p: [spread(1.5), 0.09, spread(1.1)],
      r: [Math.PI / 2, 0, rand() * Math.PI],
    }, 8);
  }
  // Spilled bearings, the one nod to what the rig was full of.
  for (let i = 0; i < 5; i++) {
    b.torus(0.1 + rand() * 0.07, 0.035, '#8b929c', {
      p: [spread(1.7), 0.05, spread(1.2)],
      r: [Math.PI / 2 + spread(0.35), spread(0.4), 0],
    }, 3, 10);
  }
  const g = b.build({ outline: 1.6 });
  g.name = 'debris';
  g.visible = false;
  return g;
}

// A part that spins around an axis at a pivot.
function spinner(build, pivot, axis, speed) {
  const b = new PartBuilder('spinner');
  build(b);
  const pivotGroup = new THREE.Group();
  pivotGroup.position.set(...pivot);
  pivotGroup.add(b.build());
  pivotGroup.userData.spin = { axis, speed };
  return pivotGroup;
}

function bench(def) {
  const root = new THREE.Group();
  root.name = def.code;
  root.userData.skipMerge = true;

  // Plinth + hazard top
  const plinth = new PartBuilder('plinth');
  plinth.box(W, TOP - 0.02, D, C.gunmetal, { p: [0, (TOP - 0.02) / 2, 0] });
  plinth.box(W + 0.1, 0.06, D + 0.1, C.ink, { p: [0, 0.03, 0] });
  root.add(plinth.build({ outline: 2.6 }));
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W, D), benchTop());
  top.rotation.x = -Math.PI / 2;
  top.position.y = TOP;
  root.add(top);

  // Status lamp post (back-left corner, like the blueprint's green dot)
  const post = new PartBuilder('lampPost');
  post.cyl(0.06, 0.08, 1.5, C.gunmetal, { p: [0, 0.75, 0] }, 8);
  post.cyl(0.16, 0.16, 0.1, C.ink, { p: [0, 1.5, 0] }, 10);
  const postGroup = post.build();
  postGroup.position.set(-W / 2 + 0.25, TOP, -D / 2 + 0.25);
  const lampMat = new THREE.MeshBasicMaterial({ color: C.green, toneMapped: false });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), lampMat);
  lamp.position.y = 1.68;
  postGroup.add(lamp);
  root.add(postGroup);

  const plate = nameplate(def.code, def.short, def.accent);
  plate.position.set(0, TOP + 0.02, D / 2 + 0.36);
  plate.rotation.x = -Math.PI / 2.6;
  root.add(plate);

  const body = new THREE.Group();
  body.name = 'machine';
  body.position.y = TOP;
  root.add(body);

  const spinners = [];
  const animators = [];
  const ctx = {
    body,
    static: new PartBuilder('static'),
    spin(build, pivot, axis, speed, parent = body) {
      const s = spinner(build, pivot, axis, speed);
      parent.add(s);
      spinners.push(s);
      return s;
    },
    animate(fn) { animators.push(fn); },
  };
  // The defs still return bearing / ringRadius / ringRotation hints. Nothing
  // reads them now that the green status ring is gone; they stay as a record of
  // where each machine's bearing sits, should a marker be wanted there again.
  def.build(ctx);
  body.add(ctx.static.build());
  mergeStatic(body);

  // Alarm / saved glows and sparks (all unlit additive, cheap on mobile).
  const alarmGlow = floorGlow(4.4, '#ff2a12', 0, { plateau: true });
  alarmGlow.material.color.setRGB(1.0, 0.16, 0.06);
  const savedGlow = floorGlow(4.6, '#39ff7a', 0, { plateau: true });
  savedGlow.material.color.setRGB(0.15, 0.85, 0.35);
  root.add(alarmGlow, savedGlow);
  alarmGlow.scale.setScalar(1.25);
  const benchGlow = floorGlow(2.6, '#ff3018', 0);
  benchGlow.position.y = TOP + 0.02;
  root.add(benchGlow);
  const lampHalo = halo(1.3, C.green, 0.55);
  lampHalo.position.y = 1.68;
  postGroup.add(lampHalo);
  const sparks = createSparks({ sparks: MACHINE_FX.sparks, arcs: MACHINE_FX.arcs, radius: 1.5, height: 2.3 });
  const fire = createFire();
  root.add(fire.group);
  sparks.group.position.y = TOP;
  sparks.group.visible = false;
  root.add(sparks.group);

  const debris = debrisPile(def.code);
  body.add(debris);

  const state = { status: 'ok', speed: 1, savedTime: 0, danger: 1 };
  const green = new THREE.Color(C.green);
  const red = new THREE.Color(C.nskRed);
  const dead = new THREE.Color('#5a1015');

  function update(dt, t) {
    if (state.status === 'saved' && !state.holdSaved) {
      state.savedTime += dt;
      if (state.savedTime > 2.5) state.status = 'ok';
    }
    const running = state.status === 'ok' || state.status === 'saved';
    const target = running ? 1 : state.status === 'attacked' ? 0.25 : 0;
    state.speed += (target - state.speed) * Math.min(1, dt * 3);
    for (const s of spinners) {
      const { axis, speed } = s.userData.spin;
      const jitter = state.status === 'attacked' ? (Math.sin(t * 37) > 0.3 ? 0 : 1) : 1;
      s.rotation[axis] += speed * state.speed * jitter * dt;
    }
    for (const fn of animators) fn(t, state.speed);
    sparks.group.visible = state.status === 'attacked';
    if (sparks.group.visible) sparks.update(dt, t);
    // Wreckage, and the rig itself dropping into it.
    const lost = state.status === 'failed';
    debris.visible = lost;
    body.position.y = TOP - (lost ? 0.13 : 0);
    body.rotation.z = lost ? 0.07 : 0;
    // Catches alight once the countdown is past halfway, building as it runs
    // out, so a rig in real trouble is obvious from across the arena.
    const burning = state.status === 'attacked' && state.danger < 0.5;
    // A lost rig keeps smouldering: going instantly cold read as nothing having
    // happened at all.
    fire.setHeat(burning ? Math.min(1, (0.5 - state.danger) / 0.38) : lost ? 0.22 : 0);
    fire.update(dt, t);
    alarmGlow.material.opacity = state.status === 'attacked' ? 0.85 + Math.sin(t * 8) * 0.15 : state.status === 'failed' ? 0.15 : 0;
    savedGlow.material.opacity = state.status === 'saved' ? 0.85 * (1 - state.savedTime / 2.5) : 0;
    alarmGlow.visible = alarmGlow.material.opacity > 0;
    savedGlow.visible = savedGlow.material.opacity > 0;
    benchGlow.visible = alarmGlow.visible;
    benchGlow.material.opacity = alarmGlow.material.opacity * 0.6;
    benchGlow.material.color.setRGB(...(state.status === 'saved' ? [0.35, 1.6, 0.6] : [2.6, 0.5, 0.2]));
    if (state.status === 'saved') { benchGlow.visible = true; benchGlow.material.opacity = savedGlow.material.opacity * 0.6; }
    if (running) {
      lampMat.color.copy(green);
      lampHalo.material.color.copy(green);
      lampHalo.material.opacity = 0.55;
      body.position.x = 0;
    } else if (state.status === 'attacked') {
      const blink = Math.sin(t * 12) > 0;
      lampMat.color.copy(blink ? red : dead);
      lampHalo.material.color.copy(red);
      lampHalo.material.opacity = blink ? 0.8 : 0.1;
      body.position.x = Math.sin(t * 61) * 0.025;
    } else {
      lampMat.color.copy(dead);
      lampHalo.material.opacity = 0;
      body.position.x = 0;
    }
  }

  body.userData.skipMerge = true;
  mergeStatic(root);

  return {
    code: def.code,
    title: def.title,
    short: def.short,
    accent: def.accent,
    group: root,
    setStatus(s, { hold = false } = {}) { state.status = s; state.savedTime = 0; state.holdSaved = hold; },
    // Fraction of the repair countdown still left, 1 down to 0.
    setDanger(v) { state.danger = v; },
    get status() { return state.status; },
    update,
  };
}

/* ------------------------------------------------------------------ */
/* Machine definitions                                                 */
/* ------------------------------------------------------------------ */

const wheel = (b, r, w, color = C.ink, hub = C.steel) => {
  b.cyl(r, r, w, color, { r: [Math.PI / 2, 0, 0] }, 14);
  b.cyl(r * 0.55, r * 0.55, w + 0.02, hub, { r: [Math.PI / 2, 0, 0] }, 10);
  b.box(r * 1.7, 0.08, w + 0.04, C.steelDark, {});
};

export const MACHINE_DEFS = [
  {
    code: 'APP_01', title: 'EV Powertrain Dyno', short: 'EV DYNO', accent: C.teal,
    build({ static: s, spin }) {
      // roller dyno pits
      for (const x of [-1.3, 1.3]) {
        s.box(1.0, 0.1, 2.3, C.ink, { p: [x, 0.05, 0] });
        for (const dx of [-0.22, 0.22]) {
          spin((b) => b.cyl(0.14, 0.14, 2.2, C.steel, { r: [Math.PI / 2, 0, 0] }, 10), [x + dx, 0.14, 0], 'z', -14);
        }
      }
      // car body
      s.box(3.7, 0.5, 1.7, C.teal, { p: [0, 0.98, 0] });
      s.box(3.8, 0.14, 1.76, C.ink, { p: [0, 0.73, 0] });
      s.box(1.9, 0.5, 1.45, C.white, { p: [-0.25, 1.45, 0] });
      s.box(1.94, 0.34, 1.5, '#1d3b6e', { p: [-0.25, 1.48, 0] });
      s.box(0.5, 0.3, 1.66, C.teal, { p: [1.62, 1.14, 0], r: [0, 0, -0.35] });
      s.box(0.6, 0.08, 1.6, C.ink, { p: [-1.75, 1.3, 0] }); // spoiler
      s.box(0.1, 0.25, 0.1, C.ink, { p: [-1.75, 1.18, 0.6] });
      s.box(0.1, 0.25, 0.1, C.ink, { p: [-1.75, 1.18, -0.6] });
      // lightning stripe
      s.box(1.1, 0.14, 0.04, C.yellow, { p: [0.2, 1.0, 0.87], r: [0, 0, 0.35] });
      s.box(0.9, 0.14, 0.04, C.yellow, { p: [-0.6, 1.0, 0.87], r: [0, 0, -0.35] });
      s.box(0.12, 0.12, 0.6, '#fff6a0', { p: [1.86, 1.0, 0.0], glow: true });
      s.box(0.06, 0.12, 0.5, '#ff3b47', { p: [-1.87, 1.05, 0.0], glow: true });
      for (const x of [-1.3, 1.3]) {
        for (const z of [-0.88, 0.88]) {
          spin((b) => wheel(b, 0.4, 0.34), [x, 0.66, z], 'z', -16);
        }
      }
      return { bearing: [-1.3, 0.66, 1.12], ringRadius: 0.32 };
    },
  },
  {
    code: 'APP_02', title: 'AGV Drive Hub', short: 'AGV HUB', accent: C.orange,
    build({ static: s, spin }) {
      s.cyl(1.6, 1.7, 0.12, C.steelDark, { p: [0, 0.06, 0] }, 20);
      const agv = spin((b) => {
        b.box(2.8, 0.55, 1.9, C.orange, { p: [0, 0.6, 0] });
        b.box(2.9, 0.16, 2.0, C.ink, { p: [0, 0.38, 0] });
        b.box(0.12, 0.3, 1.5, '#1d3b6e', { p: [1.42, 0.62, 0] });
        b.box(0.04, 0.12, 1.2, '#7ff0ff', { p: [1.47, 0.64, 0], glow: true });
        b.cyl(0.18, 0.2, 0.22, C.ink, { p: [1.0, 0.98, 0] }, 10); // lidar
        b.cyl(0.1, 0.1, 0.18, '#ffb000', { p: [-1.1, 1.0, 0.7], glow: true }, 8); // beacon
        // omni wheels
        for (const z of [-1.0, 1.0]) {
          b.cyl(0.36, 0.36, 0.26, C.ink, { p: [0, 0.44, z], r: [Math.PI / 2, 0, 0] }, 12);
          b.torus(0.33, 0.07, C.steel, { p: [0, 0.44, z * 1.06] }, 4, 12);
        }
        // swivel turret + cargo
        b.cyl(0.62, 0.62, 0.14, C.steel, { p: [0, 0.95, 0] }, 16);
        b.box(1.5, 0.08, 1.3, C.gunmetal, { p: [0, 1.06, 0] });
        b.box(1.0, 0.6, 0.8, C.nskBlue, { p: [-0.1, 1.4, 0] });
        b.box(1.02, 0.12, 0.82, C.white, { p: [-0.1, 1.4, 0] });
      }, [0, 0.12, 0], 'y', 0.5);
      agv.name = 'agv';
      return { bearing: [0, 1.07, 1.05], ringRadius: 0.3 };
    },
  },
  {
    code: 'APP_03', title: 'Robot Arm Cell', short: 'ROBOT ARM', accent: C.yellow,
    build({ body, static: s, animate }) {
      s.cyl(0.75, 0.9, 0.35, C.gunmetal, { p: [0, 0.18, 0] }, 14);
      s.box(0.9, 0.08, 0.9, C.hazard, { p: [1.5, 0.04, 0.5] });
      s.box(0.5, 0.4, 0.5, C.nskBlue, { p: [1.5, 0.28, 0.5] });
      const mk = (name, fn) => { const b = new PartBuilder(name); fn(b); return b.build(); };
      const base = new THREE.Group();
      base.position.y = 0.35;
      base.add(mk('base', (b) => {
        b.cyl(0.6, 0.65, 0.4, C.yellow, { p: [0, 0.2, 0] }, 14);
        b.box(0.5, 0.7, 0.6, C.yellow, { p: [0, 0.7, 0] });
      }));
      const shoulder = new THREE.Group();
      shoulder.position.y = 0.9;
      shoulder.add(mk('upper', (b) => {
        addBearing(b, 0.32, { p: [0, 0, 0.36] }, { seal: C.nskBlue });
        b.cyl(0.3, 0.3, 0.5, C.ink, { r: [Math.PI / 2, 0, 0] }, 12);
        b.box(0.38, 1.6, 0.42, C.yellow, { p: [0, 0.8, 0] });
      }));
      const elbow = new THREE.Group();
      elbow.position.y = 1.6;
      elbow.add(mk('fore', (b) => {
        b.cyl(0.24, 0.24, 0.5, C.ink, { r: [Math.PI / 2, 0, 0] }, 12);
        addBearing(b, 0.25, { p: [0, 0, 0.3] }, { seal: C.nskBlue });
        b.box(1.3, 0.3, 0.34, C.yellow, { p: [0.65, 0, 0] });
        b.cyl(0.16, 0.16, 0.3, C.ink, { p: [1.35, 0, 0], r: [0, 0, Math.PI / 2] }, 10);
        b.box(0.12, 0.35, 0.1, C.steel, { p: [1.55, -0.12, 0.1] });
        b.box(0.12, 0.35, 0.1, C.steel, { p: [1.55, -0.12, -0.1] });
      }));
      shoulder.add(elbow);
      base.add(shoulder);
      base.scale.setScalar(1.35);
      base.userData.dynamic = true;
      body.add(base);
      animate((t, k) => {
        base.rotation.y = Math.sin(t * 0.8 * k) * 0.9;
        shoulder.rotation.z = Math.sin(t * 1.1 * k) * 0.35 - 0.15;
        elbow.rotation.z = -0.6 + Math.sin(t * 1.4 * k + 1) * 0.4;
      });
      return { bearing: [0, 1.6, 0.78], ringRadius: 0.44 };
    },
  },
  {
    code: 'APP_04', title: 'CNC Spindle Bench', short: 'CNC SPINDLE', accent: C.purple,
    build({ static: s, spin }) {
      s.box(3.4, 0.7, 1.8, C.steelDark, { p: [0, 0.35, -0.2] });
      s.box(2.2, 0.12, 1.2, C.steel, { p: [0, 0.76, 0] });
      s.box(0.6, 0.3, 0.6, C.woodAmber, { p: [0, 0.97, 0] }); // workpiece
      for (const x of [-1.4, 1.4]) s.box(0.4, 2.6, 0.5, C.purple, { p: [x, 1.7, -0.8] });
      s.box(3.3, 0.5, 0.6, C.purple, { p: [0, 3.0, -0.8] });
      s.box(0.8, 1.0, 0.8, C.white, { p: [0, 2.5, -0.4] });
      s.box(0.82, 0.12, 0.82, C.ink, { p: [0, 2.0, -0.4] });
      // control panel
      s.box(0.7, 1.2, 0.5, C.gunmetal, { p: [1.85, 0.9, 0.9] });
      s.box(0.55, 0.4, 0.05, '#4ff7c8', { p: [1.85, 1.2, 1.16], glow: true });
      s.cyl(0.07, 0.07, 0.06, '#ff3b47', { p: [1.72, 0.75, 1.16], r: [Math.PI / 2, 0, 0], glow: true }, 8);
      s.cyl(0.07, 0.07, 0.06, '#3ee07b', { p: [1.98, 0.75, 1.16], r: [Math.PI / 2, 0, 0], glow: true }, 8);
      spin((b) => {
        b.cyl(0.26, 0.26, 0.7, C.steel, { p: [0, -0.35, 0] }, 12);
        b.cyl(0.18, 0.12, 0.25, C.gunmetal, { p: [0, -0.82, 0] }, 8);
        b.cone(0.06, 0.25, C.yellow, { p: [0, -1.06, 0], r: [Math.PI, 0, 0] }, 6);
        b.box(0.06, 0.6, 0.55, C.ink, { p: [0, -0.35, 0] });
      }, [0, 2.0, -0.1], 'y', 22);
      return { bearing: [0, 1.75, 0.0], ringRadius: 0.36, ringRotation: [Math.PI / 2, 0, 0] };
    },
  },
  {
    code: 'APP_05', title: 'Wind Turbine Gearbox', short: 'WIND GEARBOX', accent: C.green,
    build({ static: s, spin }) {
      s.cyl(0.35, 0.5, 2.4, C.white, { p: [0.6, 0.95, -0.4] }, 12);
      s.box(2.4, 0.9, 1.1, C.white, { p: [0.4, 2.3, -0.4] });
      s.box(2.42, 0.18, 1.12, C.green, { p: [0.4, 2.05, -0.4] });
      s.box(1.0, 1.0, 1.25, C.green, { p: [-0.35, 2.3, -0.4] }); // gearbox
      s.cyl(0.35, 0.45, 0.4, C.steel, { p: [-1.05, 2.3, -0.4], r: [0, 0, Math.PI / 2] }, 12);
      s.box(0.3, 0.3, 0.06, '#4ff7c8', { p: [0.9, 2.4, 0.18], glow: true });
      spin((b) => {
        b.cone(0.38, 0.6, C.white, { p: [0, 0, 0.3], r: [Math.PI / 2, 0, 0] }, 12);
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          const r = 1.05;
          b.box(0.34, 2.05, 0.08, C.white, { p: [Math.sin(a) * r, Math.cos(a) * r, 0.1], r: [0, 0.25, -a] });
          b.box(0.34, 0.3, 0.09, C.nskRed, { p: [Math.sin(a) * 1.7, Math.cos(a) * 1.7, 0.1], r: [0, 0.25, -a] });
        }
      }, [-1.35, 2.3, 0.3], 'z', 3.2);
      return { bearing: [-1.05, 2.3, 0.0], ringRadius: 0.42, ringRotation: [0, Math.PI / 2, 0] };
    },
  },
  {
    code: 'APP_06', title: 'Bullet Train Bogie', short: 'TRAIN BOGIE', accent: C.nskBlueLight,
    build({ static: s, spin }) {
      for (let x = -2.0; x <= 2.0; x += 0.5) s.box(0.22, 0.1, 2.4, '#6b4a2b', { p: [x, 0.05, 0] });
      for (const z of [-0.72, 0.72]) s.box(4.5, 0.12, 0.12, C.steel, { p: [0, 0.16, z] });
      // bogie frame
      s.box(2.8, 0.25, 0.2, C.gunmetal, { p: [0, 0.65, 0.95] });
      s.box(2.8, 0.25, 0.2, C.gunmetal, { p: [0, 0.65, -0.95] });
      s.box(0.4, 0.25, 2.0, C.gunmetal, { p: [0, 0.65, 0] });
      for (const z of [-0.95, 0.95]) {
        s.cyl(0.12, 0.12, 0.35, C.nskRed, { p: [-0.5, 0.95, z] }, 8); // springs
        s.cyl(0.12, 0.12, 0.35, C.nskRed, { p: [0.5, 0.95, z] }, 8);
      }
      // Shinkansen nose shell above
      s.box(3.0, 0.9, 0.9, C.white, { p: [-0.5, 1.6, -1.05] });
      s.sphere(1, C.white, { p: [1.0, 1.42, -1.05], s: [1.5, 0.72, 0.45] }, 12, 8);
      s.box(3.02, 0.16, 0.92, C.nskBlue, { p: [-0.5, 1.3, -1.05] });
      s.sphere(1, '#1d3b6e', { p: [1.6, 1.7, -1.05], s: [0.6, 0.25, 0.4] }, 10, 6);
      s.box(0.5, 0.3, 0.05, '#7ff0ff', { p: [-1.4, 1.7, -0.58], glow: true });
      s.box(0.5, 0.3, 0.05, '#7ff0ff', { p: [-0.6, 1.7, -0.58], glow: true });
      s.box(0.5, 0.3, 0.05, '#7ff0ff', { p: [0.2, 1.7, -0.58], glow: true });
      for (const x of [-0.9, 0.9]) {
        spin((b) => {
          b.cyl(0.07, 0.07, 1.9, C.steel, { r: [Math.PI / 2, 0, 0] }, 8);
          for (const z of [-0.72, 0.72]) {
            b.cyl(0.42, 0.42, 0.12, C.steelDark, { p: [0, 0, z], r: [Math.PI / 2, 0, 0] }, 14);
            b.cyl(0.46, 0.46, 0.04, C.ink, { p: [0, 0, z - Math.sign(z) * 0.07], r: [Math.PI / 2, 0, 0] }, 14);
          }
          b.box(0.5, 0.06, 1.2, C.steel, {});
        }, [x, 0.5, 0], 'z', -10);
        s.box(0.32, 0.32, 0.18, C.nskBlue, { p: [x, 0.5, 1.0] }); // journal box
      }
      return { bearing: [0.9, 0.5, 1.12], ringRadius: 0.24 };
    },
  },
  {
    code: 'APP_07', title: 'Medical Micro-Spindle', short: 'MEDICAL SPINDLE', accent: '#7cf2d5',
    build({ static: s, spin, animate, body }) {
      s.box(1.3, 1.5, 1.0, C.white, { p: [-1.2, 0.75, -0.6] });
      s.box(1.32, 0.12, 1.02, '#7cf2d5', { p: [-1.2, 1.2, -0.6] });
      s.box(1.0, 0.6, 0.05, '#0e2a44', { p: [-1.2, 1.9, -0.95], r: [-0.2, 0, 0] });
      s.box(0.9, 0.5, 0.02, '#7cf2d5', { p: [-1.2, 1.91, -0.91], r: [-0.2, 0, 0], glow: true });
      s.box(0.1, 0.5, 0.1, C.gunmetal, { p: [-1.2, 1.6, -1.0] });
      // arm with handpiece
      s.cyl(0.08, 0.08, 1.2, C.steel, { p: [-0.5, 1.6, -0.6], r: [0, 0, -0.9] }, 8);
      s.cyl(0.08, 0.08, 0.8, C.steel, { p: [0.2, 1.75, -0.4], r: [0, 0, 0.7] }, 8);
      s.cyl(0.09, 0.06, 0.6, C.white, { p: [0.45, 1.25, -0.3] }, 10);
      // tool tray
      s.box(1.2, 0.08, 0.8, C.steel, { p: [1.3, 0.95, 0.6] });
      s.cyl(0.06, 0.06, 0.9, C.steel, { p: [1.3, 0.5, 0.6] }, 8);
      for (let i = 0; i < 4; i++) s.cyl(0.03, 0.03, 0.5, i % 2 ? C.teal : C.white, { p: [0.95 + i * 0.22, 1.02, 0.6], r: [Math.PI / 2, 0, 0] }, 6);
      spin((b) => {
        b.cone(0.04, 0.22, C.yellow, { r: [Math.PI, 0, 0] }, 6);
        b.box(0.12, 0.02, 0.02, C.ink, { p: [0, 0.06, 0] });
      }, [0.45, 0.88, -0.3], 'y', 40);
      // magnified ceramic bearing hologram
      const holo = spin((b) => {
        addBearing(b, 0.45, {}, { outer: C.white, seal: '#7cf2d5' });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          b.sphere(0.09, '#e9fbff', { p: [Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0] }, 8, 6);
        }
      }, [0.9, 2.15, 0.2], 'z', 2.5);
      const base = new PartBuilder('holoBase');
      base.cyl(0.35, 0.45, 0.12, C.gunmetal, { p: [0.9, 1.4, 0.2] }, 12);
      base.cyl(0.08, 0.08, 0.3, C.steel, { p: [0.9, 1.25, 0.2] }, 6);
      base.cyl(0.3, 0.3, 0.02, '#7cf2d5', { p: [0.9, 1.47, 0.2], glow: true }, 12);
      body.add(base.build());
      s.box(0.5, 1.1, 0.5, C.white, { p: [0.9, 0.55, 0.2] });
      animate((t) => { holo.position.y = 2.15 + Math.sin(t * 2) * 0.08; });
      return { bearing: [0.9, 2.15, 0.2], ringRadius: 0.62 };
    },
  },
  {
    code: 'APP_08', title: 'Air-Taxi Propulsor', short: 'AIR-TAXI PROP', accent: '#c084fc',
    build({ static: s, spin }) {
      s.box(1.2, 0.3, 1.2, C.gunmetal, { p: [0, 0.15, -0.3] });
      s.box(0.3, 1.5, 0.3, C.steelDark, { p: [0, 1.0, -0.3] });
      // ducted fan
      s.torus(1.05, 0.2, '#2b2140', { p: [0, 2.0, -0.1] }, 8, 22);
      s.torus(1.05, 0.08, '#c084fc', { p: [0, 2.0, 0.09] }, 4, 22);
      s.cyl(0.32, 0.38, 0.7, C.white, { p: [0, 2.0, -0.35], r: [Math.PI / 2, 0, 0] }, 12);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        s.box(0.06, 0.9, 0.06, C.steelDark, { p: [Math.sin(a) * 0.62, 2.0 + Math.cos(a) * 0.62, -0.2], r: [0, 0, -a] });
      }
      spin((b) => {
        b.cone(0.18, 0.3, '#c084fc', { p: [0, 0, 0.12], r: [Math.PI / 2, 0, 0] }, 10);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          b.box(0.2, 0.85, 0.04, '#1a1a24', { p: [Math.sin(a) * 0.5, Math.cos(a) * 0.5, 0], r: [0, 0.5, -a] });
        }
      }, [0, 2.0, 0.05], 'z', 18);
      // side pod with small props
      s.sphere(1, C.white, { p: [1.6, 0.9, 0.3], s: [0.55, 0.45, 0.8] }, 12, 8);
      s.sphere(1, '#1d3b6e', { p: [1.6, 1.0, 0.75], s: [0.4, 0.25, 0.3] }, 10, 6);
      spin((b) => {
        b.box(1.0, 0.03, 0.12, '#1a1a24', {});
        b.box(0.12, 0.03, 1.0, '#1a1a24', {});
      }, [1.6, 1.45, 0.3], 'y', 20);
      s.cyl(0.03, 0.03, 0.25, C.steel, { p: [1.6, 1.33, 0.3] }, 6);
      return { bearing: [0, 2.0, 0.25], ringRadius: 0.4 };
    },
  },
  {
    code: 'APP_09', title: 'Jet Engine APU', short: 'JET APU', accent: C.nskRed,
    build({ static: s, spin, body }) {
      const tilt = 0.35;
      const engine = new THREE.Group();
      engine.rotation.y = tilt;
      engine.position.y = 1.15;
      body.add(engine);
      for (const x of [-0.9, 0.9]) s.box(0.3, 0.75, 1.3, C.gunmetal, { p: [x, 0.38, 0], r: [0, tilt, 0] });
      const e = new PartBuilder('engine');
      e.cyl(0.75, 0.75, 1.6, C.steel, { r: [0, 0, Math.PI / 2] }, 16);
      e.cyl(0.85, 0.78, 0.4, C.white, { p: [1.0, 0, 0], r: [0, 0, Math.PI / 2] }, 16);
      e.torus(0.84, 0.07, C.nskRed, { p: [1.2, 0, 0], r: [0, Math.PI / 2, 0] }, 5, 18);
      e.cyl(0.6, 0.75, 0.6, C.steelDark, { p: [-1.1, 0, 0], r: [0, 0, Math.PI / 2] }, 14);
      e.torus(0.76, 0.05, C.ink, { p: [-0.4, 0, 0], r: [0, Math.PI / 2, 0] }, 4, 16);
      e.torus(0.76, 0.05, C.ink, { p: [0.3, 0, 0], r: [0, Math.PI / 2, 0] }, 4, 16);
      e.cyl(0.45, 0.6, 0.06, '#ff7a1a', { p: [-1.42, 0, 0], r: [0, 0, Math.PI / 2], glow: true }, 14);
      e.cyl(0.28, 0.45, 0.07, '#ffd34a', { p: [-1.44, 0, 0], r: [0, 0, Math.PI / 2], glow: true }, 12);
      engine.add(e.build());
      spin((b) => {
        b.cone(0.22, 0.4, C.steel, { p: [0.15, 0, 0], r: [0, 0, -Math.PI / 2] }, 10);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          b.box(0.04, 0.6, 0.16, C.gunmetal, { p: [0, Math.cos(a) * 0.38, Math.sin(a) * 0.38], r: [a, 0.4, 0] });
        }
      }, [1.18, 0, 0], 'x', 25, engine);
      return { bearing: [1.35 * Math.cos(tilt), 1.15, -1.35 * Math.sin(tilt) + 0.5], ringRadius: 0.3, ringRotation: [0, Math.PI / 2 + tilt, 0] };
    },
  },
  {
    code: 'APP_10', title: 'HVAC Climate Compressor', short: 'HVAC COMPRESSOR', accent: '#8fd3ff',
    build({ static: s, spin }) {
      s.box(1.8, 2.0, 1.6, '#8fd3ff', { p: [1.1, 1.0, -0.6] });
      for (let i = 0; i < 6; i++) s.box(1.84, 0.06, 1.64, C.white, { p: [1.1, 0.3 + i * 0.3, -0.6] });
      s.cyl(0.7, 0.7, 0.12, C.gunmetal, { p: [1.1, 2.05, -0.6] }, 16);
      // compressor tank
      s.cyl(0.6, 0.6, 2.0, C.white, { p: [-0.9, 0.9, 0.3], r: [0, 0, Math.PI / 2] }, 14);
      s.sphere(0.6, C.white, { p: [-1.9, 0.9, 0.3] }, 12, 8);
      for (let i = 0; i < 4; i++) s.torus(0.62, 0.05, C.nskBlue, { p: [-1.5 + i * 0.4, 0.9, 0.3], r: [0, Math.PI / 2, 0] }, 4, 16);
      s.box(1.6, 0.3, 0.8, C.gunmetal, { p: [-0.9, 0.15, 0.3] });
      // pipes
      s.cyl(0.12, 0.12, 1.1, C.steel, { p: [0.15, 1.35, 0.0], r: [0, 0, Math.PI / 2] }, 8);
      s.torus(0.25, 0.12, C.steel, { p: [-0.1, 1.15, 0.0], r: [0, 0, 0] }, 6, 10);
      s.cyl(0.25, 0.25, 0.06, '#e9fbff', { p: [-0.6, 1.55, 0.6], r: [Math.PI / 2, 0, 0] }, 12);
      s.cyl(0.18, 0.18, 0.08, '#4ff7c8', { p: [-0.6, 1.55, 0.62], r: [Math.PI / 2, 0, 0], glow: true }, 12);
      spin((b) => {
        b.cyl(0.1, 0.1, 0.12, C.ink, {}, 8);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          b.box(0.22, 0.03, 0.62, C.gunmetal, { p: [Math.sin(a) * 0.32, 0, Math.cos(a) * 0.32], r: [0.4, a, 0] });
        }
      }, [1.1, 2.15, -0.6], 'y', 14);
      return { bearing: [-0.9, 0.9, 0.93], ringRadius: 0.36 };
    },
  },
];

export function createMachine(code) {
  const def = MACHINE_DEFS.find((d) => d.code === code);
  if (!def) throw new Error(`Unknown machine ${code}`);
  return bench(def);
}
