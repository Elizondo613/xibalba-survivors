import type { EnemyDef, EnemyKind, PassiveDef, WeaponDef } from "./types";

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const WORLD_SIZE = 3000; // playable square world, camera-bound
export const RUN_DURATION_SECONDS = 5 * 60; // survive 5 minutes to win

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

/** XP required to go from level N to N+1 (index 0 = lvl1 -> lvl2). */
export function xpToNextLevel(level: number): number {
  return Math.round(8 + level * 6 + Math.pow(level, 1.55));
}

/** Difficulty scaling curve driven by elapsed run time (seconds). */
export function difficultyAt(elapsedSeconds: number) {
  const minutes = elapsedSeconds / 60;
  return {
    spawnIntervalMs: Math.max(220, 950 - minutes * 140),
    enemiesPerWave: Math.min(6, 1 + Math.floor(minutes * 1.1)),
    hpMultiplier: 1 + minutes * 0.22,
    speedMultiplier: Math.min(1.6, 1 + minutes * 0.045),
  };
}
