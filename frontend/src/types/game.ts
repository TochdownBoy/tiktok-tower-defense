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

export type ServerToGameEvent =
  | {
      type: "turret_gift";
      payload: TurretGiftInput;
    }
  | {
      type: "monster_gift";
      payload: MonsterSpawnInput;
    }
  | {
      type: "start_game";
    }
  | {
      type: "finish_game";
    };
