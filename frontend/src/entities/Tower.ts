import { AnimatedSprite } from "pixi.js";
import type { Enemy } from "./Enemy";
import type { BulletManager } from "../managers/BulletManager";
import type { SpotInfoType } from "../types/spot";
import type { TowerType } from "../types/tower";

export interface TowerOptions {
  damage: number;
  attackSpeed: number;
  animationSpeed?: number;
  anchor?: { x: number; y: number };
  spot: SpotInfoType;
  type: TowerType;
  cost: number;
}

export const MAX_TOWER_LEVEL = 3;

const DEFAULT_ANCHOR = { x: 0.5, y: 0.5 };
const DEFAULT_ANIMATION_SPEED = 8;

const DAMAGE_UPGRADE_MULTIPLIER = 1.5;
const ATTACK_SPEED_UPGRADE_MULTIPLIER = 1.25;

export class Tower {
  public readonly sprite: AnimatedSprite;
  public readonly spot: SpotInfoType;
  public readonly type: TowerType;
  public readonly cost: number;
  public investedGold: number;
  public level = 1;
  protected cooldownTimer = 0;

  protected damage: number;
  protected attackSpeed: number;
  private readonly bulletManager?: BulletManager;

  constructor(
    sprite: AnimatedSprite,
    options: TowerOptions,
    bulletManager?: BulletManager,
  ) {
    this.sprite = sprite;
    this.spot = options.spot;
    this.type = options.type;
    this.cost = options.cost;
    this.investedGold = options.cost;
    this.damage = options.damage;
    this.attackSpeed = options.attackSpeed;
    this.bulletManager = bulletManager;

    const anchor = options.anchor ?? DEFAULT_ANCHOR;
    this.sprite.anchor.set(anchor.x, anchor.y);
    this.sprite.animationSpeed =
      options.animationSpeed ?? DEFAULT_ANIMATION_SPEED;
    this.sprite.loop = true;
    this.sprite.play();
  }

  upgrade(): void {
    if (this.level >= MAX_TOWER_LEVEL) return;
    this.level++;
    this.damage = Math.round(this.damage * DAMAGE_UPGRADE_MULTIPLIER);
    this.attackSpeed *= ATTACK_SPEED_UPGRADE_MULTIPLIER;
  }

  update(
    deltaTime: number,
    enemies: Enemy[],
    proposedHp: Map<Enemy, number>,
  ): void {
    this.cooldownTimer -= deltaTime;

    const target = this.findPrimaryTarget(enemies, proposedHp);
    if (!target) {
      this.sprite.stop();
      return;
    }

    if (this.cooldownTimer > 0) {
      this.sprite.play();
      return;
    }

    this.cooldownTimer = 1 / this.attackSpeed;
    this.sprite.gotoAndPlay(0);

    this.attack(target, enemies, proposedHp);
  }

  protected findPrimaryTarget(
    enemies: Enemy[],
    proposedHp: Map<Enemy, number>,
  ): Enemy | undefined {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if ((proposedHp.get(enemy) ?? enemy.hp) > 0) {
        return enemy;
      }
    }
    return undefined;
  }

  protected attack(
    target: Enemy,
    _enemies: Enemy[],
    proposedHp: Map<Enemy, number>,
  ): void {
    if (this.bulletManager) {
      this.bulletManager.spawnBullet(
        this.sprite.position.x,
        this.sprite.position.y,
        target,
      );
    } else {
      this.dealDamage(target, proposedHp);
    }
  }

  protected dealDamage(target: Enemy, proposedHp: Map<Enemy, number>): void {
    target.takeDamage(this.damage);
    proposedHp.set(target, (proposedHp.get(target) ?? target.hp) - this.damage);
  }
}
