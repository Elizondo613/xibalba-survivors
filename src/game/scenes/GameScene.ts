import Phaser from "phaser";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { ExpGem } from "../entities/ExpGem";
import { SpawnSystem } from "../systems/SpawnSystem";
import { WeaponSystem, type WeaponContext } from "../systems/WeaponSystem";
import { rollUpgradeOptions, applyUpgrade, type PassiveLevels } from "../systems/UpgradeSystem";
import { ENEMY_DEFS, RUN_DURATION_SECONDS, WORLD_SIZE, difficultyAt, xpToNextLevel } from "../config";
import { MAPS, isFinalMap } from "../maps";
import { audioManager } from "../utils/AudioManager";
import { touchInputState } from "../utils/InputState";
import { useGameStore, gameBridge } from "../../store/gameStore";
import type { EnemyKind, GameMode, UpgradeOption } from "../types";

let idCounter = 0;
const nextId = () => `e${idCounter++}`;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies = new Map<string, Enemy>();
  private projectiles: Projectile[] = [];
  private gems: ExpGem[] = [];
  private weaponSystem = new WeaponSystem();
  private spawnSystem = new SpawnSystem("camazotz", "story");
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
    gameBridge.advanceMap = () => this.advanceToNextMap();

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
    this.physics.resume();

    this.enemies.forEach((e) => e.destroy());
    this.enemies.clear();
    this.projectiles.forEach((p) => p.destroy());
    this.projectiles = [];
    this.gems.forEach((g) => g.destroy());
    this.gems = [];

    // A fresh run (whether from the menu or after dying) always starts
    // a story campaign over at map 0. Modo Infinito ignores mapIndex
    // entirely and always plays MAPS[0]'s enemy pool.
    this.mode = useGameStore.getState().mode;
    this.mapIndex = 0;
    useGameStore.getState().setMapIndex(0);
    const map = MAPS[this.mapIndex];
    this.difficultyTier = map.difficultyTier;
    this.spawnSystem = new SpawnSystem(map.bossKind, this.mode, map.eliteKind);

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

    this.mapIndex += 1;
    useGameStore.getState().setMapIndex(this.mapIndex);
    const map = MAPS[this.mapIndex];
    this.difficultyTier = map.difficultyTier;
    this.spawnSystem = new SpawnSystem(map.bossKind, this.mode, map.eliteKind);

    this.elapsedSeconds = 0;
    // Small grace heal between houses of Xibalba — carrying near-zero
    // HP straight into a harder map would feel unfair.
    this.player.heal(30);

    this.running = true;
    useGameStore.getState().setBoss(false);
    useGameStore.getState().setPhase("playing");
    this.syncHud();
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
    this.updateEnemyAbilities(time);
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

    // Modo Infinito has no time-based win condition — it only ends on
    // death, and difficulty (including recurring bosses) just keeps
    // climbing via SpawnSystem/difficultyAt.
    if (this.mode === "infinite") return;

    if (this.elapsedSeconds >= RUN_DURATION_SECONDS) {
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
    const counts: Record<EnemyKind, number> = {
      bat: 0,
      skeleton: 0,
      jaguar: 0,
      camazotz: 0,
      boneWarrior: 0,
      jaguarLord: 0,
    };
    this.enemies.forEach((enemy) => {
      if (enemy.alive) counts[enemy.def.kind] += 1;
    });
    return counts;
  }

  private updateEnemies(time: number) {
    this.enemies.forEach((enemy) => {
      enemy.update(this.player.x, this.player.y, time);
    });
  }

  /** Skeletons pulse a telegraphed AoE around themselves; jaguars (and
   * the map-2 boss, in a 3-shard burst) fire straight (non-homing)
   * shards at the player's current position. Both are on a per-enemy
   * cooldown gated by canUseAbility(). */
  private updateEnemyAbilities(time: number) {
    this.enemies.forEach((enemy) => {
      if (!enemy.alive || !enemy.def.ability) return;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (!enemy.canUseAbility(time, dist)) return;

      const abilityDamage = (enemy.def.abilityDamage ?? 10) * enemy.damageMultiplier;

      if (enemy.def.ability === "aoePulse") {
        this.player.takeDamage(abilityDamage);
        audioManager.playerHurt();
        this.flashAoe(enemy.x, enemy.y, enemy.def.abilityRange ?? 70, 0x9e2b25);
      } else if (enemy.def.ability === "rangedLinear") {
        const baseAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        const speed = enemy.def.projectileSpeed ?? 260;
        const shots = enemy.def.abilityProjectileCount ?? 1;
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
              texture: "tex-jaguarspike",
              scale: enemy.def.isBoss ? 3 : 2.4,
              source: "enemy",
              lifetimeMs: 2200,
            })
          );
        }
        audioManager.shoot();
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
      timeSurvived: this.elapsedSeconds,
      kills: this.kills,
      cacaoCollected: this.cacaoCollected,
    });
    if (bossEnemy) {
      useGameStore.getState().setBoss(true, Math.round(bossEnemy.hp), bossEnemy.maxHp, bossEnemy.def.name);
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