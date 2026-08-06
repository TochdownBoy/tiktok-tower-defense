import { Sprite, Texture } from "pixi.js";
import type { Enemy } from "./Enemy";

const HIT_RADIUS = 30;
const PREDICTION_ITERATIONS = 20;
const MAX_PREDICTION_TIME = 30;

export class Bullet {
  public readonly sprite: Sprite;
  public isDone = false;

  private readonly target: Enemy;
  private readonly speed: number;
  private readonly damage: number;
  private readonly onHit?: () => void;
  private readonly applyHitEffect?: (enemy: Enemy) => void;
  private arrived = false;

  constructor(
    texture: Texture,
    spawnX: number,
    spawnY: number,
    target: Enemy,
    speed: number,
    scale = 0.15,
    damage: number,
    onHit?: () => void,
    applyHitEffect?: (enemy: Enemy) => void,
  ) {
    this.sprite = this.createSprite(texture, spawnX, spawnY, scale);
    this.target = target;
    this.speed = speed;
    this.damage = damage;
    this.onHit = onHit;
    this.applyHitEffect = applyHitEffect;

    const destination = this.predictDestination(spawnX, spawnY);
    this.sprite.rotation = this.calculateRotation(
      destination.x - spawnX,
      destination.y - spawnY,
    );
  }

  update(deltaTime: number): void {
    if (this.isDone) return;

    this.move(deltaTime);
    this.checkCollision();
  }

  private createSprite(
    texture: Texture,
    x: number,
    y: number,
    scale: number,
  ): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(x, y);
    sprite.scale.set(scale);
    return sprite;
  }

  private move(deltaTime: number): void {
    const step = this.speed * deltaTime;
    const destination = this.predictDestination(this.sprite.x, this.sprite.y);
    const dx = destination.x - this.sprite.x;
    const dy = destination.y - this.sprite.y;
    const distance = Math.hypot(dx, dy);

    this.sprite.rotation = this.calculateRotation(dx, dy);

    if (distance <= step) {
      this.sprite.position.set(destination.x, destination.y);
      this.arrived = true;
      return;
    }

    this.sprite.x += (dx / distance) * step;
    this.sprite.y += (dy / distance) * step;
  }

  private checkCollision(): void {
    if (this.target.state !== "Alive") {
      this.isDone = true;
      return;
    }

    const dx = this.target.position.x - this.sprite.x;
    const dy = this.target.position.y - this.sprite.y;
    if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) {
      this.target.takeDamage(this.damage);
      this.applyHitEffect?.(this.target);
      this.onHit?.();
      this.isDone = true;
    } else if (this.arrived) {
      this.isDone = true;
    }
  }

  private calculateRotation(dx: number, dy: number): number {
    const ART_POINTS_UP = Math.PI / 2;
    return Math.atan2(dy, dx) + ART_POINTS_UP;
  }

  private predictDestination(
    spawnX: number,
    spawnY: number,
  ): { x: number; y: number } {
    let low = 0;
    let high = 1;

    while (
      !this.isWithinReach(spawnX, spawnY, high) &&
      high < MAX_PREDICTION_TIME
    ) {
      high *= 2;
    }

    for (let i = 0; i < PREDICTION_ITERATIONS; i++) {
      const mid = (low + high) / 2;
      if (this.isWithinReach(spawnX, spawnY, mid)) {
        high = mid;
      } else {
        low = mid;
      }
    }

    return this.target.getPositionAfterTime((low + high) / 2);
  }

  private isWithinReach(spawnX: number, spawnY: number, time: number): boolean {
    const position = this.target.getPositionAfterTime(time);
    const dx = position.x - spawnX;
    const dy = position.y - spawnY;
    return Math.hypot(dx, dy) <= this.speed * time;
  }
}
