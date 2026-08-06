import type { GiftEventSender, GiftInput, LikeInput, ServerToClientEvent } from "./types.js";
import type { GiftAction } from "./GiftCatalog.js";
import { GiftRouter } from "./GiftRouter.js";
import { EnemyGiftHandler } from "./EnemyGiftHandler.js";
import { TowerGiftHandler } from "./TowerGiftHandler.js";
import { MatchStateService } from "./MatchStateService.js";

export class GiftProcessor {
  constructor(
    private readonly router: GiftRouter,
    private readonly enemyHandler: EnemyGiftHandler,
    private readonly towerHandler: TowerGiftHandler,
    private readonly matchState: MatchStateService,
    private readonly sender: GiftEventSender,
  ) {}

  handleGift(event: GiftInput): void {
    if (!this.matchState.isActive) {
      console.log(`[gift] ignored @${event.nickname} "${event.giftName}" (no active match)`);
      return;
    }
    const action = this.router.route(event.giftName);
    if (action === null) {
      console.log(`[gift] unknown gift "${event.giftName}" from @${event.nickname}`);
      return;
    }
    const repeats = action.kind === "clear_enemies" ? 1 : Math.max(1, event.repeatCount);
    for (let i = 0; i < repeats; i++) {
      this.applyAction(action, event.nickname);
    }
  }

  handleLike(event: LikeInput): void {
    if (!this.matchState.isActive) {
      return;
    }
    const spawns = this.matchState.accumulateLikes(event.likeCount);
    for (let i = 0; i < spawns; i++) {
      this.emit(this.enemyHandler.spawnEnemy(1));
    }
  }

  private applyAction(action: GiftAction, username: string): void {
    switch (action.kind) {
      case "tower":
        this.emit(this.towerHandler.processTowerGift({ username, tower: action.tower }));
        break;
      case "enemy":
        this.emit(this.enemyHandler.spawnEnemy(action.count));
        break;
      case "clear_enemies":
        this.emit(this.enemyHandler.clearEnemies());
        break;
    }
  }

  private emit(event: ServerToClientEvent): void {
    console.log(`[gift] → ${event.type}`);
    this.sender.sendEvent(event);
  }
}
