import type { ClearEnemiesEvent, EnemyType, SpawnEnemyEvent } from "./types.js";
import type { EnemyWeight } from "./GiftCatalog.js";

export class EnemyGiftHandler {
  constructor(private readonly weights: readonly EnemyWeight[]) {}

  spawnEnemy(count: number): SpawnEnemyEvent {
    return {
      type: "spawn_enemy",
      payload: {
        enemyType: this.chooseEnemy(),
        count,
      },
    };
  }

  clearEnemies(): ClearEnemiesEvent {
    return { type: "clear_enemies" };
  }

  private chooseEnemy(): EnemyType {
    const total = this.weights.reduce((sum, { weight }) => sum + weight, 0);
    let roll = Math.random() * total;
    for (const { enemy, weight } of this.weights) {
      roll -= weight;
      if (roll <= 0) {
        return enemy;
      }
    }
    return this.weights.at(-1)?.enemy ?? "Slime1";
  }
}
