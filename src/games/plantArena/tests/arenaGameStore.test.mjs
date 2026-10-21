// Run from the project root: node src/games/plantArena/tests/arenaGameStore.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createArenaGame } from '../engine/arenaGameStore.js';

const layout = JSON.parse(readFileSync(new URL('../data/factoryLayout.json', import.meta.url)));
const step = (g, secs, input) => { for (let i = 0; i < secs * 30; i++) g.update(1 / 30, input); };
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok -', name); };

test('wave 1 sends exactly one drone that starts a 20 s timer on arrival', () => {
  const g = createArenaGame(layout, { seed: 1 });
  g.start();
  step(g, 6);
  const attacked = g.state.machines.filter((m) => m.status === 'attacked');
  assert.equal(attacked.length, 1);
  assert.equal(attacked[0].timerMax, 20);
});

test('an unrepaired machine fails, costs 34% and gets replaced by a new strike', () => {
  const g = createArenaGame(layout, { seed: 2 });
  g.start();
  step(g, 30);
  assert.equal(g.state.failures, 1);
  assert.equal(g.state.integrity, 66);
  assert.ok(g.state.machines.some((m) => m.status === 'attacked' || m.status === 'incoming'));
});

test('three failures lose the game', () => {
  const g = createArenaGame(layout, { seed: 3 });
  g.start();
  step(g, 89);
  assert.equal(g.state.phase, 'lost');
  assert.equal(g.state.failures, 3);
});

test('smash crate, collect bearing, repair advances the wave and scores', () => {
  const g = createArenaGame(layout, { seed: 4 });
  g.start();
  step(g, 6);
  const nsk = g.state.crates.find((c) => c.nsk);
  g.state.player.x = nsk.x + 1.2; g.state.player.z = nsk.z;
  step(g, 0.1);
  assert.equal(g.state.action.kind, 'smash');
  g.act();
  step(g, 0.1);
  assert.equal(g.state.bearings, 1);
  const target = g.state.machines.find((m) => m.status === 'attacked');
  g.state.player.x = target.x; g.state.player.z = target.z + 2.6;
  step(g, 0.1);
  assert.equal(g.state.action.kind, 'repair');
  g.act();
  assert.equal(g.state.repairs, 1);
  assert.equal(g.state.waveIndex, 1);
  assert.ok(g.state.timerBonus > 0);
  step(g, 8);
  assert.equal(g.state.machines.filter((m) => m.status === 'attacked').length, 2);
});

test('near an attacked machine with no bearings shows NEED BEARINGS', () => {
  const g = createArenaGame(layout, { seed: 5 });
  g.start();
  step(g, 6);
  const target = g.state.machines.find((m) => m.status === 'attacked');
  g.state.player.x = target.x; g.state.player.z = target.z + 2.6;
  step(g, 0.1);
  assert.equal(g.state.action.kind, 'needBearings');
});

test('surviving 90 s with integrity left is a win', () => {
  const g = createArenaGame(layout, { seed: 6, rules: { integrityPerFailure: 10, failuresToLose: 99 } });
  g.start();
  step(g, 91);
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
    step(g, 0.1); g.act(); step(g, 0.1);
  }
  assert.equal(g.state.bearings, 5);
});

console.log(`${passed} tests passed`);
