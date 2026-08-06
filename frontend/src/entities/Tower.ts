import { AnimatedSprite, Container, Text, type Texture } from "pixi.js";
import type { Enemy } from "./Enemy";
import type { BulletManager } from "../managers/BulletManager";
import type { SpotInfoType } from "../types/spot";
import type { TowerType } from "../types/tower";
import type { TurretStarLevel } from "../types/game";
import { StarIndicator } from "../effects/StarIndicator";

export interface TowerOptions {
  damage: number;
  attackSpeed: number;
  animationSpeed?: number;
  anchor?: { x: number; y: number };
  spot: SpotInfoType;
  type: TowerType;
  starTexture: Texture;
}

export const MAX_STAR_LEVEL: TurretStarLevel = 6;

const DEFAULT_ANCHOR = { x: 0.5, y: 0.5 };
const DEFAULT_ANIMATION_SPEED = 8;

const DAMAGE_UPGRADE_MULTIPLIER = 1.2;
const ATTACK_SPEED_UPGRADE_MULTIPLIER = 1.1;
const ANIMATION_SPEED_UPGRADE_MULTIPLIER = 1.1;

const STARS_OFFSET_Y = -95;
const NICKNAME_OFFSET_Y = -140;

export class Tower {
  public readonly container = new Container();
  public readonly sprite: AnimatedSprite;
  public readonly spot: SpotInfoType;
  public readonly type: TowerType;
  public starLevel: TurretStarLevel = 1;
  public username = "";
  protected cooldownTimer = 0;

  protected damage: number;
  protected attackSpeed: number;
  private attacking = false;
  private readonly bulletManager?: BulletManager;
  private readonly starIndicator: StarIndicator;
  private readonly nicknameText: Text;

  constructor(
    sprite: AnimatedSprite,
    options: TowerOptions,
    bulletManager?: BulletManager,
  ) {
    this.sprite = sprite;
    this.spot = options.spot;
    this.type = options.type;
    this.damage = options.damage;
    this.attackSpeed = options.attackSpeed;
    this.bulletManager = bulletManager;

    const anchor = options.anchor ?? DEFAULT_ANCHOR;
    this.sprite.anchor.set(anchor.x, anchor.y);
    this.sprite.animationSpeed =
      options.animationSpeed ?? DEFAULT_ANIMATION_SPEED;
    this.sprite.loop = true;
    this.sprite.play();

    this.container.position.set(options.spot.x, options.spot.y);
    this.container.addChild(sprite);

    this.starIndicator = new StarIndicator(
      options.starTexture,
      this.sprite.width,
    );
    this.starIndicator.position.set(0, STARS_OFFSET_Y);
    this.container.addChild(this.starIndicator);
    this.starIndicator.setLevel(this.starLevel);

    this.nicknameText = new Text({
      text: "",
      style: {
        fontFamily: "ADLaM Display",
        fontSize: 40,
        fontWeight: "700",
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 4 },
      },
    });
    this.nicknameText.anchor.set(0.5, 0.5);
    this.nicknameText.position.set(0, NICKNAME_OFFSET_Y);
    this.nicknameText.visible = false;
    this.container.addChild(this.nicknameText);
  }

  get position(): { x: number; y: number } {
    return this.container.position;
  }

  get isAttacking(): boolean {
    return this.attacking;
  }

  setStarLevel(level: TurretStarLevel): void {
    this.starLevel = level;
    this.starIndicator.setLevel(level);
  }

  upgradeStarLevel(): boolean {
    if (this.starLevel >= MAX_STAR_LEVEL) return false;
    this.setStarLevel((this.starLevel + 1) as TurretStarLevel);
    this.damage = Math.round(this.damage * DAMAGE_UPGRADE_MULTIPLIER);
    this.attackSpeed *= ATTACK_SPEED_UPGRADE_MULTIPLIER;
    this.sprite.animationSpeed *= ANIMATION_SPEED_UPGRADE_MULTIPLIER;
    this.onStarLevelUp();
    return true;
  }

  protected onStarLevelUp(): void {}

  setNickname(username: string): void {
    this.username = username;
    this.nicknameText.text = username;
    this.nicknameText.visible = username.length > 0;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  update(
    deltaTime: number,
    enemies: Enemy[],
    proposedHp: Map<Enemy, number>,
  ): void {
    this.cooldownTimer -= deltaTime;

    const target = this.findPrimaryTarget(enemies, proposedHp);
    this.attacking = target !== undefined;
    if (!target) {
      if (this.sprite.currentFrame !== 0) {
        this.sprite.gotoAndStop(0);
      } else {
        this.sprite.stop();
      }
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
      this.bulletManager.spawnBullet(this.position.x, this.position.y, target);
    } else {
      this.dealDamage(target, proposedHp);
    }
  }

  protected dealDamage(target: Enemy, proposedHp: Map<Enemy, number>): void {
    target.takeDamage(this.damage);
    proposedHp.set(target, (proposedHp.get(target) ?? target.hp) - this.damage);
  }
}
