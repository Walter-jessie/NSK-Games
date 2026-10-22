/**
 * The ten things a player collects in Bearing Runner, one per correct answer.
 *
 * Single source for both the runner HUD and the results gallery, which used to
 * keep separate lists and drifted apart.
 *
 * Slots 1-4 are the physical parts and are the only ones the 3D viewer draws:
 * the bearing is complete once the cage goes on. Slots 5-10 are the shop-floor
 * steps and fittings that follow; they score and they fill the gallery, but
 * they add no geometry. The quality they represent shows up instead in the
 * speed and vibration readings on the results page.
 *
 * `kind` drives the badge the runner pops when the item is collected, so a
 * process is not announced as a part.
 *
 * An entry carries either `image` or `icon`, never both. `image` is a rendered
 * PNG in public/images/parts, used wherever a glyph could not carry the part:
 * the four real components, the shield and snap ring whose nearest emoji were
 * a tyre and a wedding ring, the grinder, and the rivets. Only the grease and
 * the housing still ride on an emoji, so both render sites must handle either.
 */
export const BEARING_PARTS = [
  { name: 'Inner Casing', image: './images/parts/01_inner-casing.png', type: 'Bore & Raceway', slot: 1, model: true, kind: 'part' },
  { name: 'Bearing Balls', image: './images/parts/02_bearing-balls.png', type: 'SUJ2 Spheres', slot: 2, model: true, kind: 'part' },
  { name: 'Outer Casing', image: './images/parts/03_outer-casing.png', type: 'Hardened Raceway', slot: 3, model: true, kind: 'part' },
  { name: 'Retainer Cage', image: './images/parts/04_retainer-cage.png', type: 'Steel Separator', slot: 4, model: true, kind: 'part' },
  { name: 'Grinding', image: './images/parts/05_grinding.png', type: 'Raceway Finishing', slot: 5, model: false, kind: 'process' },
  { name: 'Synthetic Grease', icon: '🧴', type: 'Polyurea Lube', slot: 6, model: false, kind: 'part' },
  { name: 'Dust Shield', image: './images/parts/07_dust-shield.png', type: 'Labyrinth Shield', slot: 7, model: false, kind: 'part' },
  { name: 'Retainer Rivets', image: './images/parts/08_retainer-rivets.png', type: 'Cage Alignment', slot: 8, model: false, kind: 'part' },
  { name: 'Snap Ring', image: './images/parts/09_snap-ring.png', type: 'Axial Lock', slot: 9, model: false, kind: 'part' },
  { name: 'Bearing Housing', icon: '🏗️', type: 'Rigid Cast Support', slot: 10, model: false, kind: 'part' },
];

export default BEARING_PARTS;
