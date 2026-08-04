import type { EnemyConfig, EnemyType } from "../types/enemy";

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  Slime1: {
    hp: 3000,
    speed: 160,
    scaleAdder: 0.25,
    hpTextOffsetY: 32,
    hpTextFontSize: 36,
  },
  Slime2: {
    hp: 5000,
    speed: 135,
    scaleAdder: 0.25,
    hpTextOffsetY: 32,
    hpTextFontSize: 36,
  },
  Slime3: {
    hp: 7000,
    speed: 130,
    scaleAdder: 0.25,
    hpTextOffsetY: 32,
    hpTextFontSize: 36,
  },
  Slime4: {
    hp: 11000,
    speed: 105,
    scaleAdder: 0.3,
    hpTextOffsetY: 32,
    hpTextFontSize: 36,
  },
  Slime5: {
    hp: 16000,
    speed: 80,
    scaleAdder: 0.3,
    hpTextOffsetY: 32,
    hpTextFontSize: 36,
  },
  Tank: {
    hp: 12000,
    speed: 90,
    scaleAdder: 0.7,
    hpTextOffsetY: 42,
    hpTextFontSize: 34,
  },
};
