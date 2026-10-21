// Game rules and state for Plant Arena Repair. Pure JS with no Three.js or
// React, so it can be unit tested and stepped deterministically.
//
// Coordinates are world space: x east, z south (blueprint north = -z).

export const RULES = {
  sessionSeconds: 90,
  winRepairs: 8,
  failuresToLose: 3,
  integrityPerFailure: 34,
  backpackSize: 5,
  smashRange: 2.2, // metres from crate centre
  repairRange: 1.5, // metres from the machine's bench edge
  pickupRange: 1.3,
  playerSpeed: 7,
  playerRadius: 0.4,
  droneSpeed: 11,
  restrikeDelay: 2,
  savedSeconds: 2.5,
  repairLockSeconds: 0.6,
  scatterSpeed: 3.4,      // how hard a bearing is thrown clear of the crate
  scatterMin: 1.5,        // metres it must travel before it can be picked up
  scatterGravity: 11,
  scatterBounce: 0.42,
  benchHalf: [2.3, 1.8],
  crateRadius: 0.62,
  points: { repair: 250, perTimerSecond: 20, perIntegrity: 10 },
};

const DOORS = [
  { x: 0, z: -21.5 },
  { x: -31.5, z: 0 },
  { x: 31.5, z: 0 },
];

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

const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Distance from a point to the edge of an axis-aligned box (0 when inside).
function boxDistance(px, pz, cx, cz, hw, hd) {
  const dx = Math.max(Math.abs(px - cx) - hw, 0);
  const dz = Math.max(Math.abs(pz - cz) - hd, 0);
  return Math.hypot(dx, dz);
}

export function createArenaGame(layout, { seed = Date.now(), extraColliders = [], rules = {} } = {}) {
  const R = { ...RULES, ...rules };
  const rand = mulberry32(seed);
  const toWorld = ([x, z]) => ({ x, z: -z });
  const listeners = new Set();
  const events = [];
  const emit = (type, data = {}) => {
    const e = { type, ...data, t: state.elapsed };
    events.push(e);
    for (const l of listeners) l(e);
  };

  const state = {
    phase: 'ready',
    elapsed: 0,
    timeLeft: R.sessionSeconds,
    waveIndex: 0,
    waveRepairs: 0,
    repairs: 0,
    failures: 0,
    integrity: 100,
    bearings: 0,
    timerBonus: 0,
    score: 0,
    result: null,
    strikeCooldown: 0,
    repairLock: 0,
    action: { kind: 'none' },
    player: { ...toWorld(layout.arena.spawn), facing: Math.PI, speed01: 0 },
    machines: layout.machines.map((m) => ({ code: m.code, ...toWorld(m.pos), status: 'ok', timer: 0, timerMax: 0, savedLeft: 0, droneId: null })),
    crates: [
      ...layout.nskCrates.map((p, i) => ({ id: `nsk${i}`, index: i, nsk: true, ...toWorld(p), smashed: false })),
      ...layout.decoyCrates.map((p, i) => ({ id: `decoy${i}`, index: i, nsk: false, ...toWorld(p), smashed: false })),
    ],
    pickups: [],
    drones: [],
  };
  let nextDrone = 1;
  let nextPickup = 1;
  const waves = layout.waves;
  const wave = () => waves.at(state.waveIndex);
  const machine = (code) => state.machines.find((m) => m.code === code);

  const colliders = [
    ...state.machines.map((m) => ({ x: m.x, z: m.z + 0.15, hw: R.benchHalf[0] + 0.15, hd: R.benchHalf[1] + 0.35, machine: m.code })),
    ...extraColliders,
  ];
  const bounds = { minX: -layout.arena.width / 2 + 0.9, maxX: layout.arena.width / 2 - 0.9, minZ: -layout.arena.depth / 2 + 1.0, maxZ: layout.arena.depth / 2 - 0.6 };

  /* ---------------- strikes ---------------- */
  function activeStrikes() {
    return state.machines.filter((m) => m.status === 'attacked' || m.status === 'incoming').length;
  }

  function launchStrike() {
    const healthy = state.machines.filter((m) => m.status === 'ok');
    if (!healthy.length) return false;
    // Prefer machines away from the player so the player has to move.
    healthy.sort((a, b) => dist(b.x, b.z, state.player.x, state.player.z) - dist(a.x, a.z, state.player.x, state.player.z));
    const pool = healthy.slice(0, Math.max(3, Math.ceil(healthy.length / 2)));
    const target = pool.at(Math.floor(rand() * pool.length));
    const door = DOORS.reduce((best, d) => (dist(d.x, d.z, target.x, target.z) < dist(best.x, best.z, target.x, target.z) ? d : best));
    const drone = { id: nextDrone++, target: target.code, mode: 'inbound', x: door.x, z: door.z, y: 4.6 };
    state.drones.push(drone);
    target.status = 'incoming';
    target.droneId = drone.id;
    emit('droneLaunched', { drone: drone.id, machine: target.code });
    return true;
  }

  function topUpStrikes(dt) {
    state.strikeCooldown -= dt;
    if (state.strikeCooldown > 0) return;
    if (activeStrikes() < wave().drones && launchStrike()) state.strikeCooldown = 0.7;
  }

  function releaseDrone(m) {
    const d = state.drones.find((x) => x.id === m.droneId);
    if (d) {
      d.mode = 'fleeing';
      const door = DOORS.reduce((best, p) => (dist(p.x, p.z, d.x, d.z) < dist(best.x, best.z, d.x, d.z) ? p : best));
      d.fleeTo = door;
    }
    m.droneId = null;
  }

  /* ---------------- player ---------------- */
  function movePlayer(dt, input) {
    const p = state.player;
    let ix = input?.x ?? 0;
    let iz = input?.z ?? 0;
    const mag = Math.hypot(ix, iz);
    if (mag > 1) { ix /= mag; iz /= mag; }
    p.speed01 = Math.min(1, mag);
    if (mag < 0.05) return;
    const step = R.playerSpeed * dt;
    // Move each axis separately so the player slides along obstacles.
    const tryMove = (nx, nz) => {
      nx = Math.min(bounds.maxX, Math.max(bounds.minX, nx));
      nz = Math.min(bounds.maxZ, Math.max(bounds.minZ, nz));
      for (const c of colliders) {
        if (Math.abs(nx - c.x) < c.hw + R.playerRadius && Math.abs(nz - c.z) < c.hd + R.playerRadius) return false;
      }
      for (const c of state.crates) {
        if (c.smashed) continue;
        if (dist(nx, nz, c.x, c.z) < R.crateRadius + R.playerRadius) return false;
      }
      p.x = nx;
      p.z = nz;
      return true;
    };
    tryMove(p.x + ix * step, p.z);
    tryMove(p.x, p.z + iz * step);
    p.facing = Math.atan2(ix, iz);
  }

  /* ---------------- action button ---------------- */
  function computeAction() {
    const p = state.player;
    let best = null;
    for (const m of state.machines) {
      if (m.status !== 'attacked') continue;
      const d = boxDistance(p.x, p.z, m.x, m.z, R.benchHalf[0], R.benchHalf[1]);
      if (d <= R.repairRange && (!best || d < best.d)) best = { d, m };
    }
    if (best) {
      return state.bearings > 0 ? { kind: 'repair', machine: best.m.code } : { kind: 'needBearings', machine: best.m.code };
    }
    let crate = null;
    for (const c of state.crates) {
      // Decoys offer the button too. Finding out a crate is empty by smashing
      // it is the scavenger hunt; skipping them gave the answer away.
      if (c.smashed) continue;
      const d = dist(p.x, p.z, c.x, c.z);
      if (d <= R.smashRange && (!crate || d < crate.d)) crate = { d, c };
    }
    if (crate) return { kind: 'smash', crate: crate.c.id };
    return { kind: 'none' };
  }

  function act() {
    if (state.phase !== 'playing' || state.repairLock > 0) return false;
    const a = state.action;
    if (a.kind === 'smash') {
      const c = state.crates.find((x) => x.id === a.crate);
      c.smashed = true;

      if (c.nsk) {
        // Throw the bearing clear so it has to be chased down rather than
        // appearing under the player's feet.
        const angle = rand() * Math.PI * 2;
        const speed = R.scatterSpeed * (0.75 + rand() * 0.5);
        state.pickups.push({
          id: nextPickup++,
          x: c.x,
          z: c.z,
          y: 0.9,
          vx: Math.cos(angle) * speed,
          vz: Math.sin(angle) * speed,
          vy: 3.1,
          settled: false,
          travelled: 0,
          collected: false,
        });
      }

      emit('crateSmashed', { crate: c.id, index: c.index, x: c.x, z: c.z, nsk: c.nsk });
      if (!c.nsk) emit('crateEmpty', { crate: c.id, x: c.x, z: c.z });
      return true;
    }
    if (a.kind === 'repair') {
      const m = machine(a.machine);
      const timeLeft = Math.max(0, m.timer);
      state.bearings -= 1;
      state.repairs += 1;
      state.timerBonus += Math.round(timeLeft) * R.points.perTimerSecond;
      m.status = 'saved';
      m.savedLeft = R.savedSeconds;
      m.timer = 0;
      releaseDrone(m);
      state.repairLock = R.repairLockSeconds;
      emit('machineRepaired', { machine: m.code, timeLeft });
      if (state.repairs >= R.winRepairs) {
        finish('won', 'repairs');
        return true;
      }
      const w = wave();
      if (w.advanceAfterRepairs != null && state.waveIndex < waves.length - 1) {
        state.waveRepairs += 1;
        if (state.waveRepairs >= w.advanceAfterRepairs) {
          state.waveIndex += 1;
          state.waveRepairs = 0;
          state.strikeCooldown = 0.4;
          emit('waveStarted', { wave: state.waveIndex, name: wave().name, final: state.waveIndex === waves.length - 1 });
          return true;
        }
      }
      state.strikeCooldown = Math.max(state.strikeCooldown, R.restrikeDelay);
      return true;
    }
    if (a.kind === 'needBearings') emit('needBearings');
    return false;
  }

  /* ---------------- end ---------------- */
  function finish(result, reason) {
    if (state.phase !== 'playing') return;
    state.phase = result;
    state.result = { result, reason };
    state.score = state.repairs * R.points.repair + state.timerBonus + Math.max(0, state.integrity) * R.points.perIntegrity;
    for (const m of state.machines) if (m.droneId) releaseDrone(m);
    emit('gameOver', { result, reason, score: state.score });
  }

  /* ---------------- tick ---------------- */
  function update(dt, input) {
    if (state.phase !== 'playing') {
      // keep fleeing drones moving on the end screen
      stepDrones(dt);
      return;
    }
    state.elapsed += dt;
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    state.repairLock = Math.max(0, state.repairLock - dt);
    movePlayer(dt, input);

    // pickups: tumble out of the crate, then sit waiting to be walked over
    for (const pk of state.pickups) {
      if (pk.collected) continue;

      if (!pk.settled) {
        const px = pk.x;
        const pz = pk.z;
        pk.x += pk.vx * dt;
        pk.z += pk.vz * dt;
        pk.vy -= R.scatterGravity * dt;
        pk.y += pk.vy * dt;
        pk.travelled += dist(px, pz, pk.x, pk.z);

        // Keep it inside the arena and off the benches, or it lands unreachable.
        pk.x = clamp(pk.x, bounds.minX, bounds.maxX);
        pk.z = clamp(pk.z, bounds.minZ, bounds.maxZ);
        for (const col of colliders) {
          if (boxDistance(pk.x, pk.z, col.x, col.z, col.hw + 0.3, col.hd + 0.3) === 0) {
            pk.vx *= -0.5;
            pk.vz *= -0.5;
            pk.x = px;
            pk.z = pz;
            break;
          }
        }

        if (pk.y <= 0.22) {
          pk.y = 0.22;
          if (Math.abs(pk.vy) < 1.2 && pk.travelled >= R.scatterMin) {
            pk.settled = true;
            pk.vx = 0;
            pk.vz = 0;
            pk.vy = 0;
            emit('bearingLanded', { pickup: pk.id, x: pk.x, z: pk.z });
          } else {
            pk.vy = Math.abs(pk.vy) * R.scatterBounce;
            pk.vx *= 0.62;
            pk.vz *= 0.62;
          }
        }
        continue;
      }

      if (state.bearings >= R.backpackSize) continue;
      if (dist(state.player.x, state.player.z, pk.x, pk.z) <= R.pickupRange) {
        pk.collected = true;
        state.bearings += 1;
        emit('bearingCollected', { pickup: pk.id, bearings: state.bearings });
      }
    }

    stepDrones(dt);

    // machine timers
    for (const m of state.machines) {
      if (m.status === 'attacked') {
        m.timer -= dt;
        if (m.timer <= 0) {
          m.status = 'failed';
          m.timer = 0;
          releaseDrone(m);
          state.failures += 1;
          state.integrity = Math.max(0, state.integrity - R.integrityPerFailure);
          state.strikeCooldown = Math.max(state.strikeCooldown, R.restrikeDelay);
          emit('machineFailed', { machine: m.code, failures: state.failures });
          if (state.failures >= R.failuresToLose || state.integrity <= 0) return finish('lost', 'integrity');
        }
      } else if (m.status === 'saved') {
        m.savedLeft -= dt;
        if (m.savedLeft <= 0) m.status = 'ok';
      }
    }

    topUpStrikes(dt);
    if (state.timeLeft <= 0) return finish(state.integrity > 0 ? 'won' : 'lost', 'time');
    state.action = computeAction();
  }

  function stepDrones(dt) {
    for (const d of state.drones) {
      if (d.mode === 'inbound') {
        const m = machine(d.target);
        const tx = m.x + 1.6, tz = m.z - 1.2;
        const dd = dist(d.x, d.z, tx, tz);
        const step = R.droneSpeed * dt;
        if (dd <= step) {
          d.x = tx; d.z = tz; d.mode = 'attacking';
          if (m.status === 'incoming') {
            m.status = 'attacked';
            m.timerMax = wave().timer;
            m.timer = m.timerMax;
            emit('machineAttacked', { machine: m.code, timer: m.timer });
          }
        } else {
          d.x += ((tx - d.x) / dd) * step;
          d.z += ((tz - d.z) / dd) * step;
        }
      } else if (d.mode === 'fleeing') {
        const t = d.fleeTo;
        const dd = dist(d.x, d.z, t.x, t.z);
        const step = R.droneSpeed * 1.3 * dt;
        d.y += dt * 2;
        if (dd <= step) d.mode = 'gone';
        else { d.x += ((t.x - d.x) / dd) * step; d.z += ((t.z - d.z) / dd) * step; }
      }
    }
    state.drones = state.drones.filter((d) => d.mode !== 'gone');
  }

  return {
    state,
    rules: R,
    start() {
      if (state.phase !== 'ready') return;
      state.phase = 'playing';
      emit('waveStarted', { wave: 0, name: wave().name, final: false });
    },
    update,
    act,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    drainEvents() { return events.splice(0, events.length); },
    snapshot() {
      return {
        phase: state.phase,
        timeLeft: state.timeLeft,
        wave: state.waveIndex,
        waveCount: waves.length,
        waveName: wave().name,
        repairs: state.repairs,
        winRepairs: R.winRepairs,
        integrity: state.integrity,
        bearings: state.bearings,
        backpackSize: R.backpackSize,
        action: state.action,
        score: state.score,
        result: state.result,
        failures: state.failures,
        attacked: state.machines.filter((m) => m.status === 'attacked').map((m) => ({ code: m.code, timer: m.timer, timerMax: m.timerMax })),
      };
    },
  };
}
