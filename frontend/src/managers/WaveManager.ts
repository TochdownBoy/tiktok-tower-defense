import type { EnemyManager } from "./EnemyManager";
import type { EnemyType } from "../types/enemy";
import type { WaveConfig } from "../types/wave";

const DEFAULT_WAVE_DURATION_SECONDS = 30;
const ENEMY_HP_WAVE_MULTIPLIER = 1.3;

type WaveState = "idle" | "running" | "finished";

export interface WaveManagerOptions {
  waveDurationSeconds?: number;
  onWaveStart?: (waveNumber: number) => void;
  onVictory?: () => void;
}

export class WaveManager {
  private readonly enemyManager: EnemyManager;
  private readonly waves: WaveConfig[];
  private readonly waveDurationSeconds: number;
  private readonly onWaveStart?: (waveNumber: number) => void;
  private readonly onVictory?: () => void;

  private state: WaveState = "idle";
  private currentWaveIndex = -1;
  private remainingWaveSeconds = 0;
  private spawnQueue: EnemyType[] = [];
  private spawnCursor = 0;
  private spawnInterval = 0;
  private spawnTimer = 0;

  constructor(
    enemyManager: EnemyManager,
    waves: WaveConfig[],
    options: WaveManagerOptions = {},
  ) {
    this.enemyManager = enemyManager;
    this.waves = waves;
    this.waveDurationSeconds =
      options.waveDurationSeconds ?? DEFAULT_WAVE_DURATION_SECONDS;
    this.onWaveStart = options.onWaveStart;
    this.onVictory = options.onVictory;
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
    this.remainingWaveSeconds = this.waveDurationSeconds;

    this.onWaveStart?.(index + 1);
  }

  nextWave(): void {
    if (this.state === "idle") {
      this.startWave(0);
    } else if (this.state === "running") {
      this.completeCurrentWave();
    }
  }

  update(delta: number): void {
    if (this.state !== "running") return;

    this.spawnFromQueue(delta);
    this.remainingWaveSeconds -= delta;
    if (this.remainingWaveSeconds <= 0) {
      this.completeCurrentWave();
    }
  }

  reset(): void {
    this.state = "idle";
    this.currentWaveIndex = -1;
    this.spawnQueue = [];
    this.spawnCursor = 0;
    this.remainingWaveSeconds = this.waveDurationSeconds;
  }

  get currentWave(): number {
    return this.currentWaveIndex + 1;
  }

  get isRunning(): boolean {
    return this.state === "running";
  }

  get isVictory(): boolean {
    return this.state === "finished";
  }

  get remainingSeconds(): number {
    return Math.max(0, Math.ceil(this.remainingWaveSeconds));
  }

  private completeCurrentWave(): void {
    if (this.currentWaveIndex >= this.waves.length - 1) {
      this.state = "finished";
      this.onVictory?.();
      return;
    }

    this.state = "idle";
    this.startWave(this.currentWaveIndex + 1);
  }

  private spawnFromQueue(delta: number): void {
    if (this.spawnCursor >= this.spawnQueue.length) return;

    this.spawnTimer -= delta;
    while (this.spawnTimer <= 0 && this.spawnCursor < this.spawnQueue.length) {
      const hpMultiplier = ENEMY_HP_WAVE_MULTIPLIER ** this.currentWaveIndex;
      this.enemyManager.spawnEnemy(
        this.spawnQueue[this.spawnCursor],
        hpMultiplier,
      );
      this.spawnCursor++;
      this.spawnTimer += this.spawnInterval;
    }
  }
}
