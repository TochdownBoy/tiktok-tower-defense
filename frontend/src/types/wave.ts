import type { EnemyType } from "./enemy";

export interface WaveConfig {
  spawnInterval: number;
  enemies: EnemyType[];
}
