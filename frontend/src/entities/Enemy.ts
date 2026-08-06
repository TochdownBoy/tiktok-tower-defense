import { Container, Sprite, Text, Texture } from "pixi.js";
import { MovementManager } from "../managers/MovementManager";
import type { EnemyConfig, EnemyState, EnemyType } from "../types/enemy";
import type { Waypoint } from "../types/waypoint";

const ENEMY_HEIGHT = 24;
const HP_TEXT_SIDE_OFFSET_X = 26;
const HP_TEXT_SIDE_OFFSET_Y = 10;
const HP_TEXT_MOVE_SENSITIVITY = 140;
const HP_K_THRESHOLD = 1000;

function formatHp(hp: number): string {
  if (hp < HP_K_THRESHOLD) {
    return String(hp);
  }
  const value = Number((hp / HP_K_THRESHOLD).toFixed(1));
  return `${value}K`;
}

export class Enemy {
  public readonly type: EnemyType;
  public hp: number;
  public speed: number;
  public state: EnemyState = "Alive";
  public readonly container = new Container();
  public readonly sprite: Sprite;
  private readonly config: EnemyConfig;
  private readonly movement: MovementManager;
  private readonly hpText: Text;
  private slowRemaining = 0;
  private rootRemaining = 0;

  constructor(
    waypoints: Waypoint[],
    texture: Texture,
    config: EnemyConfig,
    type: EnemyType,
  ) {
    this.type = type;
    this.config = config;
    this.hp = config.hp;
    this.speed = config.speed;
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5, 0.5);

    const scale = ENEMY_HEIGHT / texture.height + config.scaleAdder;
    this.movement = new MovementManager(
      waypoints,
      this.sprite,
      config.speed,
      scale,
    );
    this.container.addChild(this.sprite);

    this.hpText = new Text({
      text: formatHp(config.hp),
      style: {
        fontFamily: "ADLaM Display",
        fontSize: config.hpTextFontSize,
        fontWeight: "700",
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 1 },
      },
    });
    this.hpText.anchor.set(0.5, 0.5);
    this.container.sortableChildren = true;
    this.hpText.zIndex = 1;
    this.container.addChild(this.hpText);
    this.syncHpText();

    const start = waypoints[0];
    this.sprite.position.set(start.x, start.y);
  }

  get position() {
    return this.sprite.position;
  }

  get progress(): number {
    return this.movement.distanceTravelled;
  }

  get velocity(): { x: number; y: number } {
    return this.movement.velocity;
  }

  getPositionAfterTime(time: number): { x: number; y: number } {
    return this.movement.getPositionAfterTime(time);
  }

  takeDamage(amount: number): void {
    if (this.state !== "Alive") return;

    this.hp -= amount;
    this.hpText.text = formatHp(this.hp);
    if (this.hp <= 0) {
      this.hp = 0;
      this.hpText.text = "0";
      this.state = "Dead";
    }
  }

  applySlowdown(factor: number, duration: number): void {
    this.slowRemaining = Math.max(this.slowRemaining, duration);
    this.movement.speedMultiplier = Math.min(
      this.movement.speedMultiplier,
      factor,
    );
  }

  applyRoot(duration: number): void {
    this.rootRemaining = Math.max(this.rootRemaining, duration);
    this.movement.isRooted = true;
  }

  update(deltaTime: number): void {
    if (this.state !== "Alive") return;

    if (this.slowRemaining > 0) {
      this.slowRemaining -= deltaTime;
      if (this.slowRemaining <= 0) {
        this.slowRemaining = 0;
        this.movement.speedMultiplier = 1;
      }
    }

    if (this.rootRemaining > 0) {
      this.rootRemaining -= deltaTime;
      if (this.rootRemaining <= 0) {
        this.rootRemaining = 0;
        this.movement.isRooted = false;
      }
    }

    this.movement.update(deltaTime);
    this.syncHpText();
    if (this.movement.reachedEnd) {
      this.state = "ReachedEnd";
    }
  }

  private syncHpText(): void {
    if (this.velocity.y < -HP_TEXT_MOVE_SENSITIVITY) {
      this.hpText.position.set(
        this.sprite.x + HP_TEXT_SIDE_OFFSET_X,
        this.sprite.y + HP_TEXT_SIDE_OFFSET_Y,
      );
      return;
    }
    this.hpText.position.set(
      this.sprite.x,
      this.sprite.y + this.config.hpTextOffsetY,
    );
  }
}
