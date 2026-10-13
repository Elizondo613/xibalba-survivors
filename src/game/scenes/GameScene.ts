import Phaser from "phaser";
import { Player } from "../entities/Player";
import { Enemy, ENRAGE_COOLDOWN_MULT } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { ExpGem } from "../entities/ExpGem";
import { SpawnSystem } from "../systems/SpawnSystem";
import { WeaponSystem, type WeaponContext } from "../systems/WeaponSystem";
import { rollUpgradeOptions, applyUpgrade, type PassiveLevels } from "../systems/UpgradeSystem";
import {
  BOSS_HEAL_PCT_CAP,
  ENEMY_DEFS,
  PASSIVE_DEFS,
  INFINITE_BOSS_AT_SECONDS,
  INFINITE_CYCLE_STEP,
  INFINITE_HOUSE_HEAL_PCT,
  STORY_BOSS_AT_SECONDS,
  RUN_DURATION_SECONDS,
  SPAWN_CAPS,
  WEAPON_DEFS,
  WORLD_SIZE,
  difficultyAt,
  xpToNextLevel,
} from "../config";
import { MAPS, isFinalMap } from "../maps";
import { audioManager } from "../utils/AudioManager";
import { touchInputState } from "../utils/InputState";
import { useGameStore, gameBridge } from "../../store/gameStore";
import type { EnemyKind, GameMode, UpgradeOption } from "../types";

/** A frost eruption waiting to go off (Casa del Frío). */
/** A ground eruption waiting to go off: frost (Casa del Frío) or
 * fire that keeps burning afterwards (Casa del Fuego). */
interface GroundHazard {
  x: number;
  y: number;
  radius: number;
  armedAt: number;
  detonateAt: number;
  damage: number;
  slowMs: number;
  color: number;
  lingerMs: number;
  lingerDamage: number;
}

/** Burning ground: hurts the player while they stand on it. */
interface FirePatch {
  x: number;
  y: number;
  radius: number;
  expiresAt: number;
  damage: number;
  color: number;
}

/** Performance cap on simultaneous fire patches (oldest burn out first). */
const MAX_FIRE_PATCHES = 90;

/** Dev/test commands, only exposed in `npm run dev` (see installDevTools). */
interface XibalbaDevTools {
  help: () => void;
  warp: (house: number, fullLoadout?: boolean) => void;
  full: () => void;
  god: () => void;
  boss: () => void;
  clear: () => void;
}

declare global {
  interface Window {
    xibalba?: XibalbaDevTools;
  }
}

let idCounter = 0;
const nextId = () => `e${idCounter++}`;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies = new Map<string, Enemy>();
  private projectiles: Projectile[] = [];
  private gems: ExpGem[] = [];
  private weaponSystem = new WeaponSystem();
  private spawnSystem = new SpawnSystem("camazotz", undefined, STORY_BOSS_AT_SECONDS);
  private passiveLevels: PassiveLevels = {};

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private running = false;
  private mode: GameMode = "story";
  private mapIndex = 0;
  private difficultyTier = 1;
  private elapsedSeconds = 0;
  /** Cumulative time across every map in a story run (elapsedSeconds
   * resets each map for the per-map 5-minute timer; this doesn't —
   * it's what actually gets recorded as the run's timeSurvived). */
  private totalElapsedSeconds = 0;
  private level = 1;
  private xp = 0;
  private kills = 0;
  private cacaoCollected = 0;
  private hudAccumulator = 0;
  private pendingLevelUps = 0;

  private vignette!: Phaser.GameObjects.Image;
    /** Hun-Camé's phase 3: the world goes dark except around the player. */
  private darkness!: Phaser.GameObjects.Image;
  private fxLayer!: Phaser.GameObjects.Graphics;

  /** Floor of the current house — its texture is swapped per map. */
  private ground!: Phaser.GameObjects.TileSprite;
  /** Redrawn every frame: warning lines for enemies about to dash. */
  private telegraphLayer!: Phaser.GameObjects.Graphics;
  private hazards: GroundHazard[] = [];
  private firePatches: FirePatch[] = [];
  /** Any console cheat used this run → records are not saved. */
  private cheatsUsed = false;

  /** When a mustDefeatBoss house is won, in elapsedSeconds. Lives on the
   * game clock (frozen during level-ups) so a shop opening right after
   * the kill can't cancel the victory. */
  private victoryAtElapsed: number | null = null;
  /** Modo Infinito: lap through the houses (1, 2, 3…) and houses cleared. */
  private cycle = 1;
  private housesCleared = 0;

  constructor() {
    super("GameScene");
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

      this.ground = this.add
      .tileSprite(0, 0, WORLD_SIZE, WORLD_SIZE, MAPS[0].groundTexture)
      .setOrigin(0, 0)
      .setDepth(0);

    this.player = new Player(this, WORLD_SIZE / 2, WORLD_SIZE / 2);
    this.player.sprite.setCollideWorldBounds(true);

    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    this.fxLayer = this.add.graphics().setDepth(6);

    this.telegraphLayer = this.add.graphics().setDepth(6);

    this.vignette = this.add
      .image(0, 0, "tex-vignette")
      .setScrollFactor(0)
      .setDepth(50)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setAlpha(0.9);
    this.darkness = this.add
      .image(0, 0, "tex-darkness")
      .setScrollFactor(0)
      .setDepth(49)
      .setAlpha(0);
    this.layoutVignette();
    this.handleResize(this.scale.gameSize);
    this.scale.on("resize", this.handleResize, this);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys("W,A,S,D") as Record<
        string,
        Phaser.Input.Keyboard.Key
      >;
    }

    gameBridge.chooseUpgrade = (option) => this.chooseUpgrade(option);
    gameBridge.restart = () => this.beginRun();
    gameBridge.requestStart = () => this.beginRun();
    gameBridge.advanceMap = () => this.advanceToNextMap();

    // Doom-style cheats, available to anyone who opens the browser
    // console (F12) — both in `npm run dev` and in the published build.
    this.installDevTools();

    this.running = false;
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
    this.layoutVignette();
  }

  private layoutVignette() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.vignette.setPosition(w / 2, h / 2);
    const scale = Math.max(w, h) / 512 + 0.6;
    this.vignette.setScale(scale);
    // Slightly larger than the vignette so the black corners always
    // cover the whole screen.
    this.darkness?.setPosition(w / 2, h / 2).setScale(Math.max(w, h) / 512 + 1.2);
  }

  // ---------------------------------------------------------------
  // Run lifecycle
  // ---------------------------------------------------------------

  private beginRun() {
    this.physics.resume();
    
    // A new run starts clean — unless god mode is still switched on,
    // which would make that run a cheated one from the first second.
    this.cheatsUsed = this.player.godMode;
    useGameStore.getState().setCheatsActive(this.cheatsUsed);

    this.enemies.forEach((e) => e.destroy());
    this.enemies.clear();
    this.projectiles.forEach((p) => p.destroy());
    this.projectiles = [];
    this.gems.forEach((g) => g.destroy());
    this.gems = [];

    // Every run (story or infinite) starts at the first house.
    this.mode = useGameStore.getState().mode;
    this.cycle = 1;
    this.housesCleared = 0;
    this.loadHouse(0);

    this.weaponSystem = new WeaponSystem();
    this.weaponSystem.addOrUpgrade("obsidianDart");
    this.passiveLevels = {};

    this.player.mods = {
      speedMult: 1,
      maxHpBonus: 0,
      damageMult: 1,
      pickupRadiusBonus: 0,
      damageReduction: 0,
    };
    this.player.maxHp = 100;
    this.player.hp = 100;
    this.player.sprite.setPosition(WORLD_SIZE / 2, WORLD_SIZE / 2);
    this.player.sprite.setScale(2.4);
    this.player.lastHitAt = -9999;
    this.player.slowUntil = 0;

    this.elapsedSeconds = 0;
    this.totalElapsedSeconds = 0;
    this.level = 1;
    this.xp = 0;
    this.kills = 0;
    this.cacaoCollected = 0;
    this.pendingLevelUps = 0;
    this.running = true;

    useGameStore.getState().setPhase("playing");
    useGameStore.getState().setHud({
      hp: this.player.hp,
      maxHp: this.player.effectiveMaxHp,
      level: this.level,
      xp: this.xp,
      xpToNext: xpToNextLevel(this.level),
      timeSurvived: 0,
      kills: 0,
      cacaoCollected: 0,
      bossActive: false,
      cycle: 1,
    });

    audioManager.unlock();
  }

  /** Modo Historia only: advances to the next "house" of Xibalba
   * without resetting the player's build, level, or kill count — only
   * the arena (enemies/projectiles/gems) and the per-map 5-minute
   * timer reset. Called from the zone-clear screen's "Continuar". */
  private advanceToNextMap() {
    this.physics.resume();

    this.enemies.forEach((e) => e.destroy());
    this.enemies.clear();
    this.projectiles.forEach((p) => p.destroy());
    this.projectiles = [];
    this.gems.forEach((g) => g.destroy());
    this.gems = [];

    this.loadHouse(this.mapIndex + 1);
    // Small grace heal between houses of Xibalba — carrying near-zero
    // HP straight into a harder map would feel unfair.
    this.player.heal(30);

    this.running = true;
    useGameStore.getState().setBoss(false);
    useGameStore.getState().setPhase("playing");
    this.syncHud();
  }

    /** Sets up house `index` for the current mode: floor, enemy pool,
   * boss timing and difficulty. Clears hazards, but NOT enemies/gems —
   * the caller decides that. Also restarts the per-house clock. */
  private loadHouse(index: number) {
    const map = MAPS[index];
    this.mapIndex = index;
    useGameStore.getState().setMapIndex(index);

    // Modo Infinito: every lap through the 6 houses stacks difficulty.
    const cycleMult = this.mode === "infinite" ? 1 + (this.cycle - 1) * INFINITE_CYCLE_STEP : 1;
    this.difficultyTier = map.difficultyTier * cycleMult;
    const bossAt = this.mode === "infinite" ? INFINITE_BOSS_AT_SECONDS : STORY_BOSS_AT_SECONDS;
    this.spawnSystem = new SpawnSystem(map.bossKind, map.eliteKind, bossAt, cycleMult);

    this.ground.setTexture(map.groundTexture);
    this.telegraphLayer.clear();
    this.hazards = [];
    this.firePatches = [];
    this.tweens.killTweensOf(this.darkness);
    this.darkness.setAlpha(0);
    this.victoryAtElapsed = null;
    this.elapsedSeconds = 0;
  }

  /** Modo Infinito: the house boss died → purge the arena, heal a bit
   * and move straight on to the next house (no pause screen). After
   * Hun-Camé it loops back to the first house, one cycle stronger. */
  private advanceInfiniteHouse() {
    this.housesCleared += 1;
    let next = this.mapIndex + 1;
    if (next >= MAPS.length) {
      next = 0;
      this.cycle += 1;
    }

    this.enemies.forEach((e) => e.destroy());
    this.enemies.clear();
    this.projectiles.forEach((p) => p.destroy());
    this.projectiles = [];
    // Gems stay on the floor: the XP was earned.

    this.loadHouse(next);
    this.player.heal(this.player.effectiveMaxHp * INFINITE_HOUSE_HEAL_PCT);
    useGameStore.getState().setBoss(false);
    useGameStore.getState().setHud({ cycle: this.cycle });

    this.cameras.main.flash(400, 230, 198, 92);
    audioManager.levelUp();
    this.showHouseBanner(
      MAPS[next].name,
      next === 0 ? `Ciclo ${this.cycle} — Xibalba se vuelve más cruel` : `Ciclo ${this.cycle}`
    );
    this.syncHud();
  }

  /** Big centered title that fades in and out (Modo Infinito house changes). */
  private showHouseBanner(title: string, subtitle: string) {
    const w = this.scale.width;
    const h = this.scale.height;
    const style = { fontFamily: "Cinzel, serif", stroke: "#050403", strokeThickness: 6 };
    const titleText = this.add
      .text(w / 2, h * 0.32, title, { ...style, fontSize: "38px", color: "#E6C65C" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(60)
      .setAlpha(0);
    const subText = this.add
      .text(w / 2, h * 0.32 + 40, subtitle, { ...style, fontSize: "18px", color: "#E8DCC4", strokeThickness: 4 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(60)
      .setAlpha(0);
    this.tweens.add({
      targets: [titleText, subText],
      alpha: 1,
      duration: 400,
      yoyo: true,
      hold: 1800,
      onComplete: () => {
        titleText.destroy();
        subText.destroy();
      },
    });
  }

  private endRun(victory: boolean) {
    this.running = false;
    this.player.sprite.setVelocity(0, 0);
    this.physics.pause();
    if (victory) audioManager.victory();
    else audioManager.gameOver();

    useGameStore.getState().endRun(
      {
        timeSurvived: this.totalElapsedSeconds,
        level: this.level,
        kills: this.kills,
        cacaoCollected: this.cacaoCollected,
        housesCleared: this.mode === "infinite" ? this.housesCleared : undefined,
      },
      victory
    );
  }

  /** Story mode only, reached a non-final map's 5-minute mark: pause
   * and show the zone-clear screen instead of ending the run. */
  private triggerZoneClear() {
    this.running = false;
    this.physics.pause();
    audioManager.victory();
    useGameStore.getState().setPhase("zone-clear");
  }

  // ---------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------

  update(time: number, delta: number) {
    if (!this.running) return;

    this.updateInput(delta);
    this.updateWeapons(time, delta);
    this.updateSpawning(time);
    this.updateEnemies(time);
    this.drawDashTelegraphs(time);
    this.updateFirePatches(time);
    this.updateHazards(time);
    this.updateEnemyAbilities(time);
    this.updateSummons(time);
    this.updateFireTrails(time);
    this.updateProjectiles(time);
    this.updateOrbitCollisions(time);
    this.updateGems();
    this.updatePlayerEnemyCollisions();

    this.elapsedSeconds += delta / 1000;
    this.totalElapsedSeconds += delta / 1000;
    this.hudAccumulator += delta;
    if (this.hudAccumulator > 120) {
      this.hudAccumulator = 0;
      this.syncHud();
    }

    if (this.player.hp <= 0) {
      this.endRun(false);
      return;
    }

    // Boss of a mustDefeatBoss house is dead and the death animation
    // has played out (death above still takes priority).
    if (this.victoryAtElapsed !== null && this.elapsedSeconds >= this.victoryAtElapsed) {
      this.victoryAtElapsed = null;
      if (this.mode === "infinite") this.advanceInfiniteHouse();
      else if (isFinalMap(this.mapIndex)) this.endRun(true);
      else this.triggerZoneClear();
      return;
    }

    // Modo Infinito has no time-based win condition — it only ends on
    // death, and difficulty (including recurring bosses) just keeps
    // climbing via SpawnSystem/difficultyAt.
    if (this.mode === "infinite") return;

    // Houses marked mustDefeatBoss (Hun-Camé) are only won in
    // killEnemy(), never by the clock.
    if (this.elapsedSeconds >= RUN_DURATION_SECONDS && !MAPS[this.mapIndex].mustDefeatBoss) {
      if (isFinalMap(this.mapIndex)) {
        this.endRun(true);
      } else {
        this.triggerZoneClear();
      }
    }
  }

  private updateInput(delta: number) {
    let dx = 0;
    let dy = 0;
    if (this.cursors?.left.isDown || this.keys?.A?.isDown) dx -= 1;
    if (this.cursors?.right.isDown || this.keys?.D?.isDown) dx += 1;
    if (this.cursors?.up.isDown || this.keys?.W?.isDown) dy -= 1;
    if (this.cursors?.down.isDown || this.keys?.S?.isDown) dy += 1;

    if (dx === 0 && dy === 0 && (touchInputState.x !== 0 || touchInputState.y !== 0)) {
      dx = touchInputState.x;
      dy = touchInputState.y;
    }

    this.player.move(dx, dy, delta);
  }

  private updateWeapons(time: number, delta: number) {
    const ctx: WeaponContext = {
      scene: this,
      playerX: () => this.player.x,
      playerY: () => this.player.y,
      facing: () => this.player.facing,
      damageMult: () => this.player.mods.damageMult,
      nearestEnemy: () => this.findNearestEnemy(),
      spawnDart: (x, y, vx, vy, damage, pierce, texture, scale) => {
        this.projectiles.push(
          new Projectile(this, { x, y, vx, vy, damage, pierce, texture, scale })
        );
      },
      damageInRadius: (x, y, radius, damage) => this.damageInRadius(x, y, radius, damage, time),
      damageInCone: (x, y, dirAngle, halfAngle, range, damage) =>
        this.damageInCone(x, y, dirAngle, halfAngle, range, damage, time),
      flashAoe: (x, y, radius, color) => this.flashAoe(x, y, radius, color),
      flashCone: (x, y, dirAngle, halfAngle, range, color) =>
        this.flashCone(x, y, dirAngle, halfAngle, range, color),
    };
    this.weaponSystem.update(time, delta, ctx);
  }

  private updateSpawning(time: number) {
    const view = this.cameras.main.worldView;
    const aliveCounts = this.countAliveByKind();
    const requests = this.spawnSystem.update(
      time,
      this.elapsedSeconds,
      this.player.x,
      this.player.y,
      view.width,
      view.height,
      aliveCounts
    );
    const diff = difficultyAt(this.elapsedSeconds);
    for (const req of requests) {
      const def = ENEMY_DEFS[req.kind];
      // Story maps get harder floors via difficultyTier (set per map
      // in maps.ts); Modo Infinito's recurring bosses get progressively
      // stronger via req.hpMult/dmgMult from SpawnSystem instead.
      const hpMult = def.isBoss ? (req.hpMult ?? 1) : diff.hpMultiplier * this.difficultyTier;
      const speedMult = def.isBoss ? 1 : diff.speedMultiplier;
      const dmgMult = def.isBoss ? (req.dmgMult ?? 1) : this.difficultyTier;

      const enemy = new Enemy(this, def, req.x, req.y, hpMult, speedMult, dmgMult);
      this.enemies.set(nextId(), enemy);
      if (def.isBoss) {
        useGameStore.getState().setBoss(true, enemy.hp, enemy.maxHp, def.name);
      }
    }
  }

    private countAliveByKind(): Record<EnemyKind, number> {
    // Built from ENEMY_DEFS so adding a new enemy kind never requires
    // touching this method again.
    const counts = Object.fromEntries(
      Object.keys(ENEMY_DEFS).map((kind) => [kind, 0])
    ) as Record<EnemyKind, number>;
    this.enemies.forEach((enemy) => {
      if (enemy.alive) counts[enemy.def.kind] += 1;
    });
    return counts;
  }

  private updateEnemies(time: number) {
    this.enemies.forEach((enemy) => {
      enemy.update(this.player.x, this.player.y, time);

      // Boss entered furia (phase 2): shake + red shockwave so the
      // player knows the fight just got harder.
      if (enemy.consumeEnrageEvent()) {
        this.cameras.main.shake(350, 0.008);
        this.flashAoe(enemy.x, enemy.y, 140, 0xc43f35);
        audioManager.enemyDeath();
      }
      // Phase 3 ("Muerte Verdadera"): bigger shake and the light dies —
      // only a small circle around the player stays visible.
      if (enemy.consumeFinalPhaseEvent()) {
        this.cameras.main.shake(700, 0.012);
        this.flashAoe(enemy.x, enemy.y, 220, 0x8b5fbf);
        audioManager.gameOver();
        this.tweens.killTweensOf(this.darkness);
        this.tweens.add({ targets: this.darkness, alpha: 1, duration: 1500 });
      }
    });
  }

  /** Pulsing red line showing exactly where a winding-up enemy will
   * charge. The direction is already locked, so stepping off the line
   * is how you dodge. */
  private drawDashTelegraphs(time: number) {
    this.telegraphLayer.clear();
    const alpha = 0.35 + 0.25 * Math.sin(time / 60);
    this.enemies.forEach((enemy) => {
      if (!enemy.alive || enemy.dashState !== "windup") return;
      const len = enemy.dashLength;
      this.telegraphLayer.lineStyle(enemy.def.isBoss ? 6 : 3, 0xc43f35, alpha);
      this.telegraphLayer.lineBetween(
        enemy.x,
        enemy.y,
        enemy.x + enemy.dashDirX * len,
        enemy.y + enemy.dashDirY * len
      );
    });
  }

  /** Every special attack. Uses enemy.currentAbility, so enemies with
   * def.abilityRotation (Sacerdote, Hun-Camé) cycle through several. */
  private updateEnemyAbilities(time: number) {
    this.enemies.forEach((enemy) => {
      const ability = enemy.currentAbility;
      if (!enemy.alive || !ability) return;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (!enemy.canUseAbility(time, dist)) return;

      const def = enemy.def;
      const abilityDamage = (def.abilityDamage ?? 10) * enemy.damageMultiplier;
      // Phase bonuses: +1 tier for furia, +1 more for Muerte Verdadera.
      const phaseBonus = (enemy.enraged ? 1 : 0) + (enemy.finalPhase ? 1 : 0);

      if (ability === "aoePulse") {
        this.player.takeDamage(abilityDamage);
        audioManager.playerHurt();
        this.flashAoe(enemy.x, enemy.y, def.abilityRange ?? 70, 0x9e2b25);
      } else if (ability === "rangedLinear") {
        const baseAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        const speed = def.projectileSpeed ?? 260;
        const shots = (def.fanCount ?? def.abilityProjectileCount ?? 1) + phaseBonus * 2 * (def.isBoss ? 1 : 0);
        for (let i = 0; i < shots; i++) {
          const spread = shots > 1 ? (i - (shots - 1) / 2) * 0.16 : 0;
          const angle = baseAngle + spread;
          this.projectiles.push(
            new Projectile(this, {
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              damage: abilityDamage,
              texture: def.projectileTexture ?? "tex-jaguarspike",
              scale: def.isBoss ? 3 : 2.4,
              source: "enemy",
              lifetimeMs: 2200,
            })
          );
        }
        audioManager.shoot();
      } else if (ability === "bladeRing") {
        // Ring of projectiles in every direction; +4 per phase, and each
        // volley is rotated so the safe gaps keep moving.
        const count = (def.ringCount ?? def.abilityProjectileCount ?? 8) + phaseBonus * 4;
        const speed = def.projectileSpeed ?? 240;
        const offset = (time / 1000) % (Math.PI * 2);
        for (let i = 0; i < count; i++) {
          const angle = offset + (i / count) * Math.PI * 2;
          this.projectiles.push(
            new Projectile(this, {
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              damage: abilityDamage,
              texture: def.projectileTexture ?? "tex-blade",
              scale: 2.6,
              source: "enemy",
              lifetimeMs: 2600,
            })
          );
        }
        this.flashAoe(enemy.x, enemy.y, 50, 0xa9b6c4);
        audioManager.shoot();
      } else if (ability === "groundBurst") {
        // Eruptions under the player after a visible warning. The first
        // targets you exactly; extra ones cut off escape routes.
        const zones = (def.burstCount ?? def.abilityProjectileCount ?? 1) + phaseBonus * 2;
        const delay = (def.burstDelayMs ?? 900) * (enemy.enraged ? 0.8 : 1);
        for (let i = 0; i < zones; i++) {
          const angle = Math.random() * Math.PI * 2;
          const offset = i === 0 ? 0 : Phaser.Math.Between(70, 150);
          this.hazards.push({
            x: this.player.x + Math.cos(angle) * offset,
            y: this.player.y + Math.sin(angle) * offset,
            radius: def.burstRadius ?? 60,
            armedAt: time,
            detonateAt: time + delay,
            damage: abilityDamage,
            slowMs: def.abilitySlowMs ?? 0,
            color: def.burstColor ?? 0x9fd8ff,
            lingerMs: def.burstLingerMs ?? 0,
            lingerDamage: (def.burstLingerDamage ?? 0) * enemy.damageMultiplier,
          });
        }
      } else if (ability === "healAura") {
        // Sacerdote: heals every OTHER enemy nearby. Bosses get a capped
        // amount, otherwise a few priests would make Hun-Camé immortal.
        const radius = def.healRadius ?? 180;
        const pct = def.healPct ?? 0.15;
        this.enemies.forEach((other) => {
          if (other === enemy || !other.alive) return;
          if (Phaser.Math.Distance.Between(enemy.x, enemy.y, other.x, other.y) > radius) return;
          const healPct = other.def.isBoss ? Math.min(pct, BOSS_HEAL_PCT_CAP) : pct;
          other.hp = Math.min(other.maxHp, other.hp + other.maxHp * healPct);
          other.healFlashUntil = time + 250;
        });
        this.flashAoe(enemy.x, enemy.y, radius, 0x1fae86);
      }

      enemy.useAbility(time);
    });
  }

  private updateProjectiles(time: number) {
    for (const proj of this.projectiles) {
      proj.update(time);
      if (!proj.alive) continue;

      if (proj.source === "enemy") {
        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, this.player.x, this.player.y);
        if (dist < 16 && proj.registerPlayerHit()) {
          const applied = this.player.takeDamage(proj.damage);
          if (applied) audioManager.playerHurt();
        }
        continue;
      }

      this.enemies.forEach((enemy, id) => {
        if (!enemy.alive || !proj.alive) return;
        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, enemy.x, enemy.y);
        if (dist < enemy.def.radius + 8) {
          if (proj.registerHit(id)) {
            this.applyDamageToEnemy(id, enemy, proj.damage, time);
          }
        }
      });
    }
    this.projectiles = this.projectiles.filter((p) => {
      if (!p.alive) {
        p.destroy();
        return false;
      }
      return true;
    });
  }

  private updateOrbitCollisions(time: number) {
    if (!this.weaponSystem.hasWeapon("jadeOrbit")) return;
    const hitTests = this.weaponSystem.getOrbitHitTests(time, 400);
    const damage = this.weaponSystem.orbitDamage({
      damageMult: () => this.player.mods.damageMult,
    } as WeaponContext);

    for (const orb of hitTests) {
      this.enemies.forEach((enemy, id) => {
        if (!enemy.alive) return;
        const dist = Phaser.Math.Distance.Between(orb.x, orb.y, enemy.x, enemy.y);
        if (dist < enemy.def.radius + 14 && orb.canHit(id)) {
          this.applyDamageToEnemy(id, enemy, damage, time);
        }
      });
    }
  }

  private updateGems() {
    for (const gem of this.gems) {
      gem.update(this.player.x, this.player.y, this.player.pickupRadius, this.player.pickupRadius * 3.2);
      if (gem.collected) {
        if (gem.kind === "life") {
          this.player.heal(gem.value);
          audioManager.heal();
        } else {
          this.gainXp(gem.value);
          this.cacaoCollected += 1;
          audioManager.pickupXp();
        }
      }
    }
    this.gems = this.gems.filter((g) => {
      if (g.collected) {
        g.destroy();
        return false;
      }
      return true;
    });
  }

  private updatePlayerEnemyCollisions() {
    this.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist < enemy.def.radius + 12) {
        // Getting caught by a charge hurts 50% more than a regular bump.
        const contactDamage = enemy.isDashing ? enemy.damage * 1.5 : enemy.damage;
        const applied = this.player.takeDamage(contactDamage);
        if (applied) audioManager.playerHurt();
      }
    });
  }

  /** Draws pending ground eruptions (after drawDashTelegraphs cleared
   * the layer) and detonates the ones whose time is up. */
  private updateHazards(time: number) {
    if (this.hazards.length === 0) return;
    const remaining: GroundHazard[] = [];

    for (const h of this.hazards) {
      if (time < h.detonateAt) {
        const progress = (time - h.armedAt) / (h.detonateAt - h.armedAt);
        this.telegraphLayer.fillStyle(h.color, 0.06 + 0.22 * progress);
        this.telegraphLayer.fillCircle(h.x, h.y, h.radius);
        this.telegraphLayer.lineStyle(2, h.color, 0.5 + 0.4 * Math.sin(time / 50));
        this.telegraphLayer.strokeCircle(h.x, h.y, h.radius);
        // Inner ring grows toward the edge = countdown.
        this.telegraphLayer.strokeCircle(h.x, h.y, h.radius * progress);
        remaining.push(h);
        continue;
      }

      this.flashAoe(h.x, h.y, h.radius, h.color);
      const dist = Phaser.Math.Distance.Between(h.x, h.y, this.player.x, this.player.y);
      if (dist < h.radius + 10) {
        const applied = this.player.takeDamage(h.damage);
        if (applied) {
          audioManager.playerHurt();
          if (h.slowMs > 0) this.player.applySlow(h.slowMs);
        }
      }
      // Fire eruptions leave the ground burning.
      if (h.lingerMs > 0) {
        this.addFirePatch(h.x, h.y, h.radius * 0.8, time + h.lingerMs, h.lingerDamage, h.color);
      }
    }

    this.hazards = remaining;
  }

  private addFirePatch(
    x: number,
    y: number,
    radius: number,
    expiresAt: number,
    damage: number,
    color = 0xff8a3d
  ) {
    if (this.firePatches.length >= MAX_FIRE_PATCHES) this.firePatches.shift();
    this.firePatches.push({ x, y, radius, expiresAt, damage, color });
  }

  /** Draws burning ground and hurts the player standing on it. The
   * player's 500ms invulnerability after each hit turns this into a
   * steady burn instead of an instant kill. */
  private updateFirePatches(time: number) {
    if (this.firePatches.length === 0) return;
    this.firePatches = this.firePatches.filter((p) => p.expiresAt > time);

    for (const p of this.firePatches) {
      const flicker = 0.22 + 0.1 * Math.sin(time / 70 + p.x);
      // Fade out during the last half second.
      const fade = Math.min(1, (p.expiresAt - time) / 500);
      this.telegraphLayer.fillStyle(p.color, flicker * fade);
      this.telegraphLayer.fillCircle(p.x, p.y, p.radius);
      this.telegraphLayer.fillStyle(0xffffff, 0.12 * fade);
      this.telegraphLayer.fillCircle(p.x, p.y, p.radius * 0.45);

      const dist = Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y);
      if (dist < p.radius + 8) {
        const applied = this.player.takeDamage(p.damage);
        if (applied) audioManager.playerHurt();
      }
    }
  }

  /** Enemies with def.fireTrail scorch the ground behind them. */
  private updateFireTrails(time: number) {
    this.enemies.forEach((enemy) => {
      const trail = enemy.def.fireTrail;
      if (!enemy.alive || !trail || time < enemy.nextTrailAt) return;
      if (trail.onlyWhileDashing && !enemy.isDashing) return;
      enemy.nextTrailAt = time + trail.intervalMs;
      this.addFirePatch(
        enemy.x,
        enemy.y,
        trail.radius,
        time + trail.durationMs,
        trail.damage * enemy.damageMultiplier
      );
    });
  }

  /** Bosses with def.summon call reinforcements on a cooldown (one
   * extra each time while in furia), never exceeding SPAWN_CAPS. */
  private updateSummons(time: number) {
    const counts = this.countAliveByKind();
    const diff = difficultyAt(this.elapsedSeconds);

    this.enemies.forEach((enemy) => {
      const summon = enemy.def.summon;
      if (!enemy.alive || !summon || time < enemy.nextSummonAt) return;
      enemy.nextSummonAt = time + summon.cooldownMs * (enemy.enraged ? ENRAGE_COOLDOWN_MULT : 1);

      const wanted = summon.count + (enemy.enraged ? 1 : 0);
      const free = Math.max(0, SPAWN_CAPS[summon.kind] - counts[summon.kind]);
      const n = Math.min(wanted, free);
      const def = ENEMY_DEFS[summon.kind];

      for (let i = 0; i < n; i++) {
        const angle = (i / Math.max(1, n)) * Math.PI * 2;
        const minion = new Enemy(
          this,
          def,
          enemy.x + Math.cos(angle) * 70,
          enemy.y + Math.sin(angle) * 70,
          diff.hpMultiplier * this.difficultyTier,
          diff.speedMultiplier,
          this.difficultyTier
        );
        this.enemies.set(nextId(), minion);
        counts[summon.kind] += 1;
      }
      if (n > 0) this.flashAoe(enemy.x, enemy.y, 90, 0x9fd8ff);
    });
  }

  // Cheats (browser console, anyone can use them) — type `xibalba.help()`
  // ---------------------------------------------------------------

  private installDevTools() {
    const tools: XibalbaDevTools = {
      help: () => {
        console.info(
          [
            "xibalba.warp(n)       → salta a la casa n (1-" + MAPS.length + ") con todo al máximo",
            "xibalba.warp(n, false) → salta a la casa n con el equipo inicial",
            "xibalba.full()        → todas las armas y pasivas al máximo",
            "xibalba.god()         → activa/desactiva invencibilidad",
            "xibalba.boss()        → adelanta el reloj para que salga el jefe",
            "xibalba.clear()       → termina la casa actual (en la final y en Infinito, mata al jefe)",
          ].join("\n")
        );
      },
      warp: (house, fullLoadout = true) => this.devWarp(house, fullLoadout),
      full: () => {
        this.markCheatsUsed();
        this.devMaxLoadout();
      },
      god: () => {
        this.markCheatsUsed();
        this.player.godMode = !this.player.godMode;
        console.info(`[xibalba] Modo dios: ${this.player.godMode ? "ON" : "OFF"}`);
      },
      boss: () => {
        this.markCheatsUsed();
        this.elapsedSeconds = Math.max(this.elapsedSeconds, this.spawnSystem.bossAtSeconds - 2);
      },
      clear: () => {
        this.markCheatsUsed();
        this.elapsedSeconds = RUN_DURATION_SECONDS;
        // The final house is won by killing the boss, not by the clock.
        if (this.mode === "infinite" || MAPS[this.mapIndex].mustDefeatBoss) {
          this.enemies.forEach((e, id) => {
            if (e.alive && e.def.isBoss) this.applyDamageToEnemy(id, e, e.hp + 1, this.time.now);
          });
        }
      },
    };
    window.xibalba = tools;
    console.info("[xibalba] Herramientas de prueba activas. Escribe xibalba.help()");
  }

  /** Flags the current run as cheated: HUD warning on, records off. */
  private markCheatsUsed() {
    if (!this.cheatsUsed) {
      console.warn("[xibalba] Trucos activados: los récords de esta partida no se guardarán.");
    }
    this.cheatsUsed = true;
    useGameStore.getState().setCheatsActive(true);
  }

  /** Starts a fresh Modo Historia run directly on house `house` (1-based). */
  private devWarp(house: number, fullLoadout: boolean) {
    const target = Phaser.Math.Clamp(Math.floor(house) - 1, 0, MAPS.length - 1);
    useGameStore.setState({ mode: "story" });
    this.beginRun();
    // After beginRun(), which resets the flag for normal new runs.
    this.markCheatsUsed();
    if (fullLoadout) this.devMaxLoadout();
    if (target > 0) {
      // advanceToNextMap() increments mapIndex, so park it one before.
      this.mapIndex = target - 1;
      this.advanceToNextMap();
    }
    console.info(`[xibalba] Casa ${target + 1}: ${MAPS[target].name}`);
  }

  /** Doom-style "give all": every weapon and passive at max level. */
  private devMaxLoadout() {
    for (const def of Object.values(WEAPON_DEFS)) {
      while (this.weaponSystem.level(def.id) < def.maxLevel) {
        this.weaponSystem.addOrUpgrade(def.id);
      }
    }
    for (const def of Object.values(PASSIVE_DEFS)) {
      while ((this.passiveLevels[def.id] ?? 0) < def.maxLevel) {
        applyUpgrade(
          { type: "passive", id: def.id, name: def.name, description: def.description, icon: def.icon, isNew: false, nextLevel: 0 },
          this.weaponSystem,
          this.player,
          this.passiveLevels
        );
      }
    }
    this.player.hp = this.player.effectiveMaxHp;
    this.syncHud();
  }

  // ---------------------------------------------------------------
  // Combat helpers
  // ---------------------------------------------------------------

  private findNearestEnemy(): { x: number; y: number } | null {
    let best: Enemy | null = null;
    let bestDist = Infinity;
    this.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = enemy;
      }
    });
    return best;
  }

  private damageInRadius(x: number, y: number, radius: number, damage: number, time: number) {
    this.enemies.forEach((enemy, id) => {
      if (!enemy.alive) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist < radius + enemy.def.radius) {
        this.applyDamageToEnemy(id, enemy, damage, time);
      }
    });
  }

  private damageInCone(
    x: number,
    y: number,
    dirAngle: number,
    halfAngle: number,
    range: number,
    damage: number,
    time: number
  ) {
    this.enemies.forEach((enemy, id) => {
      if (!enemy.alive) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist > range + enemy.def.radius) return;
      const angleTo = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
      const diff = Phaser.Math.Angle.Wrap(angleTo - dirAngle);
      if (Math.abs(diff) <= halfAngle) {
        this.applyDamageToEnemy(id, enemy, damage, time);
      }
    });
  }

  private applyDamageToEnemy(id: string, enemy: Enemy, damage: number, time: number) {
    const died = enemy.takeDamage(damage, time);
    if (died) {
      this.killEnemy(id, enemy);
    } else {
      audioManager.hit();
    }
  }

  private readonly LIFE_DROP_CHANCE = 0.2;
  private readonly LIFE_DROP_MIN_HEAL = 20;
  private readonly LIFE_DROP_MAX_HEAL = 30;

  private killEnemy(id: string, enemy: Enemy) {
    this.kills += 1;
    audioManager.enemyDeath();

    const gem = new ExpGem(this, enemy.x, enemy.y, enemy.def.xp);
    this.gems.push(gem);

    const playerNeedsHealing = this.player.hp < this.player.effectiveMaxHp;
    if (playerNeedsHealing && Math.random() < this.LIFE_DROP_CHANCE) {
      const healAmount = Phaser.Math.Between(this.LIFE_DROP_MIN_HEAL, this.LIFE_DROP_MAX_HEAL);
      const lifeCrystal = new ExpGem(
        this,
        enemy.x + Phaser.Math.Between(-10, 10),
        enemy.y + Phaser.Math.Between(-10, 10),
        healAmount,
        "life"
      );
      this.gems.push(lifeCrystal);
    }

    if (enemy.def.isBoss) {
      useGameStore.getState().setBoss(false);
      // Story: only houses marked mustDefeatBoss. Infinite: every boss
      // kill opens the way to the next house.
      if (this.mode === "infinite" || MAPS[this.mapIndex].mustDefeatBoss) {
        this.onMustDefeatBossKilled(enemy.x, enemy.y);
      }
    }
    enemy.destroy();
    this.enemies.delete(id);
  }

  /** The house's real win condition: a big death flash, light comes
   * back, and after a beat the house (or the whole game) is won. */
  private onMustDefeatBossKilled(x: number, y: number) {
    this.cameras.main.shake(600, 0.012);
    this.cameras.main.flash(500, 255, 255, 255);
    this.flashAoe(x, y, 260, 0xffffff);
    this.tweens.killTweensOf(this.darkness);
    this.tweens.add({ targets: this.darkness, alpha: 0, duration: 800 });
    // Resolved in update() after 1.5s of *play* time (see victoryAtElapsed).
    this.victoryAtElapsed = this.elapsedSeconds + 1.5;
  }

  private gainXp(amount: number) {
    this.xp += amount;
    let needed = xpToNextLevel(this.level);
    while (this.xp >= needed) {
      this.xp -= needed;
      this.level += 1;
      needed = xpToNextLevel(this.level);
      this.pendingLevelUps += 1;
    }
    if (this.pendingLevelUps > 0 && this.running) {
      this.triggerLevelUp();
    }
  }

  private triggerLevelUp() {
    this.running = false;
    this.physics.pause();
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    audioManager.levelUp();
    const options = rollUpgradeOptions(this.weaponSystem, this.passiveLevels);
    useGameStore.getState().setUpgradeOptions(options);
    useGameStore.getState().setPhase("levelup");
    this.syncHud();
  }

  private chooseUpgrade(option: UpgradeOption) {
    applyUpgrade(option, this.weaponSystem, this.player, this.passiveLevels);
    if (this.pendingLevelUps > 0) {
      this.triggerLevelUp();
      return;
    }
    useGameStore.getState().setPhase("playing");
    this.physics.resume();
    this.running = true;
    this.syncHud();
  }

  private syncHud() {
    const bossEnemy = [...this.enemies.values()].find((e) => e.def.isBoss && e.alive);
    useGameStore.getState().setHud({
      hp: Math.round(this.player.hp),
      maxHp: Math.round(this.player.effectiveMaxHp),
      level: this.level,
      xp: Math.round(this.xp),
      xpToNext: xpToNextLevel(this.level),
      // Infinite shows total run time; story shows the house countdown.
      timeSurvived: this.mode === "infinite" ? this.totalElapsedSeconds : this.elapsedSeconds,
      kills: this.kills,
      cacaoCollected: this.cacaoCollected,
    });
    if (bossEnemy) {
      const bossName = bossEnemy.finalPhase
        ? `${bossEnemy.def.name} — Muerte Verdadera`
        : bossEnemy.enraged
          ? `${bossEnemy.def.name} — Furia`
          : bossEnemy.def.name;
      useGameStore.getState().setBoss(true, Math.round(bossEnemy.hp), bossEnemy.maxHp, bossName);
    }
  }

  // ---------------------------------------------------------------
  // FX
  // ---------------------------------------------------------------

  private flashAoe(x: number, y: number, radius: number, color: number) {
    this.fxLayer.lineStyle(4, color, 0.9);
    this.fxLayer.strokeCircle(x, y, radius);
    this.fxLayer.fillStyle(color, 0.15);
    this.fxLayer.fillCircle(x, y, radius);
    this.time.delayedCall(90, () => this.fxLayer.clear());
  }

  private flashCone(
    x: number,
    y: number,
    dirAngle: number,
    halfAngle: number,
    range: number,
    color: number
  ) {
    this.fxLayer.fillStyle(color, 0.35);
    this.fxLayer.slice(x, y, range, dirAngle - halfAngle, dirAngle + halfAngle, false);
    this.fxLayer.fillPath();
    this.time.delayedCall(90, () => this.fxLayer.clear());
  }
}