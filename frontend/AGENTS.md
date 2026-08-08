# AGENTS.md

Frontend for a **TikTok Tower Defense** game — a 2D browser tower-defense game rendered with Pixi.js.

## Stack

- **React** (v19) — UI shell and dashboard (no routing library; mode chosen from the URL query)
- **Pixi.js** (v8) — rendering, sprites, sprite-sheet animations (owns the game simulation)
- **TypeScript** — strict, ES modules
- **Vite** — dev server + build
- **ESLint 9 + typescript-eslint + Prettier** — lint/format (no comments in code)

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — `lint` + `tsc` + `vite build` (must pass before finishing a task)
- `npm run lint` — ESLint

## Modes

The app runs in three modes selected by URL (see `src/app/App.tsx` and `src/main.tsx`):

- `?mode=game` — standalone PixiJS game for OBS Browser Source. No React game state; `GameView`
  mounts `GameRuntime` once. Optional `?game_width`/`?game_height` (or `width`/`height`) fix the
  canvas size. Wrapped in `.mode-game` styles (fullscreen, no borders).
- `?mode=dashboard` — dashboard only, no PixiJS instance. `DashboardView` creates its own
  `DashboardSocketClient` and drives the remote game via `RemoteDashboardController`.
- no mode (dev) — legacy combined layout: `GameProvider` + `GameView` + `Dashboard` with a
  `LocalDashboardController`, inside `DevLayout`.

## Structure

- `src/main.tsx` — React bootstrap: picks `AppMode` from the URL, renders `GameProvider` only in dev mode
- `src/app/` — `App.tsx` (mode router: `GameView` | `DashboardView` | `DevLayout`)
- `src/game/` — engine + mount layers: `GameRuntime.ts` (owns `GameEngine` + `GameSocketClient`),
  `GameView.tsx` (React wrapper), `GameEngine.ts` (all Pixi init, managers, game loop, public API),
  `GameEventRouter.ts` (routes normalized server events), `GameCommandRouter.ts` (routes dashboard
  `GameCommand`s), `GameContext.tsx`, `GameStore.ts`
- `src/network/` — WebSocket layer: `GameSocketClient.ts` (role `game`; sends `game_state`,
  `start_game`/`finish_game` control, receives normalized events + `game_command`s),
  `DashboardSocketClient.ts` (role `dashboard`; sends `game_command`s + `simulate_tiktok_event`s,
  receives `game_state`, `clients`, `event_log`, `gift_catalog`), `getWsUrl.ts`, `types.ts`
  (roles, `GameCommand` union, `SimulatedTiktokEvent`, `EventLogEntry`), `guards.ts` (type guards)
- `src/dashboard/` — React dashboard: `DashboardView.tsx` (remote mode wrapper),
  `useDashboardSocket.ts` (hook owning the socket + connection/state/eventLog/giftCatalog state),
  `Dashboard.tsx` (presentational; takes `controller`/`state`/`connection`/`liveFlow` props),
  `controllers.ts` (`DashboardController` interface, `LocalDashboardController`,
  `RemoteDashboardController`), `components/` (ConnectionPanel, EnemyControls, LiveFlowPanel, etc.)
- `src/constants/` — game data: tower spots (`spot.ts`), enemy configs, waypoints, waves, world size (`world.ts`, world is 2048×2048, scaled to fit screen)
- `src/entities/` — game objects: `Tower` (base), `TeslaTower` (chain lightning, range-based), `DendroTower` (homing bullets, first enemy, unlimited range), `FrostTower` (homing bullets), `Bullet` (base homing bullet), `FrostBullet`/`DendroBullet`, `Enemy`
- `src/managers/` — systems: `TowerManager`, `BulletManager`, `EnemyManager`, `WaveManager`, `MovementManager`
- `src/effects/` — visual effects (e.g. `LightningEffect`)
- `src/types/` — shared TS types (incl. `TowerType`, `GameState`, `GameStateListener`)
- `public/assets/` — all game assets (PNG/SVG images, sprite-sheet `.json` atlases referencing a combined sheet PNG)

## GameEngine API

The dashboard must only use the public `GameEngine` API (`spawnTower`, `sellTower`, `upgradeTower`, `spawnEnemy`, `startWave`, `pause`, `resume`, `restart`, `setGameSpeed`, `getState`, `subscribe`) — never access managers directly. Game state is reactive: the engine emits a `GameState` snapshot to `subscribe` listeners (game loop throttled to ~5×/s).

## Conventions

- One class per file; inheritance for shared logic (`Tower` base → `TeslaTower`/`DendroTower`/`FrostTower`, `Bullet` base → `FrostBullet`/`DendroBullet`)
- Bullet mechanics live in `src/entities/Bullet.ts`: homing + target prediction, art assumed to point **up** (`ART_POINTS_UP = Math.PI / 2` rotation), configurable `scale` passed through `BulletManager` (`new BulletManager(texture, speed, BulletClass, scale)`)
- Towers own an optional `BulletManager`; `TowerManager` updates all bullet managers passed to its constructor
- Sprite-sheet atlases: `Assets.load("/assets/<name>/<name>.json")`, animation via `AnimatedSprite(sheet.animations["<animName>"])`, tower sprite `scale` typically `0.5`
- Coordinates are world units (2048×2048), rendered inside a `world` container scaled to the window
