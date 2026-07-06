import { PASSIVE_DEFS, WEAPON_DEFS } from "../config";
import type { PassiveId, UpgradeOption, WeaponId } from "../types";
import type { WeaponSystem } from "./WeaponSystem";
import type { Player } from "../entities/Player";

export interface PassiveLevels {
  [key: string]: number;
}

/** Builds 3 (or fewer, if the pool is exhausted) random upgrade choices. */
export function rollUpgradeOptions(
  weaponSystem: WeaponSystem,
  passiveLevels: PassiveLevels,
  count = 3
): UpgradeOption[] {
  const pool: UpgradeOption[] = [];

  for (const def of Object.values(WEAPON_DEFS)) {
    const currentLevel = weaponSystem.level(def.id);
    if (currentLevel >= def.maxLevel) continue;
    pool.push({
      type: "weapon",
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      isNew: currentLevel === 0,
      nextLevel: currentLevel + 1,
    });
  }

  for (const def of Object.values(PASSIVE_DEFS)) {
    const currentLevel = passiveLevels[def.id] ?? 0;
    if (currentLevel >= def.maxLevel) continue;
    pool.push({
      type: "passive",
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      isNew: currentLevel === 0,
      nextLevel: currentLevel + 1,
    });
  }

  // Fisher-Yates shuffle, then take `count`
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}

/** Applies the chosen option's effect to the weapon system / player mods. */
export function applyUpgrade(
  option: UpgradeOption,
  weaponSystem: WeaponSystem,
  player: Player,
  passiveLevels: PassiveLevels
) {
  if (option.type === "weapon") {
    weaponSystem.addOrUpgrade(option.id as WeaponId);
    return;
  }

  const id = option.id as PassiveId;
  passiveLevels[id] = (passiveLevels[id] ?? 0) + 1;

  switch (id) {
    case "cacaoHeart":
      player.applyMaxHpBonus(20);
      break;
    case "quetzalFeather":
      player.mods.speedMult += 0.09;
      break;
    case "jadeAmulet":
      player.mods.damageMult += 0.14;
      break;
    case "copalIncense":
      player.mods.pickupRadiusBonus += 30;
      break;
    case "obsidianSkin":
      player.mods.damageReduction = Math.min(0.6, player.mods.damageReduction + 0.08);
      break;
  }
}
