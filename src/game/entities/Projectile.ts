import Phaser from "phaser";

export interface ProjectileOptions {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  texture: string;
  scale?: number;
  pierce?: number;
  lifetimeMs?: number;
  rotate?: boolean;
  /** Who fired it — determines what it can hit in GameScene's
   * collision checks. Defaults to "player" to match every existing
   * call site (WeaponSystem darts/shrapnel). */
  source?: "player" | "enemy";
}

/** A simple straight-line moving projectile (obsidian darts, bone
 * shrapnel, and — since `source` was added — enemy ranged attacks
 * like the jaguar's shard). */
export class Projectile {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Arcade.Sprite;
  damage: number;
  pierce: number;
  source: "player" | "enemy";
  hitEnemyIds = new Set<string>();
  hitPlayer = false;
  born: number;
  lifetimeMs: number;
  alive = true;

  constructor(scene: Phaser.Scene, opts: ProjectileOptions) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(opts.x, opts.y, opts.texture);
    this.sprite.setScale(opts.scale ?? 2.2);
    this.sprite.setDepth(7);
    this.sprite.setVelocity(opts.vx, opts.vy);
    if (opts.rotate ?? true) {
      this.sprite.rotation = Math.atan2(opts.vy, opts.vx);
    }
    this.damage = opts.damage;
    this.pierce = opts.pierce ?? 0;
    this.source = opts.source ?? "player";
    this.born = scene.time.now;
    this.lifetimeMs = opts.lifetimeMs ?? 1400;
  }

  update(time: number) {
    if (time - this.born > this.lifetimeMs) {
      this.alive = false;
    }
  }

  registerHit(enemyId: string): boolean {
    if (this.hitEnemyIds.has(enemyId)) return false;
    this.hitEnemyIds.add(enemyId);
    if (this.hitEnemyIds.size > this.pierce) {
      this.alive = false;
    }
    return true;
  }

  /** Enemy projectiles hit the player once, then despawn — no pierce. */
  registerPlayerHit(): boolean {
    if (this.hitPlayer) return false;
    this.hitPlayer = true;
    this.alive = false;
    return true;
  }

  destroy() {
    this.sprite.destroy();
  }

  get x() {
    return this.sprite.x;
  }
  get y() {
    return this.sprite.y;
  }
}