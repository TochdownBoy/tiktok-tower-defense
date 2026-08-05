import { Container, Texture } from "pixi.js";
import { Enemy } from "../entities/Enemy";
import { ENEMY_CONFIGS } from "../constants/enemies";
import type { EnemyType } from "../types/enemy";
import type { Waypoint } from "../types/waypoint";

export class EnemyManager {
  public readonly container = new Container();

  private readonly removedListeners: ((enemy: Enemy) => void)[] = [];
  private readonly enemies: Enemy[] = [];
  private readonly aliveEnemiesList: Enemy[] = [];

  constructor(
    private readonly waypoints: Waypoint[],
    private readonly textures: Record<EnemyType, Texture>,
  ) {}

  addEnemyRemovedListener(listener: (enemy: Enemy) => void): void {
    this.removedListeners.push(listener);
  }

  spawnEnemy(type: EnemyType): Enemy {
    const enemy = new Enemy(
      this.waypoints,
      this.textures[type],
      ENEMY_CONFIGS[type],
      type,
    );
    this.enemies.push(enemy);
    this.container.addChild(enemy.container);
    return enemy;
  }

  clear(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      this.container.removeChild(enemy.container);
      enemy.container.destroy();
    }
    this.enemies.length = 0;
    this.rebuildAliveEnemies();
  }

  get aliveEnemies(): Enemy[] {
    return this.aliveEnemiesList;
  }

  getAliveEnemies(): Enemy[] {
    return this.aliveEnemiesList;
  }

  update(deltaTime: number): void {
    for (const enemy of this.enemies) {
      enemy.update(deltaTime);
    }
    this.removeNonAlive();
    this.rebuildAliveEnemies();
  }

  private rebuildAliveEnemies(): void {
    this.aliveEnemiesList.length = 0;
    for (const enemy of this.enemies) {
      if (enemy.state === "Alive") {
        this.aliveEnemiesList.push(enemy);
      }
    }
  }

  private removeNonAlive(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.state === "Alive") continue;

      this.container.removeChild(enemy.container);
      enemy.container.destroy();
      this.enemies.splice(i, 1);
      for (const listener of this.removedListeners) {
        listener(enemy);
      }
    }
  }
}
