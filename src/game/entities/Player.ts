import Phaser from "phaser";
import { PLAYER_BASE } from "../config";

export interface PlayerModifiers {
  speedMult: number;
  maxHpBonus: number;
  damageMult: number;
  pickupRadiusBonus: number;
  damageReduction: number; // 0..0.6
}

export class Player {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Arcade.Sprite;
  hp: number;
  maxHp: number;
  lastHitAt = -9999;
  facing = new Phaser.Math.Vector2(0, 1);
  mods: PlayerModifiers = {
    speedMult: 1,
    maxHpBonus: 0,
    damageMult: 1,
    pickupRadiusBonus: 0,
    damageReduction: 0,
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, "tex-player");
    this.sprite.setScale(2.4);
    this.sprite.setDepth(10);
    this.sprite.setCircle(
      this.sprite.width * 0.32,
      this.sprite.width * 0.18,
      this.sprite.height * 0.22
    );
    this.maxHp = PLAYER_BASE.maxHp;
    this.hp = this.maxHp;
  }

  get pickupRadius() {
    return PLAYER_BASE.pickupRadius + this.mods.pickupRadiusBonus;
  }

  get effectiveMaxHp() {
    return this.maxHp + this.mods.maxHpBonus;
  }

  move(dirX: number, dirY: number, dt: number) {
    const vec = new Phaser.Math.Vector2(dirX, dirY);
    const speed = PLAYER_BASE.speed * this.mods.speedMult;
    if (vec.lengthSq() > 0) {
      vec.normalize();
      this.facing.copy(vec);
      this.sprite.setVelocity(vec.x * speed, vec.y * speed);
      // subtle bob/squash to sell movement without needing walk frames
      const bob = Math.sin(this.scene.time.now / 90) * 0.06;
      this.sprite.setScale(2.4 + bob, 2.4 - bob);
      this.sprite.setFlipX(vec.x < -0.05 ? true : vec.x > 0.05 ? false : this.sprite.flipX);
    } else {
      this.sprite.setVelocity(0, 0);
      this.sprite.setScale(2.4);
    }
    void dt;
  }

  takeDamage(amount: number): boolean {
    const now = this.scene.time.now;
    if (now - this.lastHitAt < PLAYER_BASE.invulnMs) return false;
    const reduced = amount * (1 - this.mods.damageReduction);
    this.hp = Math.max(0, this.hp - reduced);
    this.lastHitAt = now;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.sprite.clearTint());
    return true;
  }

  get isInvulnerable() {
    return this.scene.time.now - this.lastHitAt < PLAYER_BASE.invulnMs;
  }

  heal(amount: number) {
    this.hp = Math.min(this.effectiveMaxHp, this.hp + amount);
  }

  applyMaxHpBonus(delta: number) {
    this.mods.maxHpBonus += delta;
    this.hp = Math.min(this.effectiveMaxHp, this.hp + delta);
  }

  get x() {
    return this.sprite.x;
  }
  get y() {
    return this.sprite.y;
  }
}
