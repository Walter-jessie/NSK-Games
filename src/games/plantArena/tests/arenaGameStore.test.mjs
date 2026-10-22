// Run from the project root: node src/games/plantArena/tests/arenaGameStore.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createArenaGame } from '../engine/arenaGameStore.js';

const layout = JSON.parse(readFileSync(new URL('../data/factoryLayout.json', import.meta.url)));
const step = (g, secs, input) => { for (let i = 0; i < secs * 30; i++) g.update(1 / 30, input); };
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok -', name); };
// Every run now opens with RULES.firstWaveDelay seconds of grace in which no
// drone launches and the session clock is held, so tests that wait for a
// strike have to step past it.
const GRACE = 5;

test('no drone launches during the opening grace', () => {
  const g = createArenaGame(layout, { seed: 1 });
  g.start();
  step(g, GRACE - 0.5);
  assert.equal(g.state.drones.length, 0);
  assert.equal(g.state.timeLeft, g.rules.sessionSeconds, 'clock is held during grace');
});

test('wave 1 sends exactly one drone that starts a 30 s timer on arrival', () => {
  const g = createArenaGame(layout, { seed: 1 });
  g.start();
  step(g, GRACE + 6);
  const attacked = g.state.machines.filter((m) => m.status === 'attacked');
  assert.equal(attacked.length, 1);
  assert.equal(attacked[0].timerMax, 30);
});

test('an unrepaired machine fails, costs 34% and gets replaced by a new strike', () => {
  const g = createArenaGame(layout, { seed: 2 });
  g.start();
  step(g, GRACE + 40);
  assert.equal(g.state.failures, 1);
  assert.equal(g.state.integrity, 66);
  assert.ok(g.state.machines.some((m) => m.status === 'attacked' || m.status === 'incoming'));
});

test('three failures lose the game', () => {
  const g = createArenaGame(layout, { seed: 3 });
  g.start();
  step(g, 118);
  assert.equal(g.state.phase, 'lost');
  assert.equal(g.state.failures, 3);
});

test('smash crate, collect bearing, repair scores and counts toward the wave', () => {
  const g = createArenaGame(layout, { seed: 4 });
  g.start();
  step(g, GRACE + 6);
  const nsk = g.state.crates.find((c) => c.nsk);
  g.state.player.x = nsk.x + 1.2; g.state.player.z = nsk.z;
  step(g, 0.1);
  assert.equal(g.state.action.kind, 'smash');
  g.act();
  // The bearing is thrown clear, so it has to be chased down.
  step(g, 2);
  const pk = g.state.pickups[0];
  assert.ok(pk.settled, 'bearing should have come to rest');
  assert.equal(g.state.bearings, 0, 'not collected until the player reaches it');
  g.state.player.x = pk.x; g.state.player.z = pk.z;
  step(g, 0.1);
  assert.equal(g.state.bearings, 1);
  const target = g.state.machines.find((m) => m.status === 'attacked');
  g.state.player.x = target.x; g.state.player.z = target.z + 2.6;
  step(g, 0.1);
  assert.equal(g.state.action.kind, 'repair');
  g.act();
  assert.equal(g.state.repairs, 1);
  // Wave 1 advances after two repairs now, so one repair leaves us in it.
  assert.equal(g.state.waveIndex, 0);
  assert.equal(g.state.waveRepairs, 1);
  assert.ok(g.state.timerBonus > 0);
  step(g, 10);
  assert.equal(g.state.machines.filter((m) => m.status === 'attacked').length, 1);
});

test('near an attacked machine with no bearings shows NEED BEARINGS', () => {
  const g = createArenaGame(layout, { seed: 5 });
  g.start();
  step(g, GRACE + 6);
  const target = g.state.machines.find((m) => m.status === 'attacked');
  g.state.player.x = target.x; g.state.player.z = target.z + 2.6;
  step(g, 0.1);
  assert.equal(g.state.action.kind, 'needBearings');
});

test('surviving the full session with integrity left is a win', () => {
  const g = createArenaGame(layout, { seed: 6, rules: { integrityPerFailure: 10, failuresToLose: 99 } });
  g.start();
  step(g, GRACE + 121);
  assert.equal(g.state.phase, 'won');
  assert.equal(g.state.result.reason, 'time');
});

test('player cannot walk through a machine bench', () => {
  const g = createArenaGame(layout, { seed: 7 });
  g.start();
  const m = g.state.machines.at(3);
  g.state.player.x = m.x; g.state.player.z = m.z + 3.2;
  step(g, 2, { x: 0, z: -1 });
  assert.ok(g.state.player.z > m.z + 1.9, `player z ${g.state.player.z}`);
});

test('backpack holds at most 5 bearings', () => {
  const g = createArenaGame(layout, { seed: 8 });
  g.start();
  for (const c of g.state.crates.filter((x) => x.nsk).slice(0, 7)) {
    g.state.player.x = c.x + 1.2; g.state.player.z = c.z;
    step(g, 0.1); g.act();
    // Each bearing is thrown clear, so let it land and then walk onto it.
    step(g, 2);
    const pk = g.state.pickups.find((k) => !k.collected && k.settled);
    if (pk) { g.state.player.x = pk.x; g.state.player.z = pk.z; step(g, 0.1); }
  }
  assert.equal(g.state.bearings, 5);
});

test('a decoy crate can be smashed and gives nothing', () => {
  const g = createArenaGame(layout, { seed: 7 });
  g.start();
  step(g, 6);
  const decoy = g.state.crates.find((c) => !c.nsk);
  g.state.player.x = decoy.x + 1.2; g.state.player.z = decoy.z;
  step(g, 0.1);
  assert.equal(g.state.action.kind, 'smash');
  const empties = [];
  g.subscribe((e) => { if (e.type === 'crateEmpty') empties.push(e); });
  g.act();
  step(g, 2);
  assert.ok(decoy.smashed);
  assert.equal(empties.length, 1);
  assert.equal(g.state.pickups.length, 0);
  assert.equal(g.state.bearings, 0);
});

test('a smashed bearing lands clear of the crate', () => {
  const g = createArenaGame(layout, { seed: 11 });
  g.start();
  step(g, 6);
  const nsk = g.state.crates.find((c) => c.nsk);
  g.state.player.x = nsk.x + 1.2; g.state.player.z = nsk.z;
  step(g, 0.1);
  g.act();
  step(g, 3);
  const pk = g.state.pickups[0];
  assert.ok(pk.settled);
  assert.ok(Math.hypot(pk.x - nsk.x, pk.z - nsk.z) >= 1.0, 'should not land on the crate');
  assert.ok(pk.x >= -30 && pk.x <= 30 && pk.z >= -20 && pk.z <= 20, 'must stay inside the arena');
});

test('every thrown bearing settles and becomes collectable', () => {
  // A bearing that never settles can never be picked up, which strands the
  // run. Check it across seeds and crates, not just one lucky throw.
  for (const seed of [2, 5, 13, 21, 34]) {
    const g = createArenaGame(layout, { seed });
    g.start();
    step(g, 6);
    for (const c of g.state.crates.filter((x) => x.nsk).slice(0, 4)) {
      g.state.player.x = c.x + 1.2; g.state.player.z = c.z;
      step(g, 0.1); g.act();
    }
    step(g, 2.5);
    for (const pk of g.state.pickups) {
      assert.ok(pk.settled, `seed ${seed}: pickup ${pk.id} never settled`);
      assert.ok(pk.x >= -30 && pk.x <= 30 && pk.z >= -20 && pk.z <= 20, 'inside the arena');
    }
  }
});

console.log(`${passed} tests passed`);
