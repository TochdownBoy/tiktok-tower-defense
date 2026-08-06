import { ViewerStateService } from "./ViewerStateService.js";

export class MatchStateService {
  private active = false;
  private boardFull = false;
  private spawnedTowers = 0;
  private likeCount = 0;

  constructor(
    private readonly viewerState: ViewerStateService,
    private readonly maxTowers: number,
    private readonly likeThreshold: number,
  ) {}

  get isActive(): boolean {
    return this.active;
  }

  get isBoardFull(): boolean {
    return this.boardFull;
  }

  startMatch(): void {
    this.active = true;
    this.resetRuntime();
  }

  finishMatch(): void {
    this.active = false;
    this.resetRuntime();
  }

  registerTowerSpawn(): void {
    this.spawnedTowers += 1;
    this.boardFull = this.spawnedTowers >= this.maxTowers;
  }

  accumulateLikes(count: number): number {
    if (this.likeThreshold <= 0) {
      return 0;
    }
    this.likeCount += count;
    const spawns = Math.floor(this.likeCount / this.likeThreshold);
    this.likeCount %= this.likeThreshold;
    return spawns;
  }

  private resetRuntime(): void {
    this.boardFull = false;
    this.spawnedTowers = 0;
    this.likeCount = 0;
    this.viewerState.reset();
  }
}
