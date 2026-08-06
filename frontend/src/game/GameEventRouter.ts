import type {
  GameActionResult,
  MonsterActionResult,
  ServerToGameEvent,
  SpawnEnemyPayload,
  SpawnTowerPayload,
  TurretActionResult,
  UpgradeRandomTowerPayload,
  UpgradeTowerPayload,
} from "../types/game";

export interface GameEventTarget {
  applySpawnTower(payload: SpawnTowerPayload): TurretActionResult;
  applyUpgradeTower(payload: UpgradeTowerPayload): TurretActionResult;
  applyUpgradeRandomTower(
    payload: UpgradeRandomTowerPayload,
  ): TurretActionResult;
  applySpawnEnemy(payload: SpawnEnemyPayload): MonsterActionResult;
  applyClearEnemies(): GameActionResult;
}

export function handleGameEvent(
  target: GameEventTarget,
  event: ServerToGameEvent,
): GameActionResult<unknown> {
  switch (event.type) {
    case "spawn_tower":
      return target.applySpawnTower(event.payload);
    case "upgrade_tower":
      return target.applyUpgradeTower(event.payload);
    case "upgrade_random_tower":
      return target.applyUpgradeRandomTower(event.payload);
    case "spawn_enemy":
      return target.applySpawnEnemy(event.payload);
    case "clear_enemies":
      return target.applyClearEnemies();
  }
}
