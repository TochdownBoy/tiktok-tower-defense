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
import { SpotInfo } from "../constants/spot";
import { ENEMY_CONFIGS } from "../constants/enemies";
import { TeslaTower } from "../entities/TeslaTower";
import { DendroTower } from "../entities/DendroTower";
import { FrostTower } from "../entities/FrostTower";
import { MAX_STAR_LEVEL, type Tower } from "../entities/Tower";
import { DendroBullet } from "../entities/DendroBullet";
import { FrostBullet } from "../entities/FrostBullet";
import type { Enemy } from "../entities/Enemy";
import { EnemyManager } from "../managers/EnemyManager";
import { TowerManager } from "../managers/TowerManager";
import { BulletManager } from "../managers/BulletManager";
import { SoundManager } from "../managers/SoundManager";
import { WaveManager } from "../managers/WaveManager";
import type { EnemyType } from "../types/enemy";
import type { SpotInfoType } from "../types/spot";
import type { TowerType } from "../types/tower";
import type {
  GameActionResult,
  MonsterActionResult,
  MonsterSpawnInput,
  TurretActionResult,
  TurretGiftInput,
  TurretGiftResult,
  TurretSpawnInput,
} from "../types/game";
import { formatTimer } from "../utils/formatTime";

export interface GameState {
  hp: number;
  wave: number;
  enemies: number;
  towers: number;
  fps: number;
  speed: number;
  isPaused: boolean;
  isVictory: boolean;
  isDefeat: boolean;
  isActive: boolean;
  currentWave: number;
  totalWaves: number;
  waveDurationSeconds: number;
  remainingWaveSeconds: number;
}

export type GameStateListener = (state: GameState) => void;

const PORTAL_SPIN_SPEED = 0.4;

const PLAYER_START_HP = 100;
const HP_LOSS_PER_ENEMY = 5;

const WAVE_DURATION_SECONDS = 30;

const END_SIGN_SCALE = 7;

const TOWER_TYPES: TowerType[] = ["Tesla", "Dendro", "Frost"];

const STATE_EMIT_INTERVAL = 0.2;

const TESLA_DAMAGE = 600;
const TESLA_ATTACK_SPEED = 2;
const TESLA_ANIMATION_SPEED = 0.1;
const TESLA_ATTACK_RADIUS = 260;
const TESLA_CHAIN_RADIUS = 250;

const DENDRO_DAMAGE = 950;
const DENDRO_ATTACK_SPEED = 2;
const DENDRO_ANIMATION_SPEED = 0.05;

const FROST_DAMAGE = 500;
const FROST_ATTACK_SPEED = 1.5;
const FROST_ANIMATION_SPEED = 0.1;
const FROST_SLOW_FACTOR = 0.8;
const FROST_SLOW_DURATION = 3;

const DENDRO_ROOT_DURATION = 1;

function resolveTowerType(value: string): TowerType | undefined {
  const target = value.trim().toLowerCase();
  return TOWER_TYPES.find((type) => type.toLowerCase() === target);
}

function resolveEnemyType(value: string): EnemyType | undefined {
  const target = value.trim().toLowerCase();
  return (Object.keys(ENEMY_CONFIGS) as EnemyType[]).find(
    (type) => type.toLowerCase() === target,
  );
}

export class GameEngine {
  private app?: Application;
  private container?: HTMLElement;
  private world?: Container;
  private effectsLayer?: Container;
  private portal?: Sprite;
  private victorySign?: Sprite;
  private defeatSign?: Sprite;
  private waveBannerText?: Text;
  private waveTimerText?: Text;

  private teslaFrames?: Texture[];
  private dendroFrames?: Texture[];
  private frostFrames?: Texture[];
  private enemyTextures?: Record<EnemyType, Texture>;
  private starTexture?: Texture;

  private towerManager?: TowerManager;
  private enemyManager?: EnemyManager;
  private waveManager?: WaveManager;
  private frostBulletManager?: BulletManager;
  private dendroBulletManager?: BulletManager;
  private soundManager?: SoundManager;

  private destroyed = false;
  private paused = false;
  private isActive = false;
  private defeated = false;
  private gameSpeed = 1;
  private hp = PLAYER_START_HP;
  private emitTimer = 0;
  private lastBannerLabel = "";
  private lastTimerLabel = "";

  private readonly listeners = new Set<GameStateListener>();

  async init(container: HTMLElement): Promise<void> {
    if (this.app) return;
    this.container = container;
    this.destroyed = false;
    this.paused = false;
    this.isActive = false;
    this.defeated = false;
    this.gameSpeed = 1;
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
    this.waveBannerText = waveBannerText;
    this.lastBannerLabel = "WAVE 1";

    const waveTimerText = new Text({
      text: "",
      style: {
        fontFamily: "ADLaM Display",
        fontSize: 56,
        fontWeight: "700",
        fill: 0xffd700,
        stroke: { color: 0x000000, width: 4 },
      },
    });
    waveTimerText.anchor.set(0, 0.5);
    waveTimerText.position.set(
      waveBannerText.x + waveBannerText.width / 2 + 28,
      waveBannerText.y,
    );
    world.addChild(waveTimerText);
    this.waveTimerText = waveTimerText;

    const portalTexture = await Assets.load("/assets/portal.png");
    const portal = new Sprite(portalTexture);
    portal.anchor.set(0.5, 0.5);
    portal.position.set(185, 1580);
    portal.scale.set(0.4);
    world.addChild(portal);
    this.portal = portal;

    const teslaSheet = await Assets.load("/assets/tesla/lvl1/tesla-lvl1.json");
    this.teslaFrames = teslaSheet.animations["tesla-lvl1"];

    this.starTexture = await Assets.load("/assets/star.svg");

    this.enemyTextures = {
      Slime1: await Assets.load("/assets/enemies/slime1.png"),
      Slime2: await Assets.load("/assets/enemies/slime2.png"),
      Slime3: await Assets.load("/assets/enemies/slime3.png"),
      Slime4: await Assets.load("/assets/enemies/slime4.png"),
      Slime5: await Assets.load("/assets/enemies/slime5.png"),
      Tank: await Assets.load("/assets/enemies/tank.png"),
    };

    const frostBulletTexture = await Assets.load("/assets/frost-bullet.svg");
    const soundManager = new SoundManager();
    await soundManager.load();
    this.soundManager = soundManager;

    const bulletManager = new BulletManager(
      frostBulletTexture,
      2000,
      FrostBullet,
      0.15,
      FROST_DAMAGE,
      () => this.soundManager?.playIceHit(),
      (enemy) => enemy.applySlowdown(FROST_SLOW_FACTOR, FROST_SLOW_DURATION),
    );
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
      1600,
      DendroBullet,
      0.3,
      DENDRO_DAMAGE,
      undefined,
      (enemy) => enemy.applyRoot(DENDRO_ROOT_DURATION),
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
      waveDurationSeconds: WAVE_DURATION_SECONDS,
      onWaveStart: (wave) => {
        if (!this.waveBannerText) return;
        const label = `WAVE ${wave}`;
        this.waveBannerText.text = label;
        this.lastBannerLabel = label;
        this.lastTimerLabel = "";
        this.updateWaveBanner();
      },
    });
    this.waveManager = waveManager;

    world.addChild(enemyManager.container);
    world.addChild(bulletManager.container);
    world.addChild(dendroBulletManager.container);
    world.addChild(effectsLayer);

    const victoryTexture = await Assets.load({
      src: "/assets/victory.svg",
      data: { resolution: 2 },
    });
    const victorySign = new Sprite(victoryTexture);
    victorySign.anchor.set(0.5, 0.5);
    victorySign.position.set(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    victorySign.scale.set(END_SIGN_SCALE);
    victorySign.visible = false;
    victorySign.zIndex = 4;
    world.addChild(victorySign);
    this.victorySign = victorySign;

    const defeatTexture = await Assets.load({
      src: "/assets/defeat.svg",
      data: { resolution: 2.5 },
    });
    const defeatSign = new Sprite(defeatTexture);
    defeatSign.anchor.set(0.5, 0.5);
    defeatSign.position.set(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    defeatSign.scale.set(END_SIGN_SCALE);
    defeatSign.visible = false;
    defeatSign.zIndex = 4;
    world.addChild(defeatSign);
    this.defeatSign = defeatSign;

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
    this.isActive = false;

    if (this.app) {
      this.app.ticker.remove(this.update);
      this.app.destroy({ removeView: true }, { children: true });
      this.app = undefined;
    }

    this.world = undefined;
    this.effectsLayer = undefined;
    this.portal = undefined;
    this.victorySign = undefined;
    this.defeatSign = undefined;
    this.waveBannerText = undefined;
    this.waveTimerText = undefined;
    this.teslaFrames = undefined;
    this.dendroFrames = undefined;
    this.frostFrames = undefined;
    this.enemyTextures = undefined;
    this.starTexture = undefined;
    this.towerManager = undefined;
    this.enemyManager = undefined;
    this.waveManager = undefined;
    this.frostBulletManager = undefined;
    this.dendroBulletManager = undefined;
    this.soundManager?.destroy();
    this.soundManager = undefined;
  }

  async restart(): Promise<void> {
    this.destroy();
    if (this.container) {
      await this.init(this.container);
    }
  }

  startGame(): GameActionResult {
    if (this.isActive) {
      return {
        success: false,
        action: "skipped",
        reason: "game_already_active",
      };
    }
    if (!this.towerManager || !this.waveManager || !this.enemyManager) {
      return { success: false, action: "skipped", reason: "invalid_input" };
    }

    this.clearAllTurrets();
    this.clearAllBullets();
    this.clearAllMonsters();
    this.hp = PLAYER_START_HP;
    this.defeated = false;
    this.isActive = true;

    if (this.victorySign) {
      this.victorySign.visible = false;
    }
    if (this.defeatSign) {
      this.defeatSign.visible = false;
    }

    this.waveManager.reset();
    this.waveManager.startWave(0);
    this.soundManager?.playForest();
    this.emitState();
    return { success: true, action: "game_started" };
  }

  startNextWave(): GameActionResult {
    if (!this.isActive) {
      return { success: false, action: "skipped", reason: "game_not_active" };
    }
    if (!this.waveManager) {
      return { success: false, action: "skipped", reason: "invalid_input" };
    }
    if (
      this.waveManager.isVictory ||
      this.waveManager.currentWave >= WAVES.length
    ) {
      return { success: false, action: "skipped", reason: "no_next_wave" };
    }

    this.waveManager.nextWave();
    this.emitState();
    return { success: true, action: "wave_started" };
  }

  startWave(): GameActionResult {
    return this.startNextWave();
  }

  finishGame(): GameActionResult {
    return this.finishGameInternal("none");
  }

  handleTurretGift(input: TurretGiftInput): TurretGiftResult {
    const username = input?.username?.trim();
    const turretType = input?.turretType;
    if (!username || typeof turretType !== "string") {
      return { success: false, action: "skipped", reason: "invalid_input" };
    }
    if (!this.isActive) {
      return { success: false, action: "skipped", reason: "game_not_active" };
    }

    const type = resolveTowerType(turretType);
    if (!type) {
      return {
        success: false,
        action: "skipped",
        reason: "turret_type_not_found",
      };
    }

    if (this.getFreeSpots().length > 0) {
      return this.spawnTurret({ username, turretType: type });
    }

    return this.upgradeFirstTurretByType({ username, turretType: type });
  }

  spawnTurret(input: TurretSpawnInput): TurretActionResult {
    const username = input?.username?.trim();
    const turretType = input?.turretType;
    if (!username || typeof turretType !== "string") {
      return { success: false, action: "skipped", reason: "invalid_input" };
    }
    if (!this.isActive) {
      return { success: false, action: "skipped", reason: "game_not_active" };
    }

    const type = resolveTowerType(turretType);
    if (!type) {
      return {
        success: false,
        action: "skipped",
        reason: "turret_type_not_found",
      };
    }

    const freeSpots = this.getFreeSpots();
    if (freeSpots.length === 0) {
      return { success: false, action: "skipped", reason: "no_free_slots" };
    }

    const spot = freeSpots[Math.floor(Math.random() * freeSpots.length)];
    const tower = this.createTurret(type, spot, username);
    if (!tower) {
      return { success: false, action: "skipped", reason: "invalid_input" };
    }

    this.emitState();
    return {
      success: true,
      action: "turret_spawned",
      data: {
        type: tower.type,
        spotOrder: spot.order,
        spot,
        level: tower.starLevel,
      },
    };
  }

  upgradeFirstTurretByType(input: TurretSpawnInput): TurretActionResult {
    const username = input?.username?.trim();
    const turretType = input?.turretType;
    if (!username || typeof turretType !== "string") {
      return { success: false, action: "skipped", reason: "invalid_input" };
    }
    if (!this.isActive) {
      return { success: false, action: "skipped", reason: "game_not_active" };
    }

    const type = resolveTowerType(turretType);
    if (!type) {
      return {
        success: false,
        action: "skipped",
        reason: "turret_type_not_found",
      };
    }

    const tower = this.towerManager?.getFirstTowerByType(type);
    if (!tower) {
      return {
        success: false,
        action: "skipped",
        reason: "matching_turret_not_found",
      };
    }
    if (tower.starLevel >= MAX_STAR_LEVEL) {
      return { success: false, action: "skipped", reason: "turret_max_level" };
    }

    tower.upgradeStarLevel();
    tower.setNickname(username);
    this.emitState();
    return {
      success: true,
      action: "turret_upgraded",
      data: {
        type: tower.type,
        spotOrder: tower.spot.order,
        spot: tower.spot,
        level: tower.starLevel,
      },
    };
  }

  spawnMonster(input: MonsterSpawnInput): MonsterActionResult {
    const monsterType = input?.monsterType;
    if (typeof monsterType !== "string") {
      return { success: false, action: "skipped", reason: "invalid_input" };
    }
    if (!this.isActive) {
      return { success: false, action: "skipped", reason: "game_not_active" };
    }

    const type = resolveEnemyType(monsterType);
    if (!type) {
      return {
        success: false,
        action: "skipped",
        reason: "monster_type_not_found",
      };
    }
    if (!this.enemyManager) {
      return { success: false, action: "skipped", reason: "invalid_input" };
    }

    this.enemyManager.spawnEnemy(type);
    this.emitState();
    return { success: true, action: "monster_spawned", data: { type } };
  }

  clearAllTurrets(): void {
    if (!this.towerManager) return;
    const towers = this.towerManager.clear();
    for (const tower of towers) {
      tower.destroy();
    }
    this.emitState();
  }

  clearAllMonsters(): void {
    if (!this.enemyManager) return;
    this.enemyManager.clear();
    this.emitState();
  }

  getGameState(): GameState {
    return this.getState();
  }

  spawnTower(type: TowerType, spot: SpotInfoType): void {
    if (this.isSpotOccupied(spot.order)) return;

    this.createTurret(type, spot, "");
    this.emitState();
  }

  sellTower(spot: SpotInfoType): void {
    if (!this.towerManager) return;
    const tower = this.towerManager.removeTowerAtSpot(spot.order);
    if (!tower) return;

    tower.destroy();
    this.emitState();
  }

  upgradeTower(spot: SpotInfoType): void {
    if (!this.towerManager) return;
    const tower = this.towerManager.getTowerAtSpot(spot.order);
    if (!tower) return;
    if (tower.starLevel >= MAX_STAR_LEVEL) return;

    tower.upgradeStarLevel();
    this.emitState();
  }

  spawnEnemy(type: EnemyType): void {
    this.enemyManager?.spawnEnemy(type);
    this.emitState();
  }

  pause(): void {
    this.paused = true;
    this.soundManager?.stopForest();
    this.emitState();
  }

  resume(): void {
    this.paused = false;
    if (this.isActive) {
      this.soundManager?.playForest();
    }
    this.emitState();
  }

  setGameSpeed(speed: number): void {
    this.gameSpeed = speed;
    this.emitState();
  }

  getState(): GameState {
    return {
      hp: this.hp,
      wave: this.waveManager?.currentWave ?? 0,
      enemies: this.enemyManager?.getAliveEnemies().length ?? 0,
      towers: this.towerManager?.towerCount ?? 0,
      fps: this.app ? Math.round(this.app.ticker.FPS) : 0,
      speed: this.gameSpeed,
      isPaused: this.paused,
      isVictory: this.waveManager?.isVictory ?? false,
      isDefeat: this.defeated,
      isActive: this.isActive,
      currentWave: this.waveManager?.currentWave ?? 0,
      totalWaves: WAVES.length,
      waveDurationSeconds: WAVE_DURATION_SECONDS,
      remainingWaveSeconds: this.isActive
        ? (this.waveManager?.remainingSeconds ?? 0)
        : 0,
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

    if (this.isActive) {
      this.waveManager.update(deltaTime);
      if (this.waveManager.isVictory) {
        this.finishGameInternal("victory");
      } else {
        this.updateWaveBanner();
      }
    }

    this.enemyManager.update(deltaTime);
    if (this.isActive && this.hp <= 0) {
      this.finishGameInternal("defeat");
    }
    this.towerManager.update(deltaTime, this.enemyManager.getAliveEnemies());

    if (this.towerManager.hasAttackingTowers("Tesla")) {
      this.soundManager?.playTeslaHit();
    } else {
      this.soundManager?.stopTeslaHit();
    }

    this.portal.rotation += deltaTime * PORTAL_SPIN_SPEED;

    this.emitTimer -= deltaTime;
    if (this.emitTimer <= 0) {
      this.emitTimer = STATE_EMIT_INTERVAL;
      this.emitState();
    }
  };

  private finishGameInternal(
    result: "victory" | "defeat" | "none",
  ): GameActionResult {
    if (!this.isActive) {
      return { success: false, action: "skipped", reason: "game_not_active" };
    }

    this.isActive = false;
    this.defeated = result === "defeat";
    this.soundManager?.stopForest();
    this.clearAllBullets();
    this.clearAllTurrets();
    this.clearAllMonsters();
    this.waveManager?.reset();

    if (this.victorySign) {
      this.victorySign.visible = result === "victory";
    }
    if (this.defeatSign) {
      this.defeatSign.visible = result === "defeat";
    }
    this.resetWaveBanner();
    this.emitState();
    return { success: true, action: "game_finished" };
  }

  private clearAllBullets(): void {
    this.frostBulletManager?.clear();
    this.dendroBulletManager?.clear();
  }

  private createTurret(
    type: TowerType,
    spot: SpotInfoType,
    username: string,
  ): Tower | undefined {
    let tower: Tower | undefined;
    if (type === "Tesla") {
      tower = this.placeTeslaTower(spot);
    } else if (type === "Dendro") {
      tower = this.placeDendroTower(spot);
    } else {
      tower = this.placeFrostTower(spot);
    }
    if (tower && username) {
      tower.setNickname(username);
    }
    return tower;
  }

  private getFreeSpots(): SpotInfoType[] {
    if (!this.towerManager) return [];
    const occupied = new Set(
      this.towerManager.getTowers().map((tower) => tower.spot.order),
    );
    return SpotInfo.filter((spot) => !occupied.has(spot.order));
  }

  private isSpotOccupied(order: number): boolean {
    return this.towerManager?.getTowerAtSpot(order) !== undefined;
  }

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

  private updateWaveBanner(): void {
    if (!this.waveBannerText || !this.waveTimerText || !this.waveManager) {
      return;
    }

    const label = `WAVE ${this.waveManager.currentWave}`;
    if (label !== this.lastBannerLabel) {
      this.waveBannerText.text = label;
      this.lastBannerLabel = label;
      this.lastTimerLabel = "";
    }

    const timeLabel = formatTimer(this.waveManager.remainingSeconds);
    if (timeLabel !== this.lastTimerLabel) {
      this.waveTimerText.text = timeLabel;
      this.lastTimerLabel = timeLabel;
      this.waveTimerText.position.set(
        this.waveBannerText.x + this.waveBannerText.width / 2 + 28,
        this.waveBannerText.y,
      );
    }
  }

  private resetWaveBanner(): void {
    if (!this.waveBannerText || !this.waveTimerText) return;
    this.waveBannerText.text = "WAVE 1";
    this.waveTimerText.text = "";
    this.lastBannerLabel = "WAVE 1";
    this.lastTimerLabel = "";
  }

  private placeTeslaTower(spot: SpotInfoType): TeslaTower | undefined {
    if (
      !this.world ||
      !this.towerManager ||
      !this.teslaFrames ||
      !this.effectsLayer ||
      !this.starTexture
    ) {
      return undefined;
    }

    const sprite = new AnimatedSprite(this.teslaFrames);
    sprite.scale.set(0.5);

    const tower = new TeslaTower(sprite, {
      damage: TESLA_DAMAGE,
      attackSpeed: TESLA_ATTACK_SPEED,
      animationSpeed: TESLA_ANIMATION_SPEED,
      attackRadius: TESLA_ATTACK_RADIUS,
      chainRadius: TESLA_CHAIN_RADIUS,
      effectsLayer: this.effectsLayer,
      spot,
      type: "Tesla",
      starTexture: this.starTexture,
    });
    this.world.addChild(tower.container);
    this.towerManager.addTower(tower);
    return tower;
  }

  private placeDendroTower(spot: SpotInfoType): DendroTower | undefined {
    if (
      !this.world ||
      !this.towerManager ||
      !this.dendroFrames ||
      !this.dendroBulletManager ||
      !this.starTexture
    ) {
      return undefined;
    }

    const sprite = new AnimatedSprite(this.dendroFrames);
    sprite.scale.set(0.5);

    const tower = new DendroTower(
      sprite,
      {
        damage: DENDRO_DAMAGE,
        attackSpeed: DENDRO_ATTACK_SPEED,
        animationSpeed: DENDRO_ANIMATION_SPEED,
        spot,
        type: "Dendro",
        starTexture: this.starTexture,
      },
      this.dendroBulletManager,
    );
    this.world.addChild(tower.container);
    this.towerManager.addTower(tower);
    return tower;
  }

  private placeFrostTower(spot: SpotInfoType): FrostTower | undefined {
    if (
      !this.world ||
      !this.towerManager ||
      !this.frostFrames ||
      !this.frostBulletManager ||
      !this.starTexture
    ) {
      return undefined;
    }

    const sprite = new AnimatedSprite(this.frostFrames);
    sprite.scale.set(0.5);

    const tower = new FrostTower(
      sprite,
      {
        damage: FROST_DAMAGE,
        attackSpeed: FROST_ATTACK_SPEED,
        animationSpeed: FROST_ANIMATION_SPEED,
        spot,
        type: "Frost",
        starTexture: this.starTexture,
      },
      this.frostBulletManager,
    );
    this.world.addChild(tower.container);
    this.towerManager.addTower(tower);
    return tower;
  }

  private handleEnemyRemoved(enemy: Enemy): void {
    if (enemy.state === "ReachedEnd") {
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
