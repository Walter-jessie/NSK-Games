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
 */
export const BEARING_PARTS = [
  { name: 'Inner Casing', icon: '⚙️', type: 'Bore & Raceway', slot: 1, model: true, kind: 'part' },
  { name: 'Bearing Balls', icon: '🔵', type: 'SUJ2 Spheres', slot: 2, model: true, kind: 'part' },
  { name: 'Outer Casing', icon: '🔩', type: 'Hardened Raceway', slot: 3, model: true, kind: 'part' },
  { name: 'Retainer Cage', icon: '🛡️', type: 'Steel Separator', slot: 4, model: true, kind: 'part' },
  { name: 'Grinding', icon: '✨', type: 'Raceway Finishing', slot: 5, model: false, kind: 'process' },
  { name: 'Synthetic Grease', icon: '🧴', type: 'Polyurea Lube', slot: 6, model: false, kind: 'part' },
  { name: 'Dust Shield', icon: '🛞', type: 'Labyrinth Shield', slot: 7, model: false, kind: 'part' },
  { name: 'Retainer Rivets', icon: '📎', type: 'Cage Alignment', slot: 8, model: false, kind: 'part' },
  { name: 'Snap Ring', icon: '💍', type: 'Axial Lock', slot: 9, model: false, kind: 'part' },
  { name: 'Bearing Housing', icon: '🏗️', type: 'Rigid Cast Support', slot: 10, model: false, kind: 'part' },
];

export default BEARING_PARTS;
