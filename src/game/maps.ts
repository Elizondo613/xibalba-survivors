import type { MapDef } from "./types";

/** Story-mode stages, in order. Modo Infinito always uses MAPS[0]'s
 * enemy pool and just keeps sending stronger Camazotz visits forever —
 * it never advances through this list. */
export const MAPS: MapDef[] = [
  {
    id: "casa-murcielagos",
    name: "Casa de los Murciélagos",
    bossKind: "camazotz",
    difficultyTier: 1,
    clearText:
      "La Casa de los Murciélagos ha caído en silencio. Camazotz yace vencido. Pero el suelo cambia bajo tus pies — un rugido lejano anuncia la Casa de los Jaguares, y Yax jura no mirar atrás.",
  },
  {
    id: "casa-jaguares",
    name: "Casa de los Jaguares",
    bossKind: "jaguarLord",
    difficultyTier: 1.35,
    eliteKind: "boneWarrior",
    clearText:
      "La Casa de los Jaguares ha caído. Chak Balam ya no ruge. Delante, la oscuridad se espesa — más casas de Xibalba esperan antes de la puerta final, donde Hun-Camé cumplirá su palabra... o no. Continuará.",
  },
];

export function isFinalMap(mapIndex: number): boolean {
  return mapIndex >= MAPS.length - 1;
}