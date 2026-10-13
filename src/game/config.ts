import type { EnemyDef, EnemyKind, PassiveDef, WeaponDef } from "./types";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const WORLD_SIZE = 3000;
export const RUN_DURATION_SECONDS = 5 * 60;

export const PLAYER_BASE = {
  speed: 190,
  maxHp: 100,
  hitRadius: 14,
  invulnMs: 500,
  pickupRadius: 70,
};

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  bat: {
    kind: "bat",
    name: "Murciélago de Camazotz",
    texture: "tex-bat",
    hp: 12,
    speed: 110,
    damage: 6,
    xp: 3,
    scale: 2.2,
    radius: 10,
  },
  jaguar: {
    kind: "jaguar",
    name: "Jaguar Espectral",
    texture: "tex-jaguar",
    hp: 28,
    speed: 95,
    damage: 10,
    xp: 6,
    scale: 2.6,
    radius: 13,
    ability: "rangedLinear",
    abilityCooldownMs: 1900,
    abilityRange: 320,
    abilityDamage: 9,
    projectileSpeed: 260,
    preferredRange: 220,
  },
  skeleton: {
    kind: "skeleton",
    name: "Guerrero de Xibalba",
    texture: "tex-skeleton",
    hp: 20,
    speed: 70,
    damage: 8,
    xp: 5,
    scale: 2.4,
    radius: 12,
    ability: "aoePulse",
    abilityCooldownMs: 2600,
    abilityRange: 70,
    abilityDamage: 12,
  },
  camazotz: {
    kind: "camazotz",
    name: "Camazotz, Señor Murciélago",
    texture: "tex-camazotz",
    hp: 900,
    speed: 85,
    damage: 22,
    xp: 150,
    scale: 4,
    radius: 26,
    isBoss: true,
  },
  boneWarrior: {
    kind: "boneWarrior",
    name: "Guerrero Óseo",
    texture: "tex-skeleton",
    tint: 0x8a2f2f,
    hp: 34,
    speed: 78,
    damage: 13,
    xp: 9,
    scale: 2.6,
    radius: 13,
    ability: "aoePulse",
    abilityCooldownMs: 2200,
    abilityRange: 78,
    abilityDamage: 16,
  },
  jaguarLord: {
    kind: "jaguarLord",
    name: "Chak Balam, Señor de los Jaguares Espectrales",
    texture: "tex-jaguarlord",
    hp: 1400,
    speed: 92,
    damage: 28,
    xp: 220,
    scale: 4.2,
    radius: 28,
    isBoss: true,
    ability: "rangedLinear",
    abilityCooldownMs: 2400,
    abilityRange: 380,
    abilityDamage: 14,
    abilityProjectileCount: 3,
    projectileSpeed: 280,
  },
    obsidianDancer: {
    kind: "obsidianDancer",
    name: "Danzante de Obsidiana",
    texture: "tex-dancer",
    // Tougher than the Guerrero Óseo (34 HP / 13 dmg) and, unlike it,
    // forces the player to read a telegraph and sidestep.
    hp: 46,
    speed: 82,
    damage: 15,
    xp: 12,
    scale: 2.6,
    radius: 13,
    dash: {
      cooldownMs: 3200,
      windupMs: 600,
      durationMs: 380,
      speed: 430,
      range: 320,
    },
  },
  ahaltocob: {
    kind: "ahaltocob",
    name: "Ahaltocob, Señor de las Navajas",
    texture: "tex-ahaltocob",
    // Step up from Chak Balam (1400 HP / 28 dmg): more HP, two attack
    // types instead of one, and a second phase at half health.
    hp: 2000,
    speed: 95,
    damage: 32,
    xp: 300,
    scale: 4.2,
    radius: 28,
    isBoss: true,
    ability: "bladeRing",
    abilityCooldownMs: 2800,
    abilityRange: 600,
    abilityDamage: 16,
    abilityProjectileCount: 8,
    projectileSpeed: 240,
    dash: {
      cooldownMs: 4200,
      windupMs: 700,
      durationMs: 450,
      speed: 520,
      range: 450,
    },
    enrageAtHpPct: 0.5,
  },
    frostWraith: {
    kind: "frostWraith",
    name: "Espectro de Escarcha",
    texture: "tex-wraith",
    // Next step up from the Danzante (46 HP / 15 dmg). Keeps its
    // distance and makes frost erupt UNDER the player — stand still and
    // you get hit and slowed.
    hp: 60,
    speed: 70,
    damage: 17,
    xp: 15,
    scale: 2.6,
    radius: 13,
    preferredRange: 240,
    ability: "groundBurst",
    abilityCooldownMs: 3400,
    abilityRange: 380,
    abilityDamage: 18,
    abilityProjectileCount: 1,
    burstRadius: 60,
    burstDelayMs: 900,
    abilitySlowMs: 1500,
  },
  chamiabac: {
    kind: "chamiabac",
    name: "Chamiabac, Señor de la Vara de Hueso",
    texture: "tex-chamiabac",
    // Step up from Ahaltocob (2000 HP / 32 dmg): tankier, hits harder,
    // and adds two brand-new mechanics — frost zones that slow you, and
    // summoning Espectros. Furia at 50% like Ahaltocob.
    hp: 2800,
    speed: 80,
    damage: 36,
    xp: 400,
    scale: 4.4,
    radius: 30,
    isBoss: true,
    ability: "groundBurst",
    abilityCooldownMs: 2400,
    abilityRange: 650,
    abilityDamage: 22,
    abilityProjectileCount: 3,
    burstRadius: 75,
    burstDelayMs: 900,
    abilitySlowMs: 2000,
    summon: { kind: "frostWraith", count: 2, cooldownMs: 9000 },
    enrageAtHpPct: 0.5,
  },
    emberHound: {
    kind: "emberHound",
    name: "Sabueso de Brasas",
    texture: "tex-hound",
    // Step up from the Espectro (60 HP / 17 dmg): the fastest regular
    // enemy so far, and it scorches the ground behind it — chasing you
    // in circles slowly fills the arena with fire.
    hp: 75,
    speed: 108,
    damage: 19,
    xp: 18,
    scale: 2.6,
    radius: 13,
    fireTrail: { intervalMs: 260, radius: 20, durationMs: 2600, damage: 8 },
  },
  vucubCame: {
    kind: "vucubCame",
    name: "Vucub-Camé, Siete Muerte",
    texture: "tex-vucubcame",
    // Step up from Chamiabac (2800 HP / 36 dmg). Combines what the
    // previous lords did (eruptions, charges, summons, furia) and adds
    // fire that STAYS on the ground, so the safe space keeps shrinking.
    hp: 3800,
    speed: 88,
    damage: 40,
    xp: 500,
    scale: 4.6,
    radius: 32,
    isBoss: true,
    ability: "groundBurst",
    abilityCooldownMs: 2600,
    abilityRange: 650,
    abilityDamage: 24,
    abilityProjectileCount: 4,
    burstRadius: 80,
    burstDelayMs: 1000,
    burstColor: 0xff8a3d,
    burstLingerMs: 3500,
    burstLingerDamage: 10,
    dash: { cooldownMs: 5000, windupMs: 650, durationMs: 500, speed: 560, range: 500 },
    fireTrail: { intervalMs: 90, radius: 26, durationMs: 3000, damage: 12, onlyWhileDashing: true },
    summon: { kind: "emberHound", count: 2, cooldownMs: 11000 },
    enrageAtHpPct: 0.5,
  },
    deathPriest: {
    kind: "deathPriest",
    name: "Sacerdote de Hun-Camé",
    texture: "tex-priest",
    // Step up from the Sabueso (75 HP / 19 dmg). New role: SUPPORT.
    // Keeps its distance, heals every enemy around it and fires death
    // orbs — leave it alive and the whole horde (boss included) heals.
    hp: 95,
    speed: 72,
    damage: 21,
    xp: 22,
    scale: 2.7,
    radius: 14,
    preferredRange: 260,
    abilityRotation: ["healAura", "rangedLinear"],
    abilityCooldownMs: 1600,
    abilityRange: 420,
    abilityDamage: 16,
    fanCount: 1,
    projectileSpeed: 250,
    projectileTexture: "tex-deathorb",
    healRadius: 200,
    healPct: 0.15,
  },
  hunCame: {
    kind: "hunCame",
    name: "Hun-Camé, Señor de Xibalba",
    texture: "tex-huncame",
    // Final boss. Step up from Vucub-Camé (3800 HP / 40 dmg): ~60% more
    // HP, brutal contact damage, rotates THREE attacks, charges,
    // summons healers, and is the only boss with three phases
    // (furia at 66%, "Muerte Verdadera" + darkness at 33%).
    hp: 6000,
    speed: 92,
    damage: 55,
    xp: 800,
    scale: 5,
    radius: 34,
    isBoss: true,
    abilityRotation: ["bladeRing", "groundBurst", "rangedLinear"],
    abilityCooldownMs: 2000,
    abilityRange: 700,
    abilityDamage: 28,
    ringCount: 12,
    burstCount: 4,
    fanCount: 5,
    projectileSpeed: 270,
    projectileTexture: "tex-deathorb",
    burstRadius: 85,
    burstDelayMs: 950,
    burstColor: 0x8b5fbf,
    burstLingerMs: 3000,
    burstLingerDamage: 12,
    dash: { cooldownMs: 4500, windupMs: 600, durationMs: 480, speed: 600, range: 520 },
    summon: { kind: "deathPriest", count: 2, cooldownMs: 12000 },
    enrageAtHpPct: 0.66,
    finalPhaseAtHpPct: 0.33,
  },
};

export const WEAPON_DEFS: Record<string, WeaponDef> = {
  obsidianDart: {
    id: "obsidianDart",
    name: "Daga de Obsidiana",
    description: "Lanza dagas afiladas al enemigo más cercano.",
    icon: "dart",
    maxLevel: 8,
  },
  jadeOrbit: {
    id: "jadeOrbit",
    name: "Orbe de Jade",
    description: "Esferas de jade orbitan a tu alrededor, dañando al contacto.",
    icon: "orbit",
    maxLevel: 8,
  },
  solarBurst: {
    id: "solarBurst",
    name: "Estallido Solar",
    description: "Ráfaga de energía solar que golpea a todos cerca de ti.",
    icon: "sun",
    maxLevel: 8,
  },
  serpentWhip: {
    id: "serpentWhip",
    name: "Látigo de Kukulkán",
    description: "Un latigazo serpenteante golpea en un arco frente a ti.",
    icon: "whip",
    maxLevel: 8,
  },
  boneShrapnel: {
    id: "boneShrapnel",
    name: "Metralla de Hueso",
    description: "Dispara fragmentos de hueso en varias direcciones.",
    icon: "shrapnel",
    maxLevel: 8,
  },
};

export const PASSIVE_DEFS: Record<string, PassiveDef> = {
  cacaoHeart: {
    id: "cacaoHeart",
    name: "Corazón de Cacao",
    description: "Aumenta tu vida máxima.",
    icon: "heart",
    maxLevel: 5,
  },
  quetzalFeather: {
    id: "quetzalFeather",
    name: "Pluma de Quetzal",
    description: "Aumenta tu velocidad de movimiento.",
    icon: "feather",
    maxLevel: 5,
  },
  jadeAmulet: {
    id: "jadeAmulet",
    name: "Amuleto de Jade",
    description: "Aumenta el daño de todas tus armas.",
    icon: "amulet",
    maxLevel: 5,
  },
  copalIncense: {
    id: "copalIncense",
    name: "Incienso de Copal",
    description: "Amplía tu radio de recolección de cacao/experiencia.",
    icon: "incense",
    maxLevel: 5,
  },
  obsidianSkin: {
    id: "obsidianSkin",
    name: "Piel de Obsidiana",
    description: "Reduce el daño recibido.",
    icon: "skin",
    maxLevel: 5,
  },
};

export const SPAWN_WEIGHTS: Record<"bat" | "skeleton" | "jaguar", number> = {
  bat: 0.55,
  skeleton: 0.3,
  jaguar: 0.15,
};

export const ELITE_SPAWN_WEIGHT = 0.08;

export const SPAWN_CAPS: Record<EnemyKind, number> = {
  bat: Infinity,
  skeleton: 18,
  jaguar: 8,
  camazotz: 1,
  boneWarrior: 4,
  jaguarLord: 1,
  obsidianDancer: 5,
  ahaltocob: 1,
  frostWraith: 6,
  chamiabac: 1,
  emberHound: 6,
  vucubCame: 1,
  deathPriest: 4,
  hunCame: 1,
};

/** Max fraction of a BOSS's max HP a single healAura pulse restores
 * (regular enemies get the full healPct). */
export const BOSS_HEAL_PCT_CAP = 0.02;

export const INFINITE_BOSS_INTERVAL_SECONDS = 4 * 60;
export const INFINITE_BOSS_TIER_STEP = 0.35;

export function xpToNextLevel(level: number): number {
  return Math.round(8 + level * 6 + Math.pow(level, 1.55));
}

export function difficultyAt(elapsedSeconds: number) {
  const minutes = elapsedSeconds / 60;
  return {
    spawnIntervalMs: Math.max(220, 950 - minutes * 140),
    enemiesPerWave: Math.min(8, 1 + Math.floor(minutes * 1.3)),
    hpMultiplier: 1 + minutes * 0.22,
    speedMultiplier: Math.min(1.6, 1 + minutes * 0.045),
  };
}