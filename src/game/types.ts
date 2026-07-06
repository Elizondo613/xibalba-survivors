export type EnemyKind = "bat" | "jaguar" | "skeleton" | "camazotz";

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

export type GamePhase =
  | "menu"
  | "playing"
  | "levelup"
  | "paused"
  | "gameover"
  | "victory";
