import type { EnemyType, TowerType } from "./types.js";

export type GiftAction =
  | { kind: "tower"; tower: TowerType }
  | { kind: "enemy"; count: number }
  | { kind: "clear_enemies" };

export interface EnemyWeight {
  enemy: EnemyType;
  weight: number;
}

export interface GiftCatalogConfig {
  gifts: Readonly<Record<string, GiftAction>>;
  likeThreshold: number;
  enemyWeights: readonly EnemyWeight[];
  maxTowers: number;
}

export const DEFAULT_GIFT_CATALOG_CONFIG: GiftCatalogConfig = {
  likeThreshold: 50,
  maxTowers: 18,
  enemyWeights: [
    { enemy: "Slime1", weight: 14 },
    { enemy: "Slime2", weight: 14 },
    { enemy: "Slime3", weight: 14 },
    { enemy: "Slime4", weight: 14 },
    { enemy: "Slime5", weight: 14 },
    { enemy: "Tank", weight: 30 },
  ],
  gifts: {
    Rose: { kind: "enemy", count: 3 },
    Perfume: { kind: "enemy", count: 10 },
    Doughnut: { kind: "enemy", count: 20 },
    Tsar: { kind: "clear_enemies" },
    GG: { kind: "tower", tower: "Frost" },
    Football: { kind: "tower", tower: "Dendro" },
    "Finger Heart": { kind: "tower", tower: "Tesla" },
  },
};

export class GiftCatalog {
  private readonly normalizedGifts: Readonly<Record<string, GiftAction>>;

  constructor(private readonly config: GiftCatalogConfig) {
    const normalized: Record<string, GiftAction> = {};
    for (const [name, action] of Object.entries(config.gifts)) {
      normalized[normalizeGiftName(name)] = action;
    }
    this.normalizedGifts = normalized;
  }

  lookupGift(giftName: string): GiftAction | null {
    return this.normalizedGifts[normalizeGiftName(giftName)] ?? null;
  }

  getGiftNames(): string[] {
    return Object.keys(this.config.gifts);
  }

  get maxTowers(): number {
    return this.config.maxTowers;
  }

  get likeThreshold(): number {
    return this.config.likeThreshold;
  }

  get enemyWeights(): readonly EnemyWeight[] {
    return this.config.enemyWeights;
  }
}

const normalizeGiftName = (name: string): string => name.trim().toLowerCase();
