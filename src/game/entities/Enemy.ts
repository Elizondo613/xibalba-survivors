import Phaser from "phaser";
import type { EnemyDef } from "../types";

/** Furia (boss phase 2) tuning. */
const ENRAGE_SPEED_MULT = 1.3;
export const ENRAGE_COOLDOWN_MULT = 0.65;

export type DashState = "idle" | "windup" | "dashing";

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
   * (skeleton AoE pulse / jaguar ranged shot / blade ring) is next available. */
  nextAbilityAt: number;
  /** small per-enemy offset so groups don't perfectly overlap-stack */
  wanderOffset: number;

  // --- Dash (telegraphed charge) state ---
  dashState: DashState = "idle";
  /** End time of the current windup or dash phase. */
  dashStateUntil = 0;
  nextDashAt: number;
  /** Direction locked at the START of the windup — that's what makes
   * the dash dodgeable: it won't track the player once it's aimed. */
  dashDirX = 0;
  dashDirY = 0;

  /** Next time this enemy may summon reinforcements (def.summon). */
  nextSummonAt: number;
  /** Next time this enemy drops a fire patch (def.fireTrail). */
  nextTrailAt = 0;

  // --- Furia (phase 2) ---
  enraged = false;
  private enrageEventPending = false;

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
    // Don't let a freshly spawned (off-screen) enemy dash immediately.
    this.nextDashAt = def.dash
      ? scene.time.now + def.dash.cooldownMs * (0.4 + Math.random() * 0.6)
      : Infinity;

    this.nextSummonAt = def.summon ? scene.time.now + def.summon.cooldownMs * 0.5 : Infinity;
    this.applyTint(0);
  }

  get isDashing() {
    return this.dashState === "dashing";
  }

  update(targetX: number, targetY: number, time: number) {
    if (!this.alive) return;
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const nx = dx / dist;
    const ny = dy / dist;

    // A dash in progress (windup or charge) overrides normal movement.
    if (this.updateDash(time, nx, ny, dist)) {
      this.sprite.setFlipX(this.dashDirX < 0);
      this.applyTint(time);
      return;
    }

    const wob = Math.sin(time / 260 + this.wanderOffset) * 0.25;
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
    this.applyTint(time);
  }

  /** Returns true while the dash owns this enemy's movement. */
  private updateDash(time: number, nx: number, ny: number, dist: number): boolean {
    const dash = this.def.dash;
    if (!dash) return false;

    if (this.dashState === "windup") {
      if (time < this.dashStateUntil) {
        this.sprite.setVelocity(0, 0);
        return true;
      }
      this.dashState = "dashing";
      this.dashStateUntil = time + dash.durationMs;
    }

    if (this.dashState === "dashing") {
      if (time >= this.dashStateUntil) {
        this.dashState = "idle";
        const cdMult = this.enraged ? ENRAGE_COOLDOWN_MULT : 1;
        this.nextDashAt = time + dash.cooldownMs * cdMult;
        return false;
      }
      const s = dash.speed * (this.enraged ? ENRAGE_SPEED_MULT : 1);
      this.sprite.setVelocity(this.dashDirX * s, this.dashDirY * s);
      return true;
    }

    if (time >= this.nextDashAt && dist <= dash.range) {
      this.dashState = "windup";
      this.dashStateUntil = time + dash.windupMs * (this.enraged ? 0.75 : 1);
      this.dashDirX = nx;
      this.dashDirY = ny;
      this.sprite.setVelocity(0, 0);
      return true;
    }

    return false;
  }

  /** Length of the dash path, used by GameScene to draw the warning line. */
  get dashLength() {
    const dash = this.def.dash;
    if (!dash) return 0;
    return dash.speed * (this.enraged ? ENRAGE_SPEED_MULT : 1) * (dash.durationMs / 1000);
  }

  private applyTint(time: number) {
    if (time < this.hitFlashUntil) {
      this.sprite.setTintFill(0xffffff);
    } else if (this.dashState === "windup" && Math.floor(time / 80) % 2 === 0) {
      // Red strobe = "I'm about to charge".
      this.sprite.setTintFill(0xff4040);
    } else if (this.def.isBoss) {
      this.sprite.setTint(this.enraged ? 0xff8080 : 0xffdca0);
    } else if (this.def.tint) {
      this.sprite.setTint(this.def.tint);
    } else {
      this.sprite.clearTint();
    }
  }

  canUseAbility(time: number, distanceToPlayer: number): boolean {
    if (!this.def.ability || !this.alive) return false;
    // Never fire a special mid-charge — keeps boss patterns readable.
    if (this.dashState !== "idle") return false;
    if (time < this.nextAbilityAt) return false;
    const range = this.def.abilityRange ?? Infinity;
    return distanceToPlayer <= range;
  }

  useAbility(time: number) {
    const cooldown = (this.def.abilityCooldownMs ?? 1500) * (this.enraged ? ENRAGE_COOLDOWN_MULT : 1);
    this.nextAbilityAt = time + cooldown * (0.9 + Math.random() * 0.2);
  }

  takeDamage(amount: number, time: number): boolean {
    this.hp -= amount;
    this.hitFlashUntil = time + 70;
    if (this.hp <= 0 && this.alive) {
      this.alive = false;
      return true;
    }
    this.checkEnrage();
    return false;
  }

  private checkEnrage() {
    const pct = this.def.enrageAtHpPct;
    if (!pct || this.enraged || this.hp > this.maxHp * pct) return;
    this.enraged = true;
    this.speed *= ENRAGE_SPEED_MULT;
    this.enrageEventPending = true;
  }

  /** True exactly once, the frame after entering furia — GameScene uses
   * it to fire the screen shake / flash. */
  consumeEnrageEvent(): boolean {
    if (!this.enrageEventPending) return false;
    this.enrageEventPending = false;
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