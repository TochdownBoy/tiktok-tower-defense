import { Tower } from "../entities/Tower";
import type { Enemy } from "../entities/Enemy";
import { BulletManager } from "./BulletManager";

export class TowerManager {
  private readonly towers: Tower[] = [];
  private readonly bulletManagers: BulletManager[] = [];
  private readonly proposedHp = new Map<Enemy, number>();
  private readonly sortedEnemies: Enemy[] = [];

  constructor(...bulletManagers: BulletManager[]) {
    this.bulletManagers.push(...bulletManagers);
  }

  addTower(tower: Tower): void {
    this.towers.push(tower);
  }

  get towerCount(): number {
    return this.towers.length;
  }

  getTowers(): Tower[] {
    return this.towers;
  }

  getFirstTowerByType(type: Tower["type"]): Tower | undefined {
    return this.towers.find((tower) => tower.type === type);
  }

  hasAttackingTowers(type: Tower["type"]): boolean {
    return this.towers.some(
      (tower) => tower.type === type && tower.isAttacking,
    );
  }

  getTowerAtSpot(order: number): Tower | undefined {
    return this.towers.find((tower) => tower.spot.order === order);
  }

  removeTowerAtSpot(order: number): Tower | undefined {
    const index = this.towers.findIndex((tower) => tower.spot.order === order);
    if (index === -1) return undefined;
    const [tower] = this.towers.splice(index, 1);
    return tower;
  }

  clear(): Tower[] {
    return this.towers.splice(0, this.towers.length);
  }

  update(deltaTime: number, enemies: Enemy[]): void {
    this.sortedEnemies.length = 0;
    for (const enemy of enemies) {
      this.sortedEnemies.push(enemy);
    }
    this.sortedEnemies.sort((a, b) => a.progress - b.progress);

    this.proposedHp.clear();
    for (const enemy of this.sortedEnemies) {
      this.proposedHp.set(enemy, enemy.hp);
    }

    for (const tower of this.towers) {
      tower.update(deltaTime, this.sortedEnemies, this.proposedHp);
    }

    for (const bulletManager of this.bulletManagers) {
      bulletManager.update(deltaTime);
    }
  }
}
