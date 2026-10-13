export type EnemyKind =
  | "bat"
  | "jaguar"
  | "skeleton"
  | "camazotz"
  | "boneWarrior"
  | "jaguarLord"
  | "obsidianDancer"
  | "ahaltocob"
  | "ahaltocob"
  | "frostWraith"
  | "chamiabac"
  | "emberHound"
  | "vucubCame"
  | "deathPriest"
  | "hunCame";

/** A special attack an enemy kind can use besides plain contact damage. */
export type EnemyAbility =
  | "aoePulse"
  | "rangedLinear"
  | "bladeRing"
  | "groundBurst"
  | "healAura";

/** Leaves burning patches on the ground behind the enemy as it moves. */
export interface FireTrailConfig {
  intervalMs: number;
  radius: number;
  durationMs: number;
  damage: number;
  /** Only burn the ground while charging (bosses), not while walking. */
  onlyWhileDashing?: boolean;
}

/** Periodically calls reinforcements around the enemy (bosses). */
export interface SummonConfig {
  kind: EnemyKind;
  count: number;
  cooldownMs: number;
}

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
  
  /** groundBurst only: radius of each frost eruption. */
  burstRadius?: number;
  /** groundBurst only: warning time before the eruption detonates. */
  burstDelayMs?: number;
  /** If set, getting hit by this enemy's ability slows the player
   * for this many ms. */
  abilitySlowMs?: number;
  summon?: SummonConfig;
  
  /** groundBurst only: zone color (defaults to ice blue). */
  burstColor?: number;
  /** groundBurst only: after exploding, the zone keeps burning this long. */
  burstLingerMs?: number;
  burstLingerDamage?: number;
  fireTrail?: FireTrailConfig;
  
  /** Cycles through several abilities instead of always using
   * `ability` (each use advances to the next one). */
  abilityRotation?: EnemyAbility[];
  /** Per-ability shot counts when one enemy uses several abilities
   * (each falls back to abilityProjectileCount). */
  ringCount?: number;
  fanCount?: number;
  burstCount?: number;
  /** Projectile sprite override for bladeRing / rangedLinear. */
  projectileTexture?: string;
  /** healAura: heals OTHER enemies within this radius by healPct of
   * their max HP (bosses are capped, see BOSS_HEAL_PCT_CAP). */
  healRadius?: number;
  healPct?: number;
  /** Bosses only: third phase threshold ("Muerte Verdadera"). */
  finalPhaseAtHpPct?: number;
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

export type BonusId = "balcheElixir" | "itzamnaBlessing" | "copalOffering";

export interface UpgradeOption {
  type: "weapon" | "passive" | "bonus";
  id: WeaponId | PassiveId | BonusId;
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
  /** Modo Infinito only: houses cleared this run (boss killed). */
  housesCleared?: number;
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
    /** If true, surviving the 5 minutes is not enough: the house is only
   * won by defeating its boss (used for Hun-Camé). */
  mustDefeatBoss?: boolean;
  /** Custom victory-screen title (defaults to "<name>: superada"). */
  victoryTitle?: string;
}