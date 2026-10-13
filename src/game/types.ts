export type EnemyKind =
  | "bat"
  | "jaguar"
  | "skeleton"
  | "camazotz"
  | "boneWarrior"
  | "jaguarLord"
  | "obsidianDancer"
  | "ahaltocob";

/** A special attack an enemy kind can use besides plain contact damage. */
export type EnemyAbility = "aoePulse" | "rangedLinear" | "bladeRing";

/** Telegraphed charge: the enemy stops, flashes red while a warning
 * line shows its path, then rushes in a STRAIGHT line toward where the
 * player was when the windup started (not homing — sidestep it). */
export interface DashConfig {
  cooldownMs: number;
  windupMs: number;
  durationMs: number;
  speed: number;
  /** Only starts a dash when the player is within this distance. */
  range: number;
}

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  texture: string;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  scale: number;
  radius: number;
  isBoss?: boolean;
  /** Optional tint override for a "reskinned" variant of a shared
   * texture (e.g. boneWarrior reuses tex-skeleton, tinted). */
  tint?: number;

  /** Special attack this enemy kind uses in addition to (or, for
   * kiting ranged attackers, mostly instead of) plain contact damage.
   * Omitted entirely = pure melee, like the bats. */
  ability?: EnemyAbility;
  abilityCooldownMs?: number;
  /** aoePulse: pulse radius. rangedLinear: max firing distance. */
  abilityRange?: number;
  abilityDamage?: number;
  /** rangedLinear only: speed of the fired shard. */
  projectileSpeed?: number;
  /** rangedLinear only: fires this many shards in a spread instead of
   * a single shot — used to make boss ranged attacks feel "cheto"
   * (souped-up) compared to the regular jaguar's single shard. */
  abilityProjectileCount?: number;
  preferredRange?: number;
  
  /** Optional charge attack, independent of `ability` (an enemy can
   * have both — e.g. Ahaltocob throws blade rings AND dashes). */
  dash?: DashConfig;
  /** Bosses only: below this fraction of max HP (e.g. 0.5) the enemy
   * enters "furia" — faster, shorter cooldowns, more projectiles. */
  enrageAtHpPct?: number;
}

export type WeaponId =
  | "obsidianDart"
  | "jadeOrbit"
  | "solarBurst"
  | "serpentWhip"
  | "boneShrapnel";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
}

export type PassiveId =
  | "cacaoHeart"
  | "quetzalFeather"
  | "jadeAmulet"
  | "copalIncense"
  | "obsidianSkin";

export interface PassiveDef {
  id: PassiveId;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
}

export interface UpgradeOption {
  type: "weapon" | "passive";
  id: WeaponId | PassiveId;
  name: string;
  description: string;
  icon: string;
  isNew: boolean;
  nextLevel: number;
}

export interface RunStats {
  timeSurvived: number;
  level: number;
  kills: number;
  cacaoCollected: number;
}

export type GameMode = "story" | "infinite";

export type GamePhase =
  | "menu"
  | "story-intro"
  | "playing"
  | "levelup"
  | "paused"
  | "zone-clear"
  | "gameover"
  | "victory";

  /** One stage of Modo Historia — a "house" of Xibalba. Infinite mode
 * always plays MAPS[0] on a loop and never advances. */
export interface MapDef {
  id: string;
  name: string;
  bossKind: EnemyKind;
  /** Multiplies regular-enemy HP/damage on top of the normal time-based
   * difficulty curve — this is how later "houses" feel harder even in
   * their first seconds, not just by the end of the 5 minutes. */
  difficultyTier: number;
  /** Extra enemy kind unlocked only on this map, or undefined for none. */
  eliteKind?: EnemyKind;
  /** Narrative text shown on the zone-clear screen after this map. */
  clearText: string;
  /** Texture key of this house's floor (generated in TextureGenerator). */
  groundTexture: string;
}