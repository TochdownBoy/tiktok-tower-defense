import type {
  GameActionResult,
  MonsterActionResult,
  MonsterSpawnInput,
  ServerToGameEvent,
  TurretGiftInput,
  TurretGiftResult,
} from "../types/game";

export interface GameEventTarget {
  startGame(): GameActionResult;
  finishGame(): GameActionResult;
  handleTurretGift(input: TurretGiftInput): TurretGiftResult;
  spawnMonster(input: MonsterSpawnInput): MonsterActionResult;
}

export function handleGameEvent(
  target: GameEventTarget,
  event: ServerToGameEvent,
): GameActionResult<unknown> {
  switch (event.type) {
    case "start_game":
      return target.startGame();
    case "finish_game":
      return target.finishGame();
    case "turret_gift":
      return target.handleTurretGift(event.payload);
    case "monster_gift":
      return target.spawnMonster(event.payload);
  }
}
