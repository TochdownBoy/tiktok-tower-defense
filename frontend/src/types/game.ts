import type { EnemyType } from "./enemy";
import type { TowerType } from "./tower";
import type { SpotInfoType } from "./spot";

export type TurretStarLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface TurretGiftInput {
  username: string;
  turretType: string;
}

export type TurretSpawnInput = TurretGiftInput;

export interface MonsterSpawnInput {
  username?: string;
  monsterType: string;
}

export type GameAction =
  | "game_started"
  | "wave_started"
  | "game_finished"
  | "turret_spawned"
  | "turret_upgraded"
  | "monster_spawned"
  | "enemies_cleared"
  | "skipped";

export type GameActionResultReason =
  | "game_not_active"
  | "game_already_active"
  | "no_free_slots"
  | "no_next_wave"
  | "turret_type_not_found"
  | "matching_turret_not_found"
  | "turret_max_level"
  | "monster_type_not_found"
  | "invalid_input";

export interface TurretActionResultData {
  type: TowerType;
  spotOrder: number;
  spot: SpotInfoType;
  level: TurretStarLevel;
}

export interface MonsterActionResultData {
  type: EnemyType;
}

export interface GameActionResult<T = undefined> {
  success: boolean;
  action: GameAction;
  reason?: GameActionResultReason;
  data?: T;
}

export type TurretActionResult = GameActionResult<TurretActionResultData>;
export type TurretGiftResult = TurretActionResult;
export type MonsterActionResult = GameActionResult<MonsterActionResultData>;

export interface TowerOwnership {
  spawnOwner: string;
  upgradeOwner: string;
  spawnAt?: number;
  lastUpgradeAt?: number;
  totalUpgrades?: number;
}

export type UpgradeOwnership = Pick<
  TowerOwnership,
  "upgradeOwner" | "lastUpgradeAt"
>;

export interface SpawnTowerPayload {
  username: string;
  towerType: string;
  ownership: TowerOwnership;
}

export interface UpgradeTowerPayload {
  username: string;
  towerType: string;
  ownership: UpgradeOwnership;
}

export interface UpgradeRandomTowerPayload {
  towerType: string;
  ownership: UpgradeOwnership;
}

export interface SpawnEnemyPayload {
  enemyType: string;
  count: number;
}

export type ServerToGameEvent =
  | {
      type: "spawn_tower";
      payload: SpawnTowerPayload;
    }
  | {
      type: "upgrade_tower";
      payload: UpgradeTowerPayload;
    }
  | {
      type: "upgrade_random_tower";
      payload: UpgradeRandomTowerPayload;
    }
  | {
      type: "spawn_enemy";
      payload: SpawnEnemyPayload;
    }
  | {
      type: "clear_enemies";
    };
