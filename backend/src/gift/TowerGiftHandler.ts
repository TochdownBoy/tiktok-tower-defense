import type {
  ServerToClientEvent,
  SpawnTowerEvent,
  TowerType,
  UpgradeRandomTowerEvent,
  UpgradeTowerEvent,
} from "./types.js";
import type { MatchStateService } from "./MatchStateService.js";
import type { ViewerStateService } from "./ViewerStateService.js";

export interface TowerGiftInput {
  username: string;
  tower: TowerType;
}

export class TowerGiftHandler {
  constructor(
    private readonly viewerState: ViewerStateService,
    private readonly matchState: MatchStateService,
  ) {}

  processTowerGift({ username, tower }: TowerGiftInput): ServerToClientEvent {
    if (this.viewerState.owns(username, tower)) {
      return this.upgradeOwnedTower(username, tower);
    }
    if (this.matchState.isBoardFull) {
      return this.upgradeRandomTower(username, tower);
    }
    return this.spawnTower(username, tower);
  }

  private spawnTower(username: string, tower: TowerType): SpawnTowerEvent {
    this.viewerState.markSpawned(username, tower);
    this.matchState.registerTowerSpawn();
    return {
      type: "spawn_tower",
      payload: {
        username,
        towerType: tower,
        ownership: {
          spawnOwner: username,
          upgradeOwner: username,
          spawnAt: Date.now(),
        },
      },
    };
  }

  private upgradeOwnedTower(username: string, tower: TowerType): UpgradeTowerEvent {
    return {
      type: "upgrade_tower",
      payload: {
        username,
        towerType: tower,
        ownership: {
          upgradeOwner: username,
          lastUpgradeAt: Date.now(),
        },
      },
    };
  }

  private upgradeRandomTower(username: string, tower: TowerType): UpgradeRandomTowerEvent {
    return {
      type: "upgrade_random_tower",
      payload: {
        towerType: tower,
        ownership: {
          upgradeOwner: username,
          lastUpgradeAt: Date.now(),
        },
      },
    };
  }
}
