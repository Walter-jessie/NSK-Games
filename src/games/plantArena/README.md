# Game 2: NSK Plant Arena Repair

A self-contained landscape 3D game for the NSK Bearing Challenge app. Rogue drones attack the 10 NSK test machines; the player smashes NSK crates for bearings and repairs red machines before their timers run out. 120 seconds, 6 repairs wins, 3 failed machines loses. The first 5 seconds are grace: no drones, and the clock is held.

Everything lives in this one folder. It has no backend code and no network calls: it hands the final score to your app through a callback, and your app decides where it goes.

## What's inside

```
plantArena/
  index.js                 default export = the game page
  PlantArenaPage.jsx       React page: canvas, HUD, start + results screens
  engine/
    arenaGameStore.js      game rules (pure JS, no React/Three): waves, timers, integrity, score
    GameEngine.js          Three.js renderer, camera, input, effects, on-screen markers
  scene/                   3D models built in code (machines, worker, drones, crates, props, lights)
    quality.js             low / high quality tiers + automatic downgrade on slow phones
  ui/                      HUD, mini-map, joystick, action button, plantArena.css (all classes start with pa-)
  audio/audioService.js    small synthesized sounds (no audio files)
  data/factoryLayout.json  machine, crate and wave layout (edit to move things around)
  tests/arenaGameStore.test.mjs
```

## Merge steps

1. **Copy the folder** to `NSK-Bearing-Challenge/src/games/plantArena/` (create `src/games/` if it does not exist).

2. **Install Three.js** in `NSK-Bearing-Challenge`:
   ```
   npm install three@^0.186.1
   ```
   React 18 or newer is already assumed. No other packages are needed.

3. **Add a route.** Lazy-load it so Three.js only downloads when someone opens Game 2. With React Router v6:
   ```jsx
   // App.jsx
   import { lazy, Suspense } from 'react';
   import { useNavigate } from 'react-router-dom';
   const PlantArenaPage = lazy(() => import('./games/plantArena'));

   function PlantArenaRoute() {
     const navigate = useNavigate();
     const employeeId = /* the logged-in employee id you already use for Game 1 */;
     return (
       <Suspense fallback={null}>
         <PlantArenaPage
           employeeId={employeeId}
           onExit={() => navigate('/')}               // or your hub route
           onSubmitScore={(r) => submitScore(/* see step 5 */)}
         />
       </Suspense>
     );
   }

   // inside <Routes>
   <Route path="/game/plant-arena" element={<PlantArenaRoute />} />
   ```
   If the hub switches screens with state instead of routes, render `<PlantArenaPage ... onExit={() => setScreen('hub')} />` in the same way.

4. **Add the hub card** pointing at `/game/plant-arena` (title "Plant Arena Repair", subtitle "Fix the machines before the drones win").

5. **Send the score to the leaderboard you already have.** The game calls `onSubmitScore` once per finished run with:
   ```js
   {
     game: 'plant-arena-repair',
     score: 3860,          // repairs x 250 + 20 per second left + 10 per integrity %
     repairs: 8,
     integrity: 66,        // plant integrity % at the end
     timeLeft: 52,         // seconds
     result: 'won',        // 'won' | 'lost'
     reason: 'repairs',    // 'repairs' | 'time' | 'integrity'
     employeeId: 'NSK-0420',
   }
   ```
   Map it onto the same `submitScore` call Game 1 uses (for example `submitScore({ employeeId: r.employeeId, game: r.game, score: r.score })`). If your leaderboard table has no way to tell games apart yet, that needs a backend change, so leave it until you decide how you want it.

6. **Run it**: `npm run dev`, open `/game/plant-arena`, tap START MISSION.

## Phones and PWA

- The game is landscape. On phones, START MISSION goes fullscreen and locks to landscape where the browser allows it; in portrait it shows "Rotate your phone".
- Add `viewport-fit=cover` to the viewport meta tag in `index.html` so the HUD respects notches:
  `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`
- Quality is picked automatically: budget phones (Mali-G52 / Adreno 610 class, or 4 GB RAM / 4 cores) get the low tier (no real-time shadows, no point lights, 1x resolution). A high-tier device that can't hold 40 fps in the first 4 seconds drops to low by itself. Force a tier with the `quality="low"` prop or `?quality=low` in the URL.
- Bundle size: the lazy chunk is about 630 kB (about 165 kB gzipped), mostly Three.js. That is under Workbox's default 2 MB precache limit, so `vite-plugin-pwa` will cache it for offline play without config changes.
- The game pauses when the app goes to the background and frees its GPU memory when you leave the page.

## Props

| prop | default | what it does |
| --- | --- | --- |
| `employeeId` | `'NSK-GUEST'` | shown top-left and passed back with the score |
| `onSubmitScore` | none | called once per finished run (step 5) |
| `onExit` | none | BACK / EXIT buttons; hidden if not given |
| `quality` | auto | `'low'` or `'high'` |
| `seed` | random | same seed = same drone pattern (testing) |
| `autoplay` | `false` | a simple bot plays by itself (testing / attract screen) |

## Tuning and changes

- Difficulty: `RULES` at the top of `engine/arenaGameStore.js` (session length, repairs to win, failures to lose, timers, player and drone speed, points).
- Waves (how many drones, how long each machine timer lasts): `waves` in `data/factoryLayout.json`.
- Machine, crate and prop positions: `data/factoryLayout.json`.
- Models: each machine is built in `scene/machines.js` (`MACHINE_DEFS`), the worker and drones in `scene/characters.js`. Swapping in a GLB later only needs `createMachine` / `createWorker` to return a group with the same methods.
- Tests: `node src/games/plantArena/tests/arenaGameStore.test.mjs` (8 rule tests, no browser needed).
- Keyboard on desktop: WASD or arrows to move, Space / E / Enter to act.
