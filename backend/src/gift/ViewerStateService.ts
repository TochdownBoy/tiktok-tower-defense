import type { TowerType } from "./types.js";

type ViewerTowers = Record<TowerType, boolean>;

export class ViewerStateService {
  private readonly viewers = new Map<string, ViewerTowers>();

  owns(username: string, tower: TowerType): boolean {
    return this.viewers.get(username)?.[tower] ?? false;
  }

  markSpawned(username: string, tower: TowerType): void {
    const towers = this.viewers.get(username) ?? this.emptyTowers();
    towers[tower] = true;
    this.viewers.set(username, towers);
  }

  reset(): void {
    this.viewers.clear();
  }

  private emptyTowers(): ViewerTowers {
    return { Frost: false, Tesla: false, Dendro: false };
  }
}
