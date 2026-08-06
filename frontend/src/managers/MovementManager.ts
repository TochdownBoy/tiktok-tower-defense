import { Sprite } from "pixi.js";
import type { Waypoint } from "../types/waypoint";

export class MovementManager {
  public currentWaypointIndex = 0;
  public reachedEnd = false;
  public distanceTravelled = 0;
  public speedMultiplier = 1;
  public isRooted = false;

  constructor(
    private readonly waypoints: Waypoint[],
    private readonly sprite: Sprite,
    private readonly speed: number,
    private readonly scale: number,
  ) {
    this.sprite.scale.set(this.scale);
    this.applyDirection(0);
  }

  get velocity(): { x: number; y: number } {
    if (this.isRooted) {
      return { x: 0, y: 0 };
    }

    const target = this.waypoints[this.currentWaypointIndex];
    if (!target) {
      return { x: 0, y: 0 };
    }

    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) {
      return { x: 0, y: 0 };
    }

    const step = this.speed * this.speedMultiplier;
    return {
      x: (dx / distance) * step,
      y: (dy / distance) * step,
    };
  }

  getPositionAfterTime(time: number): { x: number; y: number } {
    const distance =
      this.distanceTravelled + this.speed * this.speedMultiplier * time;
    return this.getPositionAtDistance(distance);
  }

  private getPositionAtDistance(distance: number): { x: number; y: number } {
    const first = this.waypoints[0];
    const last = this.waypoints[this.waypoints.length - 1];

    if (distance <= 0) {
      return { x: first.x, y: first.y };
    }

    let travelled = 0;
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const a = this.waypoints[i];
      const b = this.waypoints[i + 1];
      const segmentLength = Math.hypot(b.x - a.x, b.y - a.y);
      if (segmentLength === 0) continue;

      if (travelled + segmentLength >= distance) {
        const t = (distance - travelled) / segmentLength;
        return {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
        };
      }
      travelled += segmentLength;
    }

    return { x: last.x, y: last.y };
  }

  update(deltaTime: number): void {
    if (this.isRooted) return;

    const target = this.waypoints[this.currentWaypointIndex];
    if (!target) {
      this.reachedEnd = true;
      return;
    }

    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const distance = Math.hypot(dx, dy);
    const step = this.speed * this.speedMultiplier * deltaTime;

    this.distanceTravelled += step;

    if (distance <= step) {
      this.sprite.position.set(target.x, target.y);
      this.currentWaypointIndex++;
      if (this.currentWaypointIndex >= this.waypoints.length) {
        this.reachedEnd = true;
      }
      return;
    }

    this.applyDirection(dx);
    this.sprite.x += (dx / distance) * step;
    this.sprite.y += (dy / distance) * step;
  }

  private applyDirection(dx: number): void {
    this.sprite.scale.x = dx < 0 ? -this.scale : this.scale;
  }
}
