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
};

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