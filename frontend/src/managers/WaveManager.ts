import type { EnemyManager } from "./EnemyManager";
import type { EnemyType } from "../types/enemy";
import type { WaveConfig } from "../types/wave";

const DEFAULT_DELAY_BETWEEN_WAVES = 2.5;

type WaveState = "idle" | "running" | "between" | "finished";

export interface WaveManagerOptions {
  delayBetweenWaves?: number;
  onWaveStart?: (waveNumber: number) => void;
  onVictory?: () => void;
}

export class WaveManager {
  private readonly enemyManager: EnemyManager;
  private readonly waves: WaveConfig[];
  private readonly delayBetweenWaves: number;
  private readonly onWaveStart?: (waveNumber: number) => void;
  private readonly onVictory?: () => void;

  private state: WaveState = "idle";
  private currentWaveIndex = -1;
  private spawnQueue: EnemyType[] = [];
  private spawnCursor = 0;
  private spawnInterval = 0;
  private spawnTimer = 0;
  private delayTimer = 0;
  private aliveEnemies = 0;

  constructor(
    enemyManager: EnemyManager,
    waves: WaveConfig[],
    options: WaveManagerOptions = {},
  ) {
    this.enemyManager = enemyManager;
    this.waves = waves;
    this.delayBetweenWaves =
      options.delayBetweenWaves ?? DEFAULT_DELAY_BETWEEN_WAVES;
    this.onWaveStart = options.onWaveStart;
    this.onVictory = options.onVictory;
    this.enemyManager.addEnemyRemovedListener(this.handleEnemyRemoved);
  }

  startWave(index: number): void {
    if (this.state === "running") return;

    const wave = this.waves[index];
    if (!wave) return;

    this.state = "running";
    this.currentWaveIndex = index;
    this.spawnQueue = wave.enemies;
    this.spawnCursor = 0;
    this.spawnInterval = wave.spawnInterval / 1000;
    this.spawnTimer = 0;
    this.aliveEnemies = 0;

    this.onWaveStart?.(index + 1);
  }

  nextWave(): void {
    if (this.state === "idle") {
      this.startWave(0);
    } else if (this.state === "between") {
      this.startWave(this.currentWaveIndex + 1);
    }
  }

  update(delta: number): void {
    switch (this.state) {
      case "running":
        this.spawnFromQueue(delta);
        this.checkCompletion();
        break;
      case "between":
        this.delayTimer -= delta;
        if (this.delayTimer <= 0) {
          this.startWave(this.currentWaveIndex + 1);
        }
        break;
      default:
        break;
    }
  }

  get currentWave(): number {
    return this.currentWaveIndex + 1;
  }

  get isRunning(): boolean {
    return this.state === "running";
  }

  get isWaveFinished(): boolean {
    return this.state === "between" || this.state === "finished";
  }

  get isVictory(): boolean {
    return this.state === "finished";
  }

  get remainingToSpawn(): number {
    return this.spawnQueue.length - this.spawnCursor;
  }

  get aliveEnemiesInWave(): number {
    return this.aliveEnemies;
  }

  get totalEnemies(): number {
    return this.spawnQueue.length;
  }

  private spawnFromQueue(delta: number): void {
    if (this.spawnCursor >= this.spawnQueue.length) return;

    this.spawnTimer -= delta;
    while (this.spawnTimer <= 0 && this.spawnCursor < this.spawnQueue.length) {
      this.enemyManager.spawnEnemy(this.spawnQueue[this.spawnCursor]);
      this.spawnCursor++;
      this.aliveEnemies++;
      this.spawnTimer += this.spawnInterval;
    }
  }

  private checkCompletion(): void {
    if (this.spawnCursor < this.spawnQueue.length) return;
    if (this.aliveEnemies > 0) return;

    if (this.currentWaveIndex >= this.waves.length - 1) {
      this.state = "finished";
      this.onVictory?.();
    } else {
      this.state = "between";
      this.delayTimer = this.delayBetweenWaves;
    }
  }

  private handleEnemyRemoved = (): void => {
    if (this.aliveEnemies > 0) {
      this.aliveEnemies--;
    }
  };
}
