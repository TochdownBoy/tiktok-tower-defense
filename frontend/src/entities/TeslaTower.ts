import { Container, type AnimatedSprite } from "pixi.js";
import type { Enemy } from "./Enemy";
import { Tower, type TowerOptions } from "./Tower";
import { LightningEffect } from "../effects/LightningEffect";
import type { TurretStarLevel } from "../types/game";

export interface TeslaTowerOptions extends TowerOptions {
  attackRadius: number;
  chainRadius?: number;
  chainTargets?: number;
  effectsLayer: Container;
}

const DEFAULT_CHAIN_RADIUS = 250;
const DEFAULT_CHAIN_TARGETS = 1;

export class TeslaTower extends Tower {
  private readonly attackRadiusSquared: number;
  private readonly chainRadiusSquared: number;
  private readonly baseChainTargets: number;
  private maxChainTargets: number;
  private readonly effectsLayer: Container;
  private readonly chainBuffer: Enemy[] = [];

  constructor(sprite: AnimatedSprite, options: TeslaTowerOptions) {
    super(sprite, options);

    this.attackRadiusSquared = options.attackRadius * options.attackRadius;
    const chainRadius = options.chainRadius ?? DEFAULT_CHAIN_RADIUS;
    this.chainRadiusSquared = chainRadius * chainRadius;
    this.baseChainTargets = options.chainTargets ?? DEFAULT_CHAIN_TARGETS;
    this.maxChainTargets = this.computeChainTargets(this.starLevel);
    this.effectsLayer = options.effectsLayer;
  }

  protected override onStarLevelUp(): void {
    this.maxChainTargets = this.computeChainTargets(this.starLevel);
  }

  private computeChainTargets(level: TurretStarLevel): number {
    return this.baseChainTargets + Math.floor((level - 1) / 2);
  }

  protected override findPrimaryTarget(
    enemies: Enemy[],
    proposedHp: Map<Enemy, number>,
  ): Enemy | undefined {
    const tx = this.position.x;
    const ty = this.position.y;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if ((proposedHp.get(enemy) ?? enemy.hp) <= 0) continue;

      const dx = enemy.position.x - tx;
      const dy = enemy.position.y - ty;
      if (dx * dx + dy * dy <= this.attackRadiusSquared) {
        return enemy;
      }
    }

    return undefined;
  }

  protected override attack(
    primary: Enemy,
    enemies: Enemy[],
    proposedHp: Map<Enemy, number>,
  ): void {
    const chain = this.findChainTargets(primary, enemies, proposedHp);

    let fromX = this.position.x;
    let fromY = this.position.y;
    for (const target of chain) {
      this.dealDamage(target, proposedHp);
      this.spawnLightning(fromX, fromY, target.position.x, target.position.y);
      fromX = target.position.x;
      fromY = target.position.y;
    }
  }

  private findChainTargets(
    primary: Enemy,
    enemies: Enemy[],
    proposedHp: Map<Enemy, number>,
  ): Enemy[] {
    const chain = this.chainBuffer;
    chain.length = 0;
    chain.push(primary);

    let prev = primary;
    for (let i = 0; i < this.maxChainTargets - 1; i++) {
      const next = this.findChainTarget(prev, enemies, proposedHp);
      if (!next) break;
      chain.push(next);
      prev = next;
    }

    return chain;
  }

  private findChainTarget(
    from: Enemy,
    enemies: Enemy[],
    proposedHp: Map<Enemy, number>,
  ): Enemy | undefined {
    const fx = from.position.x;
    const fy = from.position.y;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (this.isAlreadyHit(enemy)) continue;
      if ((proposedHp.get(enemy) ?? enemy.hp) <= 0) continue;

      const dx = enemy.position.x - fx;
      const dy = enemy.position.y - fy;
      if (dx * dx + dy * dy <= this.chainRadiusSquared) {
        return enemy;
      }
    }

    return undefined;
  }

  private isAlreadyHit(enemy: Enemy): boolean {
    for (const hit of this.chainBuffer) {
      if (hit === enemy) return true;
    }
    return false;
  }

  private spawnLightning(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): void {
    this.effectsLayer.addChild(new LightningEffect(fromX, fromY, toX, toY));
  }
}
