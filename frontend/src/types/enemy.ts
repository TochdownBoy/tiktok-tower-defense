export type EnemyState = "Alive" | "Dead" | "ReachedEnd";

export type EnemyType =
  "Slime1" | "Slime2" | "Slime3" | "Slime4" | "Slime5" | "Tank";

export interface EnemyConfig {
  hp: number;
  speed: number;
  scaleAdder: number;
  hpTextOffsetY: number;
  hpTextFontSize: number;
}
