# AGENTS.md

Frontend for a **TikTok Tower Defense** game — a 2D browser tower-defense game rendered with Pixi.js.

## Stack

- **React** (v19) — UI shell and dashboard (single page, no router)
- **Pixi.js** (v8) — rendering, sprites, sprite-sheet animations (owns the game simulation)
- **TypeScript** — strict, ES modules
- **Vite** — dev server + build
- **ESLint 9 + typescript-eslint + Prettier** — lint/format (no comments in code)

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — `lint` + `tsc` + `vite build` (must pass before finishing a task)
- `npm run lint` — ESLint

## Structure

- `src/main.tsx` — React bootstrap: renders `<GameProvider>`, `<Game />`, and `<Dashboard />`
- `src/game/` — game UI shell + engine bridge: `Game.tsx` (mounts/unmounts the engine), `GameEngine.ts` (all Pixi init, managers, game loop, public API), `GameContext.tsx`, `GameStore.ts`
- `src/dashboard/` — React dashboard (`Dashboard.tsx` + components) that talks to the game only through the `GameEngine` public API
- `src/constants/` — game data: tower spots (`spot.ts`), enemy configs, waypoints, waves, world size (`world.ts`, world is 2048×2048, scaled to fit screen)
- `src/entities/` — game objects: `Tower` (base), `TeslaTower` (chain lightning, range-based), `DendroTower` (homing bullets, first enemy, unlimited range), `FrostTower` (homing bullets), `Bullet` (base homing bullet), `FrostBullet`/`DendroBullet`, `Enemy`
- `src/managers/` — systems: `TowerManager`, `BulletManager`, `EnemyManager`, `WaveManager`, `MovementManager`
- `src/effects/` — visual effects (e.g. `LightningEffect`)
- `src/types/` — shared TS types (incl. `TowerType`)
- `public/assets/` — all game assets (PNG/SVG images, sprite-sheet `.json` atlases referencing a combined sheet PNG)

## GameEngine API

The dashboard must only use the public `GameEngine` API (`spawnTower`, `sellTower`, `upgradeTower`, `spawnEnemy`, `startWave`, `pause`, `resume`, `restart`, `setGameSpeed`, `getState`, `subscribe`) — never access managers directly. Game state is reactive: the engine emits a `GameState` snapshot to `subscribe` listeners (game loop throttled to ~5×/s).

## Conventions

- One class per file; inheritance for shared logic (`Tower` base → `TeslaTower`/`DendroTower`/`FrostTower`, `Bullet` base → `FrostBullet`/`DendroBullet`)
- Bullet mechanics live in `src/entities/Bullet.ts`: homing + target prediction, art assumed to point **up** (`ART_POINTS_UP = Math.PI / 2` rotation), configurable `scale` passed through `BulletManager` (`new BulletManager(texture, speed, BulletClass, scale)`)
- Towers own an optional `BulletManager`; `TowerManager` updates all bullet managers passed to its constructor
- Sprite-sheet atlases: `Assets.load("/assets/<name>/<name>.json")`, animation via `AnimatedSprite(sheet.animations["<animName>"])`, tower sprite `scale` typically `0.5`
- Coordinates are world units (2048×2048), rendered inside a `world` container scaled to the window
