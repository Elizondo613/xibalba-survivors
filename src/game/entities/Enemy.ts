import Phaser from "phaser";
import type { EnemyDef } from "../types";

export class Enemy {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Arcade.Sprite;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  damageMultiplier: number;
  alive = true;
  hitFlashUntil = 0;
  /** Timestamp (scene time) at which this enemy's special ability
   * (skeleton AoE pulse / jaguar ranged shot) is next available. */
  nextAbilityAt: number;
  /** small per-enemy offset so groups don't perfectly overlap-stack */
  wanderOffset: number;

  constructor(
    scene: Phaser.Scene,
    def: EnemyDef,
    x: number,
    y: number,
    hpMultiplier: number,
    speedMultiplier: number,
    damageMultiplier = 1
  ) {
    this.scene = scene;
    this.def = def;
    this.sprite = scene.physics.add.sprite(x, y, def.texture);
    this.sprite.setScale(def.scale);
    this.sprite.setDepth(def.isBoss ? 9 : 5);
    this.sprite.setCircle(
      this.sprite.width * 0.34,
      this.sprite.width * 0.16,
      this.sprite.height * 0.16
    );
    this.hp = Math.round(def.hp * hpMultiplier);
    this.maxHp = this.hp;
    this.damage = def.damage * damageMultiplier;
    this.damageMultiplier = damageMultiplier;
    this.speed = def.speed * speedMultiplier;
    this.wanderOffset = Math.random() * Math.PI * 2;
    this.nextAbilityAt = (def.abilityCooldownMs ?? 0) * Math.random();

    if (def.isBoss) {
      this.sprite.setTint(0xffdca0);
    } else if (def.tint) {
      this.sprite.setTint(def.tint);
    }
  }

  update(targetX: number, targetY: number, time: number) {
    if (!this.alive) return;
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const wob = Math.sin(time / 260 + this.wanderOffset) * 0.25;
    const nx = dx / dist;
    const ny = dy / dist;

    let dirX: number;
    let dirY: number;

    if (this.def.preferredRange) {
      const pref = this.def.preferredRange;
      if (dist < pref * 0.75) {
        dirX = -nx;
        dirY = -ny;
      } else if (dist > pref * 1.15) {
        dirX = nx;
        dirY = ny;
      } else {
        dirX = -ny;
        dirY = nx;
      }
    } else {
      dirX = nx + wob;
      dirY = ny - wob * 0.5;
    }

    this.sprite.setVelocity(dirX * this.speed, dirY * this.speed);
    this.sprite.setFlipX(dx < 0);

    if (time < this.hitFlashUntil) {
      this.sprite.setTintFill(0xffffff);
    } else if (this.def.isBoss) {
      this.sprite.setTint(0xffdca0);
    } else if (this.def.tint) {
      this.sprite.setTint(this.def.tint);
    } else {
      this.sprite.clearTint();
    }
  }

  canUseAbility(time: number, distanceToPlayer: number): boolean {
    if (!this.def.ability || !this.alive) return false;
    if (time < this.nextAbilityAt) return false;
    const range = this.def.abilityRange ?? Infinity;
    return distanceToPlayer <= range;
  }

  useAbility(time: number) {
    const cooldown = this.def.abilityCooldownMs ?? 1500;
    this.nextAbilityAt = time + cooldown * (0.9 + Math.random() * 0.2);
  }

  takeDamage(amount: number, time: number): boolean {
    this.hp -= amount;
    this.hitFlashUntil = time + 70;
    if (this.hp <= 0 && this.alive) {
      this.alive = false;
      return true;
    }
    return false;
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