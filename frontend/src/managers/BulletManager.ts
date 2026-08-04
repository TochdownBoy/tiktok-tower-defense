import { Container, Sprite, Texture } from "pixi.js";
import { FrostBullet } from "../entities/FrostBullet";
import type { Enemy } from "../entities/Enemy";

export interface BulletLike {
  readonly sprite: Sprite;
  readonly isDone: boolean;
  update(deltaTime: number): void;
}

export type BulletFactory = new (
  texture: Texture,
  spawnX: number,
  spawnY: number,
  target: Enemy,
  speed: number,
  scale?: number,
) => BulletLike;

export class BulletManager {
  public readonly container = new Container();
  private readonly bullets: BulletLike[] = [];

  constructor(
    private readonly texture: Texture,
    private readonly speed = 600,
    private readonly bulletFactory: BulletFactory = FrostBullet,
    private readonly scale = 0.15,
  ) {}

  spawnBullet(x: number, y: number, target: Enemy): void {
    const bullet = new this.bulletFactory(
      this.texture,
      x,
      y,
      target,
      this.speed,
      this.scale,
    );
    this.bullets.push(bullet);
    this.container.addChild(bullet.sprite);
  }

  update(deltaTime: number): void {
    for (const bullet of this.bullets) {
      bullet.update(deltaTime);
    }

    this.removeFinishedBullets();
  }

  private removeFinishedBullets(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (!bullet.isDone) continue;

      this.container.removeChild(bullet.sprite);
      bullet.sprite.destroy();
      this.bullets.splice(i, 1);
    }
  }
}
