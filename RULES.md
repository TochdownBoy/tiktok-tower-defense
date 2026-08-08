# RULES — TikTok Tower Defense (frontend)

This file documents the **actual implemented behavior** of the frontend game.

## Backend integration status

The backend gift-processing layer and the frontend WebSocket integration are **implemented**.

The frontend connects to the backend WebSocket server through
`GameSocketClient` (`frontend/src/network/GameSocketClient.ts`). It translates incoming
normalized events into calls to the public game API methods without containing game rules itself.

The data flow is:

```text
TikTok event
    ↓
Backend gift handler
    ↓
WebSocket event
    ↓
Frontend GameSocketClient
    ↓
GameEventRouter → public game API method
    ↓
Game state and PixiJS scene
```

The bottom three layers exist today: `GameSocketClient` → `GameEventRouter` → public game API
methods → game state + PixiJS scene.

The `GameSocketClient` connects to `VITE_WS_URL` (default `ws://<host>:3000`), watches the
engine's `GameState.isActive` transitions, and sends `{ type: "start_game" }` /
`{ type: "finish_game" }` control packets to the backend so it can activate and clear its
runtime gift state. It auto-reconnects and re-syncs on reconnect.

## Frontend modes and WebSocket roles

The frontend registers with the backend under a **role** (protocol in `frontend/src/network/types.ts`):

- `?mode=game` — registers as role `game`. Only one game client is allowed; a new one replaces the
  old. Receives normalized `ServerToGameEvent`s and dashboard `game_command`s. Sends `game_state`
  snapshots and `start_game`/`finish_game` control packets. `GameView` mounts `GameRuntime`, which
  owns a single `GameEngine` + `GameSocketClient`; it never needs React game state.
- `?mode=dashboard` — registers as role `dashboard`. Any number allowed. Never creates a PixiJS
  instance. `DashboardView` owns its own `DashboardSocketClient` and drives the game remotely
  through `RemoteDashboardController`, which sends `{ type: "game_command", command, payload? }`
  packets. The backend routes `game_command`s to the game client, and `GameSocketClient` dispatches
  them via `GameCommandRouter` (`frontend/src/game/GameCommandRouter.ts`) onto the public API.
  Commands: `start_game`, `finish_game`, `start_next_wave`, `place_tower`, `sell_tower`,
  `upgrade_tower`, `spawn_enemy`, `clear_enemies`, `pause`, `resume`, `restart`, `set_speed`.
- no mode (dev) — combined layout; the `Dashboard` uses `LocalDashboardController`, which calls the
  same engine in-process through `GameStore` (no WebSocket round trip).

## Live Flow (event simulation) dashboard

The `?mode=dashboard` UI includes a **Live Flow** panel (`frontend/src/dashboard/components/LiveFlowPanel.tsx`)
that simulates TikTok LIVE events locally and pushes them through the **same** backend pipeline as
real TikTok events (also reserved in the dev layout, rendered when `import.meta.env.DEV`).

- The panel renders the **real gift catalog**, fetched from the backend on dashboard connect
  (`{ type: "gift_catalog", payload: string[] }` — `GiftCatalog.getGiftNames()`).
- Sending an event issues a `{ type: "simulate_tiktok_event", event }` packet from the dashboard
  role; only dashboards may send it (the backend warns and drops it from other roles).
- The backend validates the payload with `isTikTokEvent` (`backend/src/live/TikTokEventDispatcher.ts`)
  and routes it through the same dispatcher used for real `tiktok-live-connector` events:
  - `gift` → `GiftProcessor.handleGift` (towers / enemies / clear, per the gift catalog);
  - `like` → `GiftProcessor.handleLike` (enemy spawns once past the like threshold);
  - `follow` / `comment` / `share` / `member` → logged only (no game action yet).
- Every event is broadcast to all dashboards as
  `{ type: "event_log", payload: { timestamp, kind, username, label, detail, note? } }`.
  While no match is active, gift/like entries carry `note: "ignored: no active match"`.
- The simulated event shapes are the same normalized `TikTokEvent` union the backend produces for
  real events (`backend/src/tiktok/TikTokClient.ts`), including `member { uniqueId, nickname }` for
  viewer joins.

## Authoritative game state

The single authoritative game state lives in `GameEngine` (`frontend/src/game/GameEngine.ts`).
It is emitted to `subscribe` listeners (throttled to ~5×/s) as a `GameState` snapshot:

```ts
type GameState = {
  hp: number;
  gold: number;
  wave: number;                 // same value as currentWave (legacy field)
  enemies: number;              // number of alive monsters
  towers: number;               // number of active turrets
  fps: number;
  speed: number;
  isPaused: boolean;
  isVictory: boolean;           // true while the 10th wave is finishing
  isActive: boolean;            // a match is running
  currentWave: number;          // 1..10, 0 when no match is active
  totalWaves: number;           // 10
  waveDurationSeconds: number;  // 30
  remainingWaveSeconds: number; // seconds left in the current wave
};
```

- `currentWave`, `totalWaves`, `waveDurationSeconds` and `remainingWaveSeconds` are read
  from the `WaveManager`, never from a second countdown.
- There is no separate conflicting match state in React components, PixiJS scenes, or dev controls.

## Match lifecycle

- A match starts with `startGame()`.
- One match contains exactly **10 waves**.
- Each wave lasts exactly **30 seconds**.
- Waves advance automatically: when a wave's 30-second countdown expires, the next wave
  starts immediately and the countdown resets to 30 seconds.
- After the 10th wave finishes, the match ends automatically and all match entities are cleaned up.
- The match can also be ended manually with `finishGame()`.
- There is no automatic restart: a new match is only started by calling `startGame()` again.

## Wave lifecycle

- `startGame()` starts wave 1 and its 30-second timer.
- The wave countdown is driven by the PixiJS game loop (`GameEngine.update` → `WaveManager.update`),
  scaled by game speed. It is **not** a `setInterval`/`setTimeout`; only one countdown exists.
- `WaveManager` spawns each wave's enemy queue over the wave's `spawnInterval`; the wave is
  time-bounded (30 s) and does **not** wait for enemies to die.
- When the countdown reaches zero:
  - wave < 10 → the next wave starts automatically (timer resets to 30);
  - wave 10 → the match ends (`finishGame` runs the cleanup).
- The wave timer display stops when the match ends.

## Turret lifecycle

- Turrets are spawned for a match via `spawnTurret` / `handleTurretGift`.
- Every new turret starts with **one small star** (`starLevel = 1`).
- The creator's username is displayed above the turret.
- Turrets remain active until the end of the current match.
- At match end all turrets are removed, their display objects destroyed, and their positions released.

### Turret position rules

- Turret positions come from `SpotInfo` (`frontend/src/constants/spot.ts`, 18 positions).
- A position is occupied if a turret holds `spot.order` (the internal turret list in `TowerManager`
  is the single source of truth; there is no separate free/occupied array).
- Random selection uses **only currently free positions**.
- Two turrets can never occupy the same position: the gift flow only picks free spots, and the
  dashboard `spawnTower` refuses an already-occupied spot.
- After match cleanup all positions become free again.

### Turret creation rules

`handleTurretGift({ username, turretType })`:

1. validates the input (`username` non-empty, `turretType` a string);
2. verifies the match is active;
3. resolves the turret type (accepts the existing types `"Tesla"`, `"Dendro"`, `"Frost"`,
   case-insensitive);
4. if a free position exists → spawns the requested turret at a random free position;
5. otherwise → upgrades the **first** turret in the internal turret list whose type matches
   (`TowerManager.getFirstTowerByType`, insertion order — never random, never the weakest,
   never evenly distributed, never replaced, no other turret is removed).

### Turret upgrade rules

- A successful gift upgrade adds one small star.
- When all positions are full and a matching turret exists, the upgrade is applied to the first
  matching turret; only after a successful upgrade is the displayed username replaced by the
  username of the viewer who performed the upgrade.
- A skipped upgrade (see "Skip reasons") never changes the username or the stars.
- The dashboard's manual "Upgrade Tower" control is a separate, pre-existing combat-level
  upgrade (`Tower.level`, max 3, damage/attack-speed); it is unrelated to the star system.

### Turret ownership metadata

Each turret stores two independent ownership fields (`spawnOwner`, `upgradeOwner`) that
**never overwrite each other**:

- `spawnOwner` — set once at creation; it never changes afterwards.
- `upgradeOwner` — the viewer who most recently upgraded the turret; it starts equal to
  `spawnOwner` and is updated only by a successful upgrade.
- The nickname label displays `upgradeOwner` (falling back to `spawnOwner`).

The backend includes `ownership` metadata in every `spawn_tower` / `upgrade_tower` /
`upgrade_random_tower` event. The frontend applies it with `Tower.setOwnership` (spawn) and
`Tower.applyUpgradeOwner` (upgrade), keeping `spawnOwner` immutable.

### Normalized server events

The frontend receives exactly five normalized event types from the backend (see
`frontend/src/types/game.ts` `ServerToGameEvent`):

- `spawn_tower` → `GameEngine.applySpawnTower` → spawns at a random free position with ownership.
- `upgrade_tower` → `GameEngine.applyUpgradeTower` → upgrades the turret whose `spawnOwner`
  matches the payload username (`TowerManager.getFirstTowerBySpawnOwner`).
- `upgrade_random_tower` → `GameEngine.applyUpgradeRandomTower` → upgrades a random turret of
  the given type (`TowerManager.getTowersByType`).
- `spawn_enemy` → `GameEngine.applySpawnEnemy` → spawns `count` monsters of the given type.
- `clear_enemies` → `GameEngine.applyClearEnemies` → removes all monsters.

These are routed by `GameEventRouter.handleGameEvent`. The router and the engine contain no
gift-to-action mapping; the backend decides the action, the frontend only executes it.

### Small-star and big-star progression

A turret's star state is a single level:

```ts
type TurretStarLevel = 1 | 2 | 3 | 4 | 5 | 6;
```

- Level `1`–`5` = that many small stars in one centered row.
- Level `6` = one big star (no small stars shown).
- Progression: 1 → 2 → 3 → 4 → 5 small stars → 1 big star.
- A new turret never starts with zero stars.
- A turret with one big star cannot be upgraded again; extra calls return a controlled skip.
- The state can never be contradictory (no `smallStars: 5` + `hasBigStar: true`).

### Star and nickname rendering

- Stars are drawn programmatically with PixiJS `Graphics`
  (`drawStar` + `StarIndicator` in `frontend/src/effects/StarIndicator.ts`). No star PNG assets.
- Each turret root container holds: the animated turret sprite, a `StarIndicator`, and a
  nickname `Text`. The indicator and nickname are attached to the non-rotating root container,
  so they never rotate with a rotating weapon.
- Indicators update in place (old graphics are cleared, no stacked duplicate stars).
- Star graphics and nickname labels are destroyed together with the turret.
- The nickname label shows the most recent `upgradeOwner` (which equals `spawnOwner` until the
  first upgrade); it is hidden when the name is empty.

### Nickname update rules

The username changes **only** after a successful upgrade:

- not changed when the match is inactive;
- not changed on invalid input;
- not changed when the turret type does not exist;
- not changed when no matching turret exists;
- not changed when the matching turret already has a big star;
- not changed when the upgrade was skipped for any other reason.

## Monster lifecycle

- Monsters are spawned by the wave system (`WaveManager`) and on demand via `spawnMonster`.
- `spawnMonster` requires an active match and a known monster type (existing types
  `"Slime1"`…`"Slime5"`, `"Tank"`, case-insensitive). No invented gift mapping exists.
- At match end every active monster is removed regardless of HP, animation state, path position,
  attack state, or spawn source.

## Match cleanup

`finishGame()` (and the automatic end after wave 10) performs the following:

- stops the wave timer (the game-loop countdown stops updating; no `setInterval` to clear);
- clears all bullets;
- removes all turrets and destroys their display objects (nickname labels and star graphics included);
- removes all monsters and destroys their display objects;
- clears the active entity collections;
- releases all turret positions;
- resets the `WaveManager` to its idle state;
- resets the wave banner (`WAVE 1`, no timer);
- resets match state (`isActive = false`).
- Shared textures and global assets are **not** destroyed (they are reused by future matches).

## Public frontend game API

The public API is implemented on the `GameEngine` class (`frontend/src/game/GameEngine.ts`).
It has no dependency on WebSocket, HTTP, Socket.IO, NestJS, TikTok, or any backend technology.

### `startGame(): GameActionResult`

Starts a match and its first wave.

| Reason |
| --- |
| `game_already_active` — a match is already running. |
| `invalid_input` — the engine is not initialized. |

### `startNextWave(): GameActionResult`

Starts the next wave immediately (manual override; waves otherwise advance automatically).
Aliased as `startWave()` for compatibility with the existing dashboard API.

| Reason |
| --- |
| `game_not_active` — no match is running. |
| `no_next_wave` — the current wave is the last wave or the match has finished. |
| `invalid_input` — the engine is not initialized. |

### `finishGame(): GameActionResult`

Ends the match and clears all match entities and state. (Internal auto-finish after wave 10
shows the victory banner; manual `finishGame` does not.)

| Reason |
| --- |
| `game_not_active` — no match is running. |

### `handleTurretGift(input: TurretGiftInput): TurretGiftResult`

Main entry point for a normalized turret gift event.

```ts
type TurretGiftInput = {
  username: string;
  turretType: string;
};
```

Returns `turret_spawned` (free position) or `turret_upgraded` (positions full, first matching
turret upgraded).

| Reason |
| --- |
| `invalid_input` — missing/empty username or non-string turret type. |
| `game_not_active` — no match is running. |
| `turret_type_not_found` — turret type is not one of `Tesla`/`Dendro`/`Frost`. |
| `matching_turret_not_found` — no free slots and no turret of that type exists. |
| `turret_max_level` — no free slots and the first matching turret already has a big star. |

### `spawnTurret(input: TurretSpawnInput, ownership?: TowerOwnership): TurretActionResult`

Spawns a turret of the requested type at a random free position. The optional `ownership`
metadata (`{ spawnOwner, upgradeOwner }`) is applied to the new turret; both fields default to
`username` when omitted.

```ts
type TurretSpawnInput = {
  username: string;
  turretType: string;
};
```

On success, `data` is:

```ts
{
  type: TowerType;
  spotOrder: number;
  spot: SpotInfoType; // { order, x, y }
  level: TurretStarLevel;
}
```

| Reason |
| --- |
| `invalid_input`, `game_not_active`, `turret_type_not_found` — see above. |
| `no_free_slots` — every turret position is occupied. |

### `upgradeFirstTurretByType(input: TurretSpawnInput): TurretActionResult`

Finds the first turret whose type matches and upgrades its star level.

| Reason |
| --- |
| `invalid_input`, `game_not_active`, `turret_type_not_found` — see above. |
| `matching_turret_not_found` — no turret of that type exists. |
| `turret_max_level` — the first matching turret already has a big star. |

### `spawnMonster(input: MonsterSpawnInput): MonsterActionResult`

Passes a normalized monster spawn command into the existing monster system.

```ts
type MonsterSpawnInput = {
  username?: string; // currently unused by the spawn logic
  monsterType: string;
};
```

| Reason |
| --- |
| `invalid_input` — non-string monster type. |
| `game_not_active` — no match is running. |
| `monster_type_not_found` — type is not one of the existing enemy types. |

### `clearAllTurrets(): void`

Removes all turrets and releases all turret positions. Works regardless of match state.

### `applySpawnTower(payload: SpawnTowerPayload): TurretActionResult`

Applies a `spawn_tower` server event: delegates to `spawnTurret` with the event's `ownership`.

### `applyUpgradeTower(payload: UpgradeTowerPayload): TurretActionResult`

Applies an `upgrade_tower` server event: upgrades the turret whose type matches and whose
`spawnOwner` equals the payload `username`, then sets its `upgradeOwner`.

| Reason |
| --- |
| `matching_turret_not_found` — no turret of that type was spawned by that username. |

### `applyUpgradeRandomTower(payload: UpgradeRandomTowerPayload): TurretActionResult`

Applies an `upgrade_random_tower` server event: upgrades a random turret of the given type
(`TowerManager.getTowersByType`), then sets its `upgradeOwner`.

| Reason |
| --- |
| `matching_turret_not_found` — no turret of that type exists. |

### `applySpawnEnemy(payload: SpawnEnemyPayload): MonsterActionResult`

Applies a `spawn_enemy` server event: spawns `payload.count` monsters of the given type.

### `applyClearEnemies(): GameActionResult`

Applies a `clear_enemies` server event: removes all monsters. Returns `enemies_cleared`.

### `clearAllMonsters(): void`

Removes all active monsters. Works regardless of match state.

### `getGameState(): GameState`

Returns the current authoritative game state. `getState()` is the original name of the same
method (`getGameState` is an alias).

### Other existing engine methods

`spawnTower(type, spot)` (dashboard manual placement, refuses occupied spots), `sellTower(spot)`,
`upgradeTower(spot)` (combat level), `spawnEnemy(type)`, `pause()`, `resume()`, `restart()`,
`setGameSpeed(speed)`, `subscribe(listener)` — unchanged, documented in `AGENTS.md`.

## Controlled action results

Public game methods return a result instead of throwing for expected conditions:

```ts
type GameActionResult<T = undefined> = {
  success: boolean;
  action:
    | "game_started"
    | "wave_started"
    | "game_finished"
    | "turret_spawned"
    | "turret_upgraded"
    | "monster_spawned"
    | "enemies_cleared"
    | "skipped";
  reason?:
    | "game_not_active"
    | "game_already_active"
    | "no_free_slots"
    | "no_next_wave"
    | "turret_type_not_found"
    | "matching_turret_not_found"
    | "turret_max_level"
    | "monster_type_not_found"
    | "invalid_input";
  data?: T;
};
```

Unexpected programming errors are still reported normally.

## Server adapter contract

The backend emits exactly these normalized event payloads (defined in
`frontend/src/types/game.ts` as `ServerToGameEvent`):

```ts
type ServerToGameEvent =
  | { type: "spawn_tower"; payload: { username: string; towerType: string; ownership: TowerOwnership } }
  | { type: "upgrade_tower"; payload: { username: string; towerType: string; ownership: UpgradeOwnership } }
  | { type: "upgrade_random_tower"; payload: { towerType: string; ownership: UpgradeOwnership } }
  | { type: "spawn_enemy"; payload: { enemyType: string; count: number } }
  | { type: "clear_enemies" };
```

A small pure router is provided (`frontend/src/game/GameEventRouter.ts`):

```ts
function handleGameEvent(target: GameEventTarget, event: ServerToGameEvent): GameActionResult<unknown>
```

It only routes normalized events to the public game API methods; it contains no turret, wave,
star, or monster rules. The router is driven by `GameSocketClient`, which owns the WebSocket
connection (see "Backend integration status").

## How the backend calls the API

The backend does not call the frontend API directly. It broadcasts normalized
`ServerToGameEvent` messages over WebSocket; `GameSocketClient` receives them and routes them
through `GameEventRouter` into the public API, e.g.:

```ts
gameApi.applySpawnTower({ username: "UserA", towerType: "dendro", ownership: { spawnOwner: "UserA", upgradeOwner: "UserA" } });
gameApi.applySpawnEnemy({ enemyType: "slime1", count: 5 });
gameApi.applyClearEnemies();
```

The backend never contains game rules; it only decides which normalized event to send.

## Local testing without a backend

The `GameSocketClient` always tries to connect to `VITE_WS_URL` (default `ws://<host>:3000`);
when no backend is running it logs connection failures and retries every 3 s without affecting
the game.

In development (`import.meta.env.DEV`) the active engine is exposed as `window.gameApi`
(`frontend/src/game/GameRuntime.ts`, declared in `frontend/src/vite-env.d.ts`). Example from the console:

```js
window.gameApi.startGame();
window.gameApi.handleTurretGift({ username: "UserA", turretType: "dendro" });
window.gameApi.spawnMonster({ username: "UserB", monsterType: "basic" }); // skipped: no "basic" type
window.gameApi.spawnMonster({ username: "UserB", monsterType: "slime1" });
window.gameApi.finishGame();
```

Only existing project types are supported: turrets `Tesla`/`Dendro`/`Frost`; monsters
`Slime1`–`Slime5`/`Tank`. The `dashboard` also provides Start Game / Next Wave / Finish Game /
Pause / Resume / Restart / Speed / Clear Enemies buttons. In `?mode=dashboard` those buttons are
sent as `game_command`s over WebSocket; in dev mode they drive the local engine directly.

## Verification

- `npm run lint` — ESLint
- `npm run build` — lint + `tsc` + `vite build`
- There is no test framework in the project; lifecycle behavior is verified through the public
  API, the dashboard, and `window.gameApi`.
