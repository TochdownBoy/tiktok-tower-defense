import type { GameEngine } from "../game/GameEngine";
import type { DashboardSocketClient } from "../network/DashboardSocketClient";
import type { EnemyType } from "../types/enemy";
import type { SpotInfoType } from "../types/spot";
import type { TowerType } from "../types/tower";

export interface DashboardController {
  startGame(): void;
  finishGame(): void;
  startNextWave(): void;
  placeTower(type: TowerType, spot: SpotInfoType): void;
  sellTower(spot: SpotInfoType): void;
  upgradeTower(spot: SpotInfoType): void;
  spawnEnemy(type: EnemyType): void;
  clearEnemies(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  setSpeed(speed: number): void;
}

export class LocalDashboardController implements DashboardController {
  constructor(private readonly engine: GameEngine) {}

  startGame(): void {
    this.engine.startGame();
  }

  finishGame(): void {
    this.engine.finishGame();
  }

  startNextWave(): void {
    this.engine.startNextWave();
  }

  placeTower(type: TowerType, spot: SpotInfoType): void {
    this.engine.spawnTower(type, spot);
  }

  sellTower(spot: SpotInfoType): void {
    this.engine.sellTower(spot);
  }

  upgradeTower(spot: SpotInfoType): void {
    this.engine.upgradeTower(spot);
  }

  spawnEnemy(type: EnemyType): void {
    this.engine.spawnEnemy(type);
  }

  clearEnemies(): void {
    this.engine.applyClearEnemies();
  }

  pause(): void {
    this.engine.pause();
  }

  resume(): void {
    this.engine.resume();
  }

  restart(): void {
    void this.engine.restart();
  }

  setSpeed(speed: number): void {
    this.engine.setGameSpeed(speed);
  }
}

export class RemoteDashboardController implements DashboardController {
  constructor(private readonly socket: DashboardSocketClient) {}

  startGame(): void {
    this.socket.sendCommand({ type: "start_game" });
  }

  finishGame(): void {
    this.socket.sendCommand({ type: "finish_game" });
  }

  startNextWave(): void {
    this.socket.sendCommand({ type: "start_next_wave" });
  }

  placeTower(type: TowerType, spot: SpotInfoType): void {
    this.socket.sendCommand({
      type: "place_tower",
      payload: { towerType: type, spotOrder: spot.order },
    });
  }

  sellTower(spot: SpotInfoType): void {
    this.socket.sendCommand({
      type: "sell_tower",
      payload: { spotOrder: spot.order },
    });
  }

  upgradeTower(spot: SpotInfoType): void {
    this.socket.sendCommand({
      type: "upgrade_tower",
      payload: { spotOrder: spot.order },
    });
  }

  spawnEnemy(type: EnemyType): void {
    this.socket.sendCommand({
      type: "spawn_enemy",
      payload: { enemyType: type },
    });
  }

  clearEnemies(): void {
    this.socket.sendCommand({ type: "clear_enemies" });
  }

  pause(): void {
    this.socket.sendCommand({ type: "pause" });
  }

  resume(): void {
    this.socket.sendCommand({ type: "resume" });
  }

  restart(): void {
    this.socket.sendCommand({ type: "restart" });
  }

  setSpeed(speed: number): void {
    this.socket.sendCommand({ type: "set_speed", payload: { speed } });
  }
}
