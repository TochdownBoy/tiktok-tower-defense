import type { AnimatedSprite } from "pixi.js";
import type { Enemy } from "./Enemy";
import { Tower, type TowerOptions } from "./Tower";
import type { BulletManager } from "../managers/BulletManager";

export class DendroTower extends Tower {
  constructor(
    sprite: AnimatedSprite,
    options: TowerOptions,
    bulletManager?: BulletManager,
  ) {
    super(sprite, options, bulletManager);
  }

  protected override findPrimaryTarget(
    enemies: Enemy[],
    proposedHp: Map<Enemy, number>,
  ): Enemy | undefined {
    let first: Enemy | undefined;
    for (const enemy of enemies) {
      if ((proposedHp.get(enemy) ?? enemy.hp) <= 0) continue;
      if (!first || enemy.progress > first.progress) {
        first = enemy;
      }
    }
    return first;
  }
}
