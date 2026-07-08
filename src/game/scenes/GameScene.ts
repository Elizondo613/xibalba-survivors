import Phaser from "phaser";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { ExpGem } from "../entities/ExpGem";
import { SpawnSystem } from "../systems/SpawnSystem";
import { WeaponSystem, type WeaponContext } from "../systems/WeaponSystem";
import { rollUpgradeOptions, applyUpgrade, type PassiveLevels } from "../systems/UpgradeSystem";
import { ENEMY_DEFS, RUN_DURATION_SECONDS, WORLD_SIZE, difficultyAt, xpToNextLevel } from "../config";
import { audioManager } from "../utils/AudioManager";
import { touchInputState } from "../utils/InputState";
import { useGameStore, gameBridge } from "../../store/gameStore";
import type { UpgradeOption } from "../types";

let idCounter = 0;
const nextId = () => `e${idCounter++}`;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies = new Map<string, Enemy>();
  private projectiles: Projectile[] = [];
  private gems: ExpGem[] = [];
  private weaponSystem = new WeaponSystem();
  private spawnSystem = new SpawnSystem();
  private passiveLevels: PassiveLevels = {};

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private running = false;
  private elapsedSeconds = 0;
  private level = 1;
  private xp = 0;
  private kills = 0;
  private cacaoCollected = 0;
  private hudAccumulator = 0;
  private pendingLevelUps = 0;

  private vignette!: Phaser.GameObjects.Image;
  private fxLayer!: Phaser.GameObjects.Graphics;

  constructor() {
    super("GameScene");
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

    this.add
      .tileSprite(0, 0, WORLD_SIZE, WORLD_SIZE, "tex-ground")
      .setOrigin(0, 0)
      .setDepth(0);

    this.player = new Player(this, WORLD_SIZE / 2, WORLD_SIZE / 2);
    this.player.sprite.setCollideWorldBounds(true);

    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    this.fxLayer = this.add.graphics().setDepth(6);

    this.vignette = this.add
      .image(0, 0, "tex-vignette")
      .setScrollFactor(0)
      .setDepth(50)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setAlpha(0.9);
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
  }

  // ---------------------------------------------------------------
  // Run lifecycle
  // ---------------------------------------------------------------

  private beginRun() {
    // In case a previous run ended while paused (level-up screen,
    // game over, victory), make sure physics is running again.
    this.physics.resume();

    // Reset entities
    this.enemies.forEach((e) => e.destroy());
    this.enemies.clear();
    this.projectiles.forEach((p) => p.destroy());
    this.projectiles = [];
    this.gems.forEach((g) => g.destroy());
    this.gems = [];

    this.weaponSystem = new WeaponSystem();
    this.weaponSystem.addOrUpgrade("obsidianDart");
    this.spawnSystem = new SpawnSystem();
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

    this.elapsedSeconds = 0;
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
    });

    audioManager.unlock();
  }

  private endRun(victory: boolean) {
    this.running = false;
    this.player.sprite.setVelocity(0, 0);
    this.physics.pause();
    if (victory) audioManager.victory();
    else audioManager.gameOver();

    useGameStore.getState().endRun(
      {
        timeSurvived: this.elapsedSeconds,
        level: this.level,
        kills: this.kills,
        cacaoCollected: this.cacaoCollected,
      },
      victory
    );
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
    this.updateProjectiles(time);
    this.updateOrbitCollisions(time);
    this.updateGems();
    this.updatePlayerEnemyCollisions();

    this.elapsedSeconds += delta / 1000;
    this.hudAccumulator += delta;
    if (this.hudAccumulator > 120) {
      this.hudAccumulator = 0;
      this.syncHud();
    }

    if (this.player.hp <= 0) {
      this.endRun(false);
      return;
    }

    if (this.elapsedSeconds >= RUN_DURATION_SECONDS) {
      this.endRun(true);
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
    const requests = this.spawnSystem.update(
      time,
      this.elapsedSeconds,
      this.player.x,
      this.player.y,
      view.width,
      view.height
    );
    const diff = difficultyAt(this.elapsedSeconds);
    for (const req of requests) {
      const def = ENEMY_DEFS[req.kind];
      const enemy = new Enemy(
        this,
        def,
        req.x,
        req.y,
        def.isBoss ? 1 : diff.hpMultiplier,
        def.isBoss ? 1 : diff.speedMultiplier
      );
      this.enemies.set(nextId(), enemy);
      if (def.isBoss) {
        useGameStore.getState().setBoss(true, enemy.hp, enemy.maxHp);
      }
    }
  }

  private updateEnemies(time: number) {
    this.enemies.forEach((enemy) => {
      enemy.update(this.player.x, this.player.y, time);
    });
  }

  private updateProjectiles(time: number) {
    for (const proj of this.projectiles) {
      proj.update(time);
      if (!proj.alive) continue;
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
        const applied = this.player.takeDamage(enemy.damage);
        if (applied) audioManager.playerHurt();
      }
    });
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

    // Small chance to also drop a life crystal — skipped when the
    // player is already topped up so drops aren't wasted visually.
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
    }
    enemy.destroy();
    this.enemies.delete(id);
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

  /** Shows one upgrade-choice screen. If a single XP pickup crossed more
   * than one level, additional screens are chained after each pick so
   * the player never loses a choice. */
  private triggerLevelUp() {
    this.running = false;
    // Full pause: enemies stop chasing/attacking, projectiles freeze
    // mid-air, the player stops moving, and (since updateSpawning()
    // already lives behind the `!running` early-return in update())
    // no new enemies spawn either.
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
      // Chained level-up (one big XP pickup crossed multiple levels):
      // stay paused and immediately show the next choice screen.
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
      timeSurvived: this.elapsedSeconds,
      kills: this.kills,
      cacaoCollected: this.cacaoCollected,
    });
    if (bossEnemy) {
      useGameStore.getState().setBoss(true, Math.round(bossEnemy.hp), bossEnemy.maxHp);
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
    this.fxLayer.slice(
      x,
      y,
      range,
      dirAngle - halfAngle,
      dirAngle + halfAngle,
      false
    );
    this.fxLayer.fillPath();
    this.time.delayedCall(90, () => this.fxLayer.clear());
  }
}
