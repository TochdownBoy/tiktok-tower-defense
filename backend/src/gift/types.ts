export type TowerType = "Frost" | "Tesla" | "Dendro";

export type EnemyType = "Slime1" | "Slime2" | "Slime3" | "Slime4" | "Slime5" | "Tank";

export interface TowerOwnership {
  spawnOwner: string;
  upgradeOwner: string;
  spawnAt?: number;
  lastUpgradeAt?: number;
  totalUpgrades?: number;
}

export type UpgradeOwnership = Pick<TowerOwnership, "upgradeOwner" | "lastUpgradeAt">;

export interface SpawnTowerEvent {
  type: "spawn_tower";
  payload: {
    username: string;
    towerType: TowerType;
    ownership: TowerOwnership;
  };
}

export interface UpgradeTowerEvent {
  type: "upgrade_tower";
  payload: {
    username: string;
    towerType: TowerType;
    ownership: UpgradeOwnership;
  };
}

export interface UpgradeRandomTowerEvent {
  type: "upgrade_random_tower";
  payload: {
    towerType: TowerType;
    ownership: UpgradeOwnership;
  };
}

export interface SpawnEnemyEvent {
  type: "spawn_enemy";
  payload: {
    enemyType: EnemyType;
    count: number;
  };
}

export interface ClearEnemiesEvent {
  type: "clear_enemies";
}

export type ServerToClientEvent =
  | SpawnTowerEvent
  | UpgradeTowerEvent
  | UpgradeRandomTowerEvent
  | SpawnEnemyEvent
  | ClearEnemiesEvent;

export interface GiftInput {
  uniqueId: string;
  nickname: string;
  giftName: string;
  repeatCount: number;
}

export interface LikeInput {
  uniqueId: string;
  nickname: string;
  likeCount: number;
}

export interface GiftEventSender {
  sendEvent(event: ServerToClientEvent): void;
}
