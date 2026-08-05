import { Container, Sprite, type Texture } from "pixi.js";
import type { TurretStarLevel } from "../types/game";

const STAR_TEXTURE_SIZE = 100;
const MAX_SMALL_STARS = 5;
const MIN_STAR_GAP = 8;
const MAX_STAR_SIZE = 16;
const BIG_STAR_SIZE = 24;

export class StarIndicator extends Container {
  private readonly texture: Texture;
  private readonly maxWidth: number;
  private readonly stars: Sprite[] = [];

  constructor(texture: Texture, maxWidth: number) {
    super();
    this.texture = texture;
    this.maxWidth = maxWidth;
  }

  setLevel(level: TurretStarLevel): void {
    for (const star of this.stars) {
      this.removeChild(star);
      star.destroy();
    }
    this.stars.length = 0;

    if (level >= 6) {
      this.addStar(BIG_STAR_SIZE / STAR_TEXTURE_SIZE);
      return;
    }

    const count = Math.max(1, Math.min(MAX_SMALL_STARS, level));
    const size = this.computeStarSize();
    const spacing = size + MIN_STAR_GAP;
    const startX = -((count - 1) * spacing) / 2;
    for (let i = 0; i < count; i++) {
      const star = this.addStar(size / STAR_TEXTURE_SIZE);
      star.position.set(startX + i * spacing, 0);
    }
  }

  private computeStarSize(): number {
    const fitSize =
      (this.maxWidth - (MAX_SMALL_STARS - 1) * MIN_STAR_GAP) / MAX_SMALL_STARS;
    return Math.min(MAX_STAR_SIZE, Math.max(8, fitSize));
  }

  private addStar(scale: number): Sprite {
    const star = new Sprite(this.texture);
    star.anchor.set(0.5, 0.5);
    star.scale.set(scale);
    this.stars.push(star);
    this.addChild(star);
    return star;
  }
}
