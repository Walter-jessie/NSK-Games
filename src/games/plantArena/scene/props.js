// Set-dressing props that make the arena feel like a working plant floor.
import * as THREE from 'three';
import { PartBuilder } from './toon.js';

const STEEL = '#59606b';
const DARK = '#2a2e35';
const RUST = '#8a4a26';

export function workbench() {
  const b = new PartBuilder('workbench');
  b.box(2.4, 0.12, 1.0, '#4a4f58', { p: [0, 0.95, 0] });
  for (const x of [-1.1, 1.1]) for (const z of [-0.42, 0.42]) b.box(0.08, 0.9, 0.08, DARK, { p: [x, 0.45, z] });
  b.box(2.3, 0.06, 0.9, DARK, { p: [0, 0.3, 0] });
  b.box(2.4, 1.0, 0.06, '#3a3f47', { p: [0, 1.5, -0.47] }); // pegboard
  b.box(0.6, 0.3, 0.4, '#b23a2a', { p: [-0.7, 1.16, 0.1] }); // toolbox
  b.box(0.62, 0.06, 0.42, '#7a2219', { p: [-0.7, 1.33, 0.1] });
  b.cyl(0.14, 0.14, 0.28, '#7d8794', { p: [0.4, 1.15, 0.0] }, 8); // vice
  b.box(0.5, 0.08, 0.3, '#7d8794', { p: [0.4, 1.33, 0.0] });
  b.box(0.3, 0.03, 0.2, '#9fb8c9', { p: [0.95, 1.03, 0.2], glow: true }); // tablet screen
  b.torus(0.12, 0.04, '#b9c3d3', { p: [0.05, 1.05, 0.25], r: [Math.PI / 2, 0, 0] }, 4, 10); // loose bearing
  b.box(0.06, 0.4, 0.06, '#c0c6cf', { p: [-0.2, 1.6, -0.42] }); // hanging spanners
  b.box(0.06, 0.32, 0.06, '#c0c6cf', { p: [0.0, 1.62, -0.42] });
  b.box(0.06, 0.36, 0.06, '#c0c6cf', { p: [0.2, 1.6, -0.42] });
  return b.build({ outline: 1.3 });
}

export function barrel(color = '#2f4f7a') {
  const b = new PartBuilder('barrel');
  b.cyl(0.42, 0.42, 1.1, color, { p: [0, 0.55, 0] }, 12);
  b.torus(0.42, 0.03, DARK, { p: [0, 0.3, 0], r: [Math.PI / 2, 0, 0] }, 3, 12);
  b.torus(0.42, 0.03, DARK, { p: [0, 0.8, 0], r: [Math.PI / 2, 0, 0] }, 3, 12);
  b.cyl(0.38, 0.38, 0.02, '#20252c', { p: [0, 1.11, 0] }, 12);
  return b.build({ outline: 1.3 });
}

export function bearingPallet() {
  const b = new PartBuilder('bearingPallet');
  b.box(1.6, 0.16, 1.2, '#6b4a2b', { p: [0, 0.08, 0] });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    for (let k = 0; k < 3; k++) {
      b.torus(0.2, 0.08, '#aeb7c4', { p: [-0.5 + i * 0.5, 0.26 + k * 0.16, -0.25 + j * 0.5], r: [Math.PI / 2, 0, 0] }, 4, 10);
    }
  }
  return b.build({ outline: 1.3 });
}

export function shelfRack() {
  const b = new PartBuilder('shelfRack');
  for (const x of [-1.2, 1.2]) for (const z of [-0.4, 0.4]) b.box(0.08, 3.0, 0.08, '#c4581d', { p: [x, 1.5, z] });
  for (const y of [0.15, 1.1, 2.05, 2.9]) b.box(2.5, 0.06, 0.9, STEEL, { p: [0, y, 0] });
  b.box(0.8, 0.6, 0.7, '#6b3d1c', { p: [-0.6, 1.43, 0] });
  b.box(0.6, 0.5, 0.6, '#5a3216', { p: [0.5, 1.38, 0] });
  b.box(0.9, 0.55, 0.7, '#6b3d1c', { p: [0.2, 2.38, 0] });
  b.box(0.7, 0.5, 0.6, '#123a74', { p: [-0.5, 0.45, 0] });
  b.cyl(0.25, 0.25, 0.5, RUST, { p: [0.6, 0.45, 0] }, 8);
  return b.build({ outline: 1.3 });
}

export function toolCart() {
  const b = new PartBuilder('toolCart');
  b.box(0.9, 0.9, 0.55, '#b23a2a', { p: [0, 0.6, 0] });
  for (let i = 0; i < 4; i++) b.box(0.84, 0.03, 0.02, '#3a1010', { p: [0, 0.3 + i * 0.2, 0.28] });
  b.box(0.95, 0.05, 0.6, '#3a3f47', { p: [0, 1.08, 0] });
  for (const x of [-0.38, 0.38]) for (const z of [-0.2, 0.2]) b.cyl(0.07, 0.07, 0.05, DARK, { p: [x, 0.08, z], r: [Math.PI / 2, 0, 0] }, 8);
  return b.build({ outline: 1.3 });
}

// Placement of props around the arena edge (world space, north = -Z).
const FOOTPRINT = { workbench: [2.4, 1.0], shelfRack: [2.5, 0.9], barrel: [0.9, 0.9], toolCart: [0.95, 0.6], bearingPallet: [1.6, 1.2] };

// Returns axis-aligned colliders { x, z, hw, hd } for the player.
export function placeProps(group, W, D) {
  const colliders = [];
  const add = (obj, x, z, rotY = 0) => {
    obj.position.set(x, 0, z);
    obj.rotation.y = rotY;
    group.add(obj);
    const [w, d] = FOOTPRINT[obj.name] ?? [1, 1];
    const quarter = Math.abs(Math.sin(rotY)) > 0.7;
    colliders.push({ x, z, hw: (quarter ? d : w) / 2, hd: (quarter ? w : d) / 2 });
  };
  const zN = -D / 2 + 0.75;
  for (const x of [-25, -17, -8.5, 7.5, 19]) add(workbench(), x, zN);
  add(shelfRack(), -29.0, -15.5, Math.PI / 2);
  add(shelfRack(), 29.0, -9.5, -Math.PI / 2);
  add(workbench(), -29.2, 9.5, Math.PI / 2);
  add(workbench(), 29.2, 15.8, -Math.PI / 2);
  add(barrel(), -28.9, -9.6);
  add(barrel('#7a2f22'), -28.6, -8.7);
  add(barrel(), 28.8, 9.4);
  add(barrel('#7a2f22'), 28.9, 10.4);
  add(barrel('#3a5a2a'), 28.4, 3.9);
  add(toolCart(), -28.6, 15.6, Math.PI / 2);
  add(toolCart(), -10.5, zN + 1.4, 0.3);
  add(bearingPallet(), -20, 19.0);
  add(bearingPallet(), 7.2, 19.0, 0.2);
  add(bearingPallet(), 22, 19.0, -0.15);
  add(barrel(), -6.2, 19.2);
  return colliders;
}
