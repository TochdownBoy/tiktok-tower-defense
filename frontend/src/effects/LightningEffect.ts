import { BlurFilter, Container, Graphics, Ticker } from "pixi.js";
import type { DestroyOptions } from "pixi.js";

const SEGMENT_LENGTH_MIN = 20;
const SEGMENT_LENGTH_MAX = 30;
const MIN_SEGMENTS = 5;

const BRANCH_CHANCE_MIN = 0.2;
const BRANCH_CHANCE_MAX = 0.3;
const BRANCH_LENGTH_MIN = 10;
const BRANCH_LENGTH_MAX = 25;
const BRANCH_ANGLE_OFFSET_MAX = 0.7;

const LIFETIME_MIN_MS = 60;
const LIFETIME_MAX_MS = 100;
const FADE_START_FRACTION = 0.35;

const MAX_DISPLACEMENT_FRACTION = 0.06;
const MIN_DISPLACEMENT = 8;

const GLOW_BLUR_STRENGTH = 4;
const GLOW_BLUR_QUALITY = 2;

const GLOW_COLOR = 0x66d9ff;
const BOLT_COLOR = 0x00c8ff;
const CORE_COLOR = 0xffffff;
const BRANCH_COLOR = 0xd6f4ff;

interface BoltPoint {
  x: number;
  y: number;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class LightningEffect extends Container {
  public readonly boltAngle: number;
  public readonly distance: number;

  private readonly mainBolt = new Graphics();
  private readonly branches = new Graphics();
  private readonly glow: BlurFilter;

  private readonly startX: number;
  private readonly startY: number;
  private readonly dx: number;
  private readonly dy: number;

  private points: BoltPoint[] = [];
  private lifetimeMs = 0;
  private remainingMs = 0;
  private active = false;

  constructor(startX: number, startY: number, endX: number, endY: number) {
    super();

    this.startX = startX;
    this.startY = startY;
    this.dx = endX - startX;
    this.dy = endY - startY;
    this.distance = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    this.boltAngle = Math.atan2(this.dy, this.dx);

    this.glow = new BlurFilter({
      strength: GLOW_BLUR_STRENGTH,
      quality: GLOW_BLUR_QUALITY,
    });

    this.mainBolt.filters = [this.glow];
    this.mainBolt.blendMode = "add";
    this.branches.blendMode = "add";
    this.addChild(this.mainBolt, this.branches);

    this.regenerate();
    this.play();
  }

  play(): void {
    if (this.destroyed) return;

    this.lifetimeMs = randomBetween(LIFETIME_MIN_MS, LIFETIME_MAX_MS);
    this.remainingMs = this.lifetimeMs;
    this.alpha = 1;

    if (this.active) return;

    this.active = true;
    Ticker.shared.add(this.onTick);
  }

  draw(): void {
    this.mainBolt.clear();
    this.branches.clear();
    if (this.points.length < 2) return;

    this.drawMainBolt(this.points);
    this.drawBranches(this.points);
  }

  regenerate(): void {
    this.points = this.buildBoltPoints();
    this.draw();
  }

  override destroy(options?: DestroyOptions): void {
    if (this.active) {
      this.active = false;
      Ticker.shared.remove(this.onTick);
    }

    this.glow.destroy();
    super.destroy(options === undefined ? { children: true } : options);
  }

  private readonly onTick = (ticker: Ticker): void => {
    this.remainingMs -= ticker.deltaMS;
    this.regenerate();

    const fadeStartMs = this.lifetimeMs * FADE_START_FRACTION;
    this.alpha = Math.max(0, Math.min(1, this.remainingMs / fadeStartMs));

    if (this.remainingMs <= 0) {
      this.finish();
    }
  };

  private buildBoltPoints(): BoltPoint[] {
    const segmentLength = randomBetween(SEGMENT_LENGTH_MIN, SEGMENT_LENGTH_MAX);
    const segmentCount = Math.max(
      MIN_SEGMENTS,
      Math.round(this.distance / segmentLength),
    );

    const maxDisplacement = Math.max(
      MIN_DISPLACEMENT,
      this.distance * MAX_DISPLACEMENT_FRACTION,
    );
    const perpX = -Math.sin(this.boltAngle);
    const perpY = Math.cos(this.boltAngle);

    const points: BoltPoint[] = [];
    for (let i = 0; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const envelope = Math.sin(Math.PI * t);
      const offset = (Math.random() * 2 - 1) * maxDisplacement * envelope;

      points.push({
        x: this.startX + this.dx * t + perpX * offset,
        y: this.startY + this.dy * t + perpY * offset,
      });
    }

    return points;
  }

  private drawMainBolt(points: BoltPoint[]): void {
    const path = () => {
      this.mainBolt.poly(points, false);
    };

    path();
    this.mainBolt.stroke({
      width: 18,
      color: GLOW_COLOR,
      alpha: 0.35,
      cap: "round",
      join: "round",
    });

    path();
    this.mainBolt.stroke({
      width: 6,
      color: BOLT_COLOR,
      cap: "round",
      join: "round",
    });

    path();
    this.mainBolt.stroke({
      width: 2.5,
      color: CORE_COLOR,
      cap: "round",
      join: "round",
    });
  }

  private drawBranches(points: BoltPoint[]): void {
    const branchChance = randomBetween(BRANCH_CHANCE_MIN, BRANCH_CHANCE_MAX);

    for (let i = 1; i < points.length - 1; i++) {
      if (Math.random() > branchChance) continue;

      const origin = points[i];
      const length = randomBetween(BRANCH_LENGTH_MIN, BRANCH_LENGTH_MAX);
      const side = Math.random() < 0.5 ? -1 : 1;
      const angleOffset = (Math.random() * 2 - 1) * BRANCH_ANGLE_OFFSET_MAX;
      const branchAngle = this.boltAngle + side * (Math.PI / 2) + angleOffset;

      this.branches.poly(
        [
          origin,
          {
            x: origin.x + Math.cos(branchAngle) * length,
            y: origin.y + Math.sin(branchAngle) * length,
          },
        ],
        false,
      );
      this.branches.stroke({
        width: 3,
        color: BRANCH_COLOR,
        cap: "round",
      });
    }
  }

  private finish(): void {
    this.active = false;
    Ticker.shared.remove(this.onTick);
    this.parent?.removeChild(this);
    this.destroy();
  }
}
