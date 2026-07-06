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
  alive = true;
  hitFlashUntil = 0;
  /** small per-enemy offset so groups don't perfectly overlap-stack */
  wanderOffset: number;

  constructor(
    scene: Phaser.Scene,
    def: EnemyDef,
    x: number,
    y: number,
    hpMultiplier: number,
    speedMultiplier: number
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
    this.damage = def.damage;
    this.speed = def.speed * speedMultiplier;
    this.wanderOffset = Math.random() * Math.PI * 2;

    if (def.isBoss) {
      this.sprite.setTint(0xffdca0);
    }
  }

  update(targetX: number, targetY: number, time: number) {
    if (!this.alive) return;
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const wob = Math.sin(time / 260 + this.wanderOffset) * 0.25;
    const vx = (dx / dist + wob) * this.speed;
    const vy = (dy / dist - wob * 0.5) * this.speed;
    this.sprite.setVelocity(vx, vy);
    this.sprite.setFlipX(dx < 0);

    if (time < this.hitFlashUntil) {
      this.sprite.setTint(0xffffff);
    } else if (this.def.isBoss) {
      this.sprite.setTint(0xffdca0);
    } else {
      this.sprite.clearTint();
    }
  }

  takeDamage(amount: number, time: number): boolean {
    this.hp -= amount;
    this.hitFlashUntil = time + 70;
    if (this.hp <= 0 && this.alive) {
      this.alive = false;
      return true; // died this hit
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
