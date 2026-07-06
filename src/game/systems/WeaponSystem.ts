import Phaser from "phaser";
import type { WeaponId } from "../types";

export interface WeaponContext {
  scene: Phaser.Scene;
  playerX: () => number;
  playerY: () => number;
  facing: () => Phaser.Math.Vector2;
  damageMult: () => number;
  nearestEnemy: () => { x: number; y: number } | null;
  spawnDart: (
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    pierce: number,
    texture: string,
    scale?: number
  ) => void;
  damageInRadius: (x: number, y: number, radius: number, damage: number) => void;
  damageInCone: (
    x: number,
    y: number,
    dirAngle: number,
    halfAngleRad: number,
    range: number,
    damage: number
  ) => void;
  flashAoe: (x: number, y: number, radius: number, color: number) => void;
  flashCone: (x: number, y: number, dirAngle: number, halfAngleRad: number, range: number, color: number) => void;
}

interface OrbitOrb {
  sprite: Phaser.GameObjects.Sprite;
  angleOffset: number;
  lastHitAt: Map<string, number>;
}

const BASE_DAMAGE: Record<WeaponId, number> = {
  obsidianDart: 9,
  jadeOrbit: 6,
  solarBurst: 14,
  serpentWhip: 12,
  boneShrapnel: 5,
};

export class WeaponSystem {
  levels: Partial<Record<WeaponId, number>> = {};
  private cooldowns: Partial<Record<WeaponId, number>> = {};
  private orbitOrbs: OrbitOrb[] = [];
  private orbitGroupAngle = 0;

  hasWeapon(id: WeaponId) {
    return !!this.levels[id];
  }

  level(id: WeaponId) {
    return this.levels[id] ?? 0;
  }

  ownedWeaponIds(): WeaponId[] {
    return Object.keys(this.levels) as WeaponId[];
  }

  addOrUpgrade(id: WeaponId) {
    this.levels[id] = (this.levels[id] ?? 0) + 1;
  }

  update(time: number, delta: number, ctx: WeaponContext) {
    void delta;
    for (const id of this.ownedWeaponIds()) {
      const level = this.levels[id] ?? 0;
      if (level <= 0) continue;
      this.fireWeapon(id, level, time, ctx);
    }
    this.updateOrbits(time, ctx);
  }

  private fireWeapon(id: WeaponId, level: number, time: number, ctx: WeaponContext) {
    const cd = this.cooldowns[id] ?? 0;
    if (time < cd) return;

    switch (id) {
      case "obsidianDart":
        this.fireDart(level, time, ctx);
        break;
      case "jadeOrbit":
        this.ensureOrbitCount(level, ctx);
        this.cooldowns[id] = time + 999999; // orbits are continuous, no cooldown-fire
        break;
      case "solarBurst":
        this.fireSolarBurst(level, time, ctx);
        break;
      case "serpentWhip":
        this.fireWhip(level, time, ctx);
        break;
      case "boneShrapnel":
        this.fireShrapnel(level, time, ctx);
        break;
    }
  }

  private fireDart(level: number, time: number, ctx: WeaponContext) {
    const target = ctx.nearestEnemy();
    if (!target) {
      this.cooldowns.obsidianDart = time + 250;
      return;
    }
    const px = ctx.playerX();
    const py = ctx.playerY();
    const dx = target.x - px;
    const dy = target.y - py;
    const speed = 520;
    const damage = BASE_DAMAGE.obsidianDart * (1 + (level - 1) * 0.32) * ctx.damageMult();
    const pierce = Math.floor((level - 1) / 3);
    const projectiles = 1 + Math.floor((level - 1) / 2);

    for (let i = 0; i < projectiles; i++) {
      const spread = (i - (projectiles - 1) / 2) * 0.18;
      const angle = Math.atan2(dy, dx) + spread;
      ctx.spawnDart(
        px,
        py,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        damage,
        pierce,
        "tex-dart"
      );
    }

    this.cooldowns.obsidianDart = time + Math.max(220, 620 - level * 30);
  }

  private ensureOrbitCount(level: number, ctx: WeaponContext) {
    const desired = Math.min(6, 1 + level);
    if (this.orbitOrbs.length === desired) return;
    this.orbitOrbs.forEach((o) => o.sprite.destroy());
    this.orbitOrbs = [];
    for (let i = 0; i < desired; i++) {
      const sprite = ctx.scene.add.sprite(ctx.playerX(), ctx.playerY(), "tex-orb");
      sprite.setScale(2.2);
      sprite.setDepth(8);
      this.orbitOrbs.push({
        sprite,
        angleOffset: (i / desired) * Math.PI * 2,
        lastHitAt: new Map(),
      });
    }
  }

  private updateOrbits(time: number, ctx: WeaponContext) {
    if (this.orbitOrbs.length === 0) return;
    this.orbitGroupAngle += 0.0026 * (16 + Math.min(this.level("jadeOrbit"), 6));
    const px = ctx.playerX();
    const py = ctx.playerY();
    const radius = 78 + Math.min(this.level("jadeOrbit"), 6) * 4;

    for (const orb of this.orbitOrbs) {
      const angle = this.orbitGroupAngle + orb.angleOffset;
      const x = px + Math.cos(angle) * radius;
      const y = py + Math.sin(angle) * radius * 0.72;
      orb.sprite.setPosition(x, y);
    }
    void time;
  }

  /** Returns current orbit orb world positions + a stable id + a
   * per-(orb,enemy) hit-cooldown gate, used by GameScene to apply
   * damage-over-time contact without re-hitting every single frame. */
  getOrbitHitTests(nowMs: number, hitCooldownMs: number) {
    return this.orbitOrbs.map((orb, idx) => ({
      idx,
      x: orb.sprite.x,
      y: orb.sprite.y,
      canHit: (enemyId: string) => {
        const last = orb.lastHitAt.get(enemyId) ?? -Infinity;
        if (nowMs - last < hitCooldownMs) return false;
        orb.lastHitAt.set(enemyId, nowMs);
        return true;
      },
    }));
  }

  orbitDamage(ctx: WeaponContext) {
    const level = this.level("jadeOrbit");
    return BASE_DAMAGE.jadeOrbit * (1 + (level - 1) * 0.3) * ctx.damageMult();
  }

  private fireSolarBurst(level: number, time: number, ctx: WeaponContext) {
    const px = ctx.playerX();
    const py = ctx.playerY();
    const radius = 90 + level * 10;
    const damage = BASE_DAMAGE.solarBurst * (1 + (level - 1) * 0.35) * ctx.damageMult();
    ctx.damageInRadius(px, py, radius, damage);
    ctx.flashAoe(px, py, radius, 0xf4d35e);
    this.cooldowns.solarBurst = time + Math.max(1200, 2600 - level * 150);
  }

  private fireWhip(level: number, time: number, ctx: WeaponContext) {
    const px = ctx.playerX();
    const py = ctx.playerY();
    const facing = ctx.facing();
    const dirAngle = Math.atan2(facing.y || 1, facing.x || 0);
    const range = 130 + level * 8;
    const halfAngle = Phaser.Math.DegToRad(35 + Math.min(level, 6) * 4);
    const damage = BASE_DAMAGE.serpentWhip * (1 + (level - 1) * 0.3) * ctx.damageMult();
    ctx.damageInCone(px, py, dirAngle, halfAngle, range, damage);
    ctx.flashCone(px, py, dirAngle, halfAngle, range, 0x1fae86);
    this.cooldowns.serpentWhip = time + Math.max(500, 950 - level * 40);
  }

  private fireShrapnel(level: number, time: number, ctx: WeaponContext) {
    const px = ctx.playerX();
    const py = ctx.playerY();
    const count = 4 + Math.min(level, 6);
    const damage = BASE_DAMAGE.boneShrapnel * (1 + (level - 1) * 0.28) * ctx.damageMult();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      ctx.spawnDart(
        px,
        py,
        Math.cos(angle) * 380,
        Math.sin(angle) * 380,
        damage,
        0,
        "tex-shrapnel",
        1.8
      );
    }
    this.cooldowns.boneShrapnel = time + Math.max(900, 1800 - level * 90);
  }
}
