import {
  AnimatedSprite,
  Application,
  Assets,
  Container,
  Sprite,
  Text,
  type Ticker,
  type Texture,
} from "pixi.js";
import { waypoints } from "../constants/waypoints";
import { WAVES } from "../constants/waves";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../constants/world";
import { TeslaTower } from "../entities/TeslaTower";
import { DendroTower } from "../entities/DendroTower";
import { FrostTower } from "../entities/FrostTower";
import { MAX_TOWER_LEVEL } from "../entities/Tower";
import { DendroBullet } from "../entities/DendroBullet";
import type { Enemy } from "../entities/Enemy";
import { EnemyManager } from "../managers/EnemyManager";
import { TowerManager } from "../managers/TowerManager";
import { BulletManager } from "../managers/BulletManager";
import { WaveManager } from "../managers/WaveManager";
import type { EnemyType } from "../types/enemy";
import type { SpotInfoType } from "../types/spot";
import type { TowerType } from "../types/tower";

export interface GameState {
  hp: number;
  gold: number;
  wave: number;
  enemies: number;
  towers: number;
  fps: number;
  speed: number;
  isPaused: boolean;
  isVictory: boolean;
}

export type GameStateListener = (state: GameState) => void;

const PORTAL_SPIN_SPEED = 0.4;

const PLAYER_START_HP = 100;
const PLAYER_START_GOLD = 1000;
const HP_LOSS_PER_ENEMY = 5;

const GOLD_REWARDS: Record<EnemyType, number> = {
  Slime1: 10,
  Slime2: 20,
  Slime3: 30,
  Slime4: 45,
  Slime5: 60,
  Tank: 50,
};

const TOWER_COSTS: Record<TowerType, number> = {
  Tesla: 100,
  Dendro: 150,
  Frost: 120,
};

const SELL_REFUND_RATIO = 0.5;
const UPGRADE_COST_BASE_RATIO = 0.6;

const STATE_EMIT_INTERVAL = 0.2;

const TESLA_DAMAGE = 300;
const TESLA_ATTACK_SPEED = 2;
const TESLA_ANIMATION_SPEED = 0.1;
const TESLA_ATTACK_RADIUS = 260;
const TESLA_CHAIN_RADIUS = 250;

const DENDRO_DAMAGE = 500;
const DENDRO_ATTACK_SPEED = 2;
const DENDRO_ANIMATION_SPEED = 0.05;

const FROST_DAMAGE = 250;
const FROST_ATTACK_SPEED = 1.5;
const FROST_ANIMATION_SPEED = 0.1;

export class GameEngine {
  private app?: Application;
  private container?: HTMLElement;
  private world?: Container;
  private effectsLayer?: Container;
  private portal?: Sprite;
  private victoryText?: Text;

  private teslaLevelFrames?: Texture[][];
  private dendroFrames?: Texture[];
  private frostFrames?: Texture[];
  private enemyTextures?: Record<EnemyType, Texture>;

  private towerManager?: TowerManager;
  private enemyManager?: EnemyManager;
  private waveManager?: WaveManager;
  private frostBulletManager?: BulletManager;
  private dendroBulletManager?: BulletManager;

  private destroyed = false;
  private paused = false;
  private gameSpeed = 1;
  private gold = PLAYER_START_GOLD;
  private hp = PLAYER_START_HP;
  private emitTimer = 0;

  private readonly listeners = new Set<GameStateListener>();

  async init(container: HTMLElement): Promise<void> {
    if (this.app) return;
    this.container = container;
    this.destroyed = false;
    this.paused = false;
    this.gameSpeed = 1;
    this.gold = PLAYER_START_GOLD;
    this.hp = PLAYER_START_HP;

    const app = new Application();
    await app.init({ resizeTo: container, background: 0x000000 });
    this.app = app;
    container.appendChild(app.canvas);

    const world = new Container();
    world.sortableChildren = true;
    app.stage.addChild(world);
    this.world = world;

    const bg = new Sprite(await Assets.load("/assets/background1.png"));
    world.addChild(bg);

    const waveBannerTexture = await Assets.load("/assets/wave-banner.svg");
    const waveBanner = new Sprite(waveBannerTexture);
    waveBanner.anchor.set(0.5, 0.5);
    waveBanner.position.set(WORLD_WIDTH / 2, 100);
    waveBanner.scale.set(3.5);
    world.addChild(waveBanner);

    const waveBannerText = new Text({
      text: "WAVE 1",
      style: {
        fontFamily: "ADLaM Display",
        fontSize: 70,
        fontWeight: "700",
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 4 },
      },
    });
    waveBannerText.anchor.set(0.5, 0.5);
    waveBannerText.position.set(waveBanner.x, waveBanner.y);
    world.addChild(waveBannerText);

    const portalTexture = await Assets.load("/assets/portal.png");
    const portal = new Sprite(portalTexture);
    portal.anchor.set(0.5, 0.5);
    portal.position.set(185, 1580);
    portal.scale.set(0.4);
    world.addChild(portal);
    this.portal = portal;

    const teslaLevel1Sheet = await Assets.load(
      "/assets/tesla/lvl1/tesla-lvl1.json",
    );
    const teslaLevel1Frames = teslaLevel1Sheet.animations["tesla-lvl1"];
    const teslaLevel2Frames = await Promise.all([
      Assets.load("/assets/tesla/lvl2/00.png"),
      Assets.load("/assets/tesla/lvl2/10.png"),
      Assets.load("/assets/tesla/lvl2/20.png"),
      Assets.load("/assets/tesla/lvl2/30.png"),
    ]);
    const teslaLevel3Frames = await Promise.all([
      Assets.load("/assets/tesla/lvl3/00.png"),
      Assets.load("/assets/tesla/lvl3/10.png"),
      Assets.load("/assets/tesla/lvl3/20.png"),
      Assets.load("/assets/tesla/lvl3/30.png"),
    ]);
    this.teslaLevelFrames = [
      teslaLevel1Frames,
      teslaLevel2Frames,
      teslaLevel3Frames,
    ];

    this.enemyTextures = {
      Slime1: await Assets.load("/assets/enemies/slime1.png"),
      Slime2: await Assets.load("/assets/enemies/slime2.png"),
      Slime3: await Assets.load("/assets/enemies/slime3.png"),
      Slime4: await Assets.load("/assets/enemies/slime4.png"),
      Slime5: await Assets.load("/assets/enemies/slime5.png"),
      Tank: await Assets.load("/assets/enemies/tank.png"),
    };

    const frostBulletTexture = await Assets.load("/assets/frost-bullet.svg");
    const bulletManager = new BulletManager(frostBulletTexture, 600);
    bulletManager.container.zIndex = 2;
    this.frostBulletManager = bulletManager;

    const frostSheet = await Assets.load(
      "/assets/frost-turret/frost-turret.json",
    );
    this.frostFrames = frostSheet.animations["cannon"];

    const dendroSheet = await Assets.load(
      "/assets/dendro-mortar/dendro-mortar.json",
    );
    this.dendroFrames = dendroSheet.animations["dendro-mortar"];
    const dendroBulletTexture = await Assets.load("/assets/dendro-bullet.png");
    const dendroBulletManager = new BulletManager(
      dendroBulletTexture,
      600,
      DendroBullet,
      0.3,
    );
    dendroBulletManager.container.zIndex = 2;
    this.dendroBulletManager = dendroBulletManager;

    const towerManager = new TowerManager(bulletManager, dendroBulletManager);
    this.towerManager = towerManager;

    const effectsLayer = new Container();
    effectsLayer.zIndex = 3;
    this.effectsLayer = effectsLayer;

    const enemyManager = new EnemyManager(waypoints, this.enemyTextures!);
    this.enemyManager = enemyManager;
    enemyManager.addEnemyRemovedListener((enemy) =>
      this.handleEnemyRemoved(enemy),
    );

    const waveManager = new WaveManager(enemyManager, WAVES, {
      onWaveStart: (wave) => {
        waveBannerText.text = `WAVE ${wave}`;
      },
      onVictory: () => {
        if (this.victoryText) {
          this.victoryText.visible = true;
        }
      },
    });
    this.waveManager = waveManager;

    world.addChild(enemyManager.container);
    world.addChild(bulletManager.container);
    world.addChild(dendroBulletManager.container);
    world.addChild(effectsLayer);

    const victoryText = new Text({
      text: "VICTORY!",
      style: {
        fontFamily: "Arial Narrow",
        fontSize: 120,
        fontWeight: "bold",
        fill: 0xffd700,
        stroke: { color: 0x000000, width: 6 },
      },
    });
    victoryText.anchor.set(0.5, 0.5);
    victoryText.position.set(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    victoryText.visible = false;
    victoryText.zIndex = 4;
    world.addChild(victoryText);
    this.victoryText = victoryText;

    waveManager.startWave(0);

    this.resizeWorld();
    app.renderer.on("resize", this.resizeWorld);

    app.ticker.add(this.update);

    if (this.destroyed) {
      this.destroy();
      return;
    }

    this.emitState();
  }

  destroy(): void {
    this.destroyed = true;
    this.paused = false;

    if (this.app) {
      this.app.ticker.remove(this.update);
      this.app.destroy({ removeView: true }, { children: true });
      this.app = undefined;
    }

    this.world = undefined;
    this.effectsLayer = undefined;
    this.portal = undefined;
    this.victoryText = undefined;
    this.teslaLevelFrames = undefined;
    this.dendroFrames = undefined;
    this.frostFrames = undefined;
    this.enemyTextures = undefined;
    this.towerManager = undefined;
    this.enemyManager = undefined;
    this.waveManager = undefined;
    this.frostBulletManager = undefined;
    this.dendroBulletManager = undefined;
  }

  async restart(): Promise<void> {
    this.destroy();
    if (this.container) {
      await this.init(this.container);
    }
  }

  spawnTower(type: TowerType, spot: SpotInfoType): void {
    if (this.gold < TOWER_COSTS[type]) return;

    this.gold -= TOWER_COSTS[type];
    if (type === "Tesla") {
      this.placeTeslaTower(spot);
    } else if (type === "Dendro") {
      this.placeDendroTower(spot);
    } else {
      this.placeFrostTower(spot);
    }
    this.emitState();
  }

  sellTower(spot: SpotInfoType): void {
    if (!this.towerManager) return;
    const tower = this.towerManager.removeTowerAtSpot(spot.order);
    if (!tower) return;

    this.gold += Math.round(tower.investedGold * SELL_REFUND_RATIO);
    tower.sprite.parent?.removeChild(tower.sprite);
    tower.sprite.destroy();
    this.emitState();
  }

  upgradeTower(spot: SpotInfoType): void {
    if (!this.towerManager) return;
    const tower = this.towerManager.getTowerAtSpot(spot.order);
    if (!tower) return;
    if (tower.level >= MAX_TOWER_LEVEL) return;

    const upgradeCost = Math.round(
      tower.cost * UPGRADE_COST_BASE_RATIO * tower.level,
    );
    if (this.gold < upgradeCost) return;

    this.gold -= upgradeCost;
    tower.investedGold += upgradeCost;
    tower.upgrade();
    this.emitState();
  }

  spawnEnemy(type: EnemyType): void {
    this.enemyManager?.spawnEnemy(type);
    this.emitState();
  }

  startWave(): void {
    this.waveManager?.nextWave();
    this.emitState();
  }

  pause(): void {
    this.paused = true;
    this.emitState();
  }

  resume(): void {
    this.paused = false;
    this.emitState();
  }

  setGameSpeed(speed: number): void {
    this.gameSpeed = speed;
    this.emitState();
  }

  getState(): GameState {
    return {
      hp: this.hp,
      gold: this.gold,
      wave: this.waveManager?.currentWave ?? 0,
      enemies: this.enemyManager?.getAliveEnemies().length ?? 0,
      towers: this.towerManager?.towerCount ?? 0,
      fps: this.app ? Math.round(this.app.ticker.FPS) : 0,
      speed: this.gameSpeed,
      isPaused: this.paused,
      isVictory: this.waveManager?.isVictory ?? false,
    };
  }

  subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private readonly update = (ticker: Ticker): void => {
    if (this.paused) return;
    if (
      !this.world ||
      !this.portal ||
      !this.towerManager ||
      !this.enemyManager ||
      !this.waveManager
    ) {
      return;
    }

    const deltaTime = (ticker.deltaMS / 1000) * this.gameSpeed;

    this.waveManager.update(deltaTime);
    this.enemyManager.update(deltaTime);
    this.towerManager.update(deltaTime, this.enemyManager.getAliveEnemies());

    this.portal.rotation += deltaTime * PORTAL_SPIN_SPEED;

    this.emitTimer -= deltaTime;
    if (this.emitTimer <= 0) {
      this.emitTimer = STATE_EMIT_INTERVAL;
      this.emitState();
    }
  };

  private readonly resizeWorld = (): void => {
    if (!this.app || !this.world) return;

    const scale = Math.min(
      this.app.screen.width / WORLD_WIDTH,
      this.app.screen.height / WORLD_HEIGHT,
    );

    this.world.scale.set(scale);
    this.world.position.set(
      (this.app.screen.width - WORLD_WIDTH * scale) / 2,
      (this.app.screen.height - WORLD_HEIGHT * scale) / 2,
    );
  };

  private placeTeslaTower(spot: SpotInfoType): void {
    if (
      !this.world ||
      !this.towerManager ||
      !this.teslaLevelFrames ||
      !this.effectsLayer
    ) {
      return;
    }

    const sprite = new AnimatedSprite(this.teslaLevelFrames[0]);
    sprite.position.set(spot.x, spot.y);
    sprite.scale.set(0.5);
    this.world.addChild(sprite);

    this.towerManager.addTower(
      new TeslaTower(sprite, {
        damage: TESLA_DAMAGE,
        attackSpeed: TESLA_ATTACK_SPEED,
        animationSpeed: TESLA_ANIMATION_SPEED,
        attackRadius: TESLA_ATTACK_RADIUS,
        chainRadius: TESLA_CHAIN_RADIUS,
        effectsLayer: this.effectsLayer,
        spot,
        type: "Tesla",
        cost: TOWER_COSTS.Tesla,
        levelFrames: this.teslaLevelFrames,
      }),
    );
  }

  private placeDendroTower(spot: SpotInfoType): void {
    if (
      !this.world ||
      !this.towerManager ||
      !this.dendroFrames ||
      !this.dendroBulletManager
    ) {
      return;
    }

    const sprite = new AnimatedSprite(this.dendroFrames);
    sprite.position.set(spot.x, spot.y);
    sprite.scale.set(0.5);
    this.world.addChild(sprite);

    this.towerManager.addTower(
      new DendroTower(
        sprite,
        {
          damage: DENDRO_DAMAGE,
          attackSpeed: DENDRO_ATTACK_SPEED,
          animationSpeed: DENDRO_ANIMATION_SPEED,
          spot,
          type: "Dendro",
          cost: TOWER_COSTS.Dendro,
        },
        this.dendroBulletManager,
      ),
    );
  }

  private placeFrostTower(spot: SpotInfoType): void {
    if (
      !this.world ||
      !this.towerManager ||
      !this.frostFrames ||
      !this.frostBulletManager
    ) {
      return;
    }

    const sprite = new AnimatedSprite(this.frostFrames);
    sprite.position.set(spot.x, spot.y);
    sprite.scale.set(0.5);
    this.world.addChild(sprite);

    this.towerManager.addTower(
      new FrostTower(
        sprite,
        {
          damage: FROST_DAMAGE,
          attackSpeed: FROST_ATTACK_SPEED,
          animationSpeed: FROST_ANIMATION_SPEED,
          spot,
          type: "Frost",
          cost: TOWER_COSTS.Frost,
        },
        this.frostBulletManager,
      ),
    );
  }

  private handleEnemyRemoved(enemy: Enemy): void {
    if (enemy.state === "Dead") {
      this.gold += GOLD_REWARDS[enemy.type];
    } else if (enemy.state === "ReachedEnd") {
      this.hp = Math.max(0, this.hp - HP_LOSS_PER_ENEMY);
    }
  }

  private emitState(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
