import type { MapDef } from "./types";

/** Story-mode stages, in order. Modo Infinito always uses MAPS[0]'s
 * enemy pool and just keeps sending stronger Camazotz visits forever —
 * it never advances through this list.
 *
 * Planned campaign (6 houses): Murciélagos → Jaguares → Navajas →
 * Frío → Fuego → Puerta de Xibalba (Hun-Camé). The LAST entry in this
 * array is always treated as the final map, so its clearText is what
 * shows on the victory screen until the next house is added. */
export const MAPS: MapDef[] = [
  {
    id: "casa-murcielagos",
    name: "Casa de los Murciélagos",
    bossKind: "camazotz",
    difficultyTier: 1,
    groundTexture: "tex-ground-murcielagos",
    clearText:
      "La Casa de los Murciélagos ha caído en silencio. Camazotz yace vencido. Pero el suelo cambia bajo tus pies — un rugido lejano anuncia la Casa de los Jaguares, y Yax jura no mirar atrás.",
  },
  {
    id: "casa-jaguares",
    name: "Casa de los Jaguares",
    bossKind: "jaguarLord",
    difficultyTier: 1.35,
    eliteKind: "boneWarrior",
    groundTexture: "tex-ground-jaguares",
    clearText:
      "La Casa de los Jaguares ha caído. Chak Balam ya no ruge. Un viento helado trae el sonido de metal contra piedra: la Casa de las Navajas, donde las cuchillas se mueven solas. Yax aprieta el paso. Detrás de él no se escucha nada... y no voltea.",
  },
  {
    id: "casa-navajas",
    name: "Casa de las Navajas",
    bossKind: "ahaltocob",
    difficultyTier: 1.7,
    eliteKind: "obsidianDancer",
    groundTexture: "tex-ground-navajas",
    clearText:
      "Ahaltocob cae entre sus propias navajas. Por primera vez, Yax cree escuchar un paso suave a sus espaldas — o quizá es solo el eco. No voltea. Más adelante, el aliento de la Casa del Frío ya le congela los huesos.",
  },
    {
    id: "casa-frio",
    name: "Casa del Frío",
    bossKind: "chamiabac",
    difficultyTier: 2.05,
    eliteKind: "frostWraith",
    groundTexture: "tex-ground-frio",
    clearText:
      "Chamiabac se quiebra como hielo viejo. En el silencio blanco, Yax escucha con claridad una respiración detrás de él — tan cerca que siente su calor en la nuca. Quiere voltear. No lo hace. Adelante, un resplandor rojo ilumina el camino: la Casa del Fuego.",
  },
    {
    id: "casa-fuego",
    name: "Casa del Fuego",
    bossKind: "vucubCame",
    difficultyTier: 2.45,
    eliteKind: "emberHound",
    groundTexture: "tex-ground-fuego",
    clearText:
      "Vucub-Camé, Siete Muerte, se deshace en cenizas. Al fondo arde una puerta de obsidiana: la salida de Xibalba. Junto a ella espera Hun-Camé, sonriendo como quien ya conoce el final. Detrás de Yax, los pasos ya no se esconden.",
  },
    {
    id: "puerta-xibalba",
    name: "Puerta de Xibalba",
    bossKind: "hunCame",
    difficultyTier: 2.9,
    eliteKind: "deathPriest",
    groundTexture: "tex-ground-puerta",
    mustDefeatBoss: true,
    victoryTitle: "Escapaste de Xibalba",
    clearText:
      "Hun-Camé cae de rodillas y su risa se apaga como una vela. La puerta de obsidiana se abre: del otro lado huele a lluvia y a milpa. Yax da el último paso... y por primera vez, el silencio a sus espaldas es total. ¿Y si todo fue una trampa? Voltea. Sak Nikté está ahí, a un suspiro de la luz. Sus ojos se encuentran un instante — y ella se deshace en humo de copal. Yax vuelve al mundo de los vivos. Solo.",
  },
];

export function isFinalMap(mapIndex: number): boolean {
  return mapIndex >= MAPS.length - 1;
}