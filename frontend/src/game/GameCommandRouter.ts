import { SpotInfo } from "../constants/spot";
import type { EnemyType } from "../types/enemy";
import type { SpotInfoType } from "../types/spot";
import type { TowerType } from "../types/tower";
import type { GameCommandPacket } from "../network/types";

export interface GameCommandTarget {
  startGame(): unknown;
  startNextWave(): unknown;
  finishGame(): unknown;
  spawnTower(type: TowerType, spot: SpotInfoType): void;
  sellTower(spot: SpotInfoType): void;
  upgradeTower(spot: SpotInfoType): void;
  spawnEnemy(type: EnemyType): void;
  applyClearEnemies(): unknown;
  pause(): void;
  resume(): void;
  restart(): Promise<void>;
  setGameSpeed(speed: number): void;
}

const getSpot = (order: number): SpotInfoType | undefined =>
  SpotInfo.find((spot) => spot.order === order);

export function handleGameCommand(
  target: GameCommandTarget,
  packet: GameCommandPacket,
): void {
  switch (packet.command) {
    case "start_game":
      target.startGame();
      break;
    case "finish_game":
      target.finishGame();
      break;
    case "start_next_wave":
      target.startNextWave();
      break;
    case "place_tower": {
      const payload = packet.payload as {
        towerType?: TowerType;
        spotOrder?: number;
      };
      const spot = getSpot(payload.spotOrder ?? -1);
      if (typeof payload.towerType === "string" && spot) {
        target.spawnTower(payload.towerType, spot);
      } else {
        console.warn(
          `[cmd] invalid place_tower payload: ${JSON.stringify(payload)}`,
        );
      }
      break;
    }
    case "sell_tower": {
      const payload = packet.payload as { spotOrder?: number };
      const spot = getSpot(payload.spotOrder ?? -1);
      if (spot) {
        target.sellTower(spot);
      }
      break;
    }
    case "upgrade_tower": {
      const payload = packet.payload as { spotOrder?: number };
      const spot = getSpot(payload.spotOrder ?? -1);
      if (spot) {
        target.upgradeTower(spot);
      }
      break;
    }
    case "spawn_enemy": {
      const payload = packet.payload as { enemyType?: EnemyType };
      if (typeof payload.enemyType === "string") {
        target.spawnEnemy(payload.enemyType);
      }
      break;
    }
    case "clear_enemies":
      target.applyClearEnemies();
      break;
    case "pause":
      target.pause();
      break;
    case "resume":
      target.resume();
      break;
    case "restart":
      void target.restart();
      break;
    case "set_speed": {
      const payload = packet.payload as { speed?: number };
      if (typeof payload.speed === "number") {
        target.setGameSpeed(payload.speed);
      }
      break;
    }
  }
}
