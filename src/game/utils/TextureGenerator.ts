import Phaser from "phaser";

/**
 * All game art is generated procedurally at boot time instead of being
 * fetched from external spritesheet URLs. This keeps the game 100%
 * self-contained (no broken links, no CORS issues, no third-party
 * supply-chain risk) while still giving us a consistent 16-bit-style
 * Maya/Xibalba palette.
 *
 * Sprites are authored as ASCII grids (one character per pixel), drawn
 * onto an offscreen canvas and registered as Phaser textures at boot.
 */

const PALETTE: Record<string, string> = {
  J: "#0E7A5F", // jade dark
  j: "#1FAE86", // jade light
  G: "#C9A227", // gold
  g: "#E6C65C", // gold light
  K: "#0D0B0A", // obsidian
  k: "#2A2320", // obsidian light
  S: "#A9714B", // skin
  s: "#C99566", // skin light
  W: "#E8DCC4", // bone
  w: "#F5EEDD", // bone light
  R: "#9E2B25", // blood
  r: "#C43F35", // blood light
  P: "#5B2A86", // spectral purple
  p: "#8B5FBF", // spectral purple light
  B: "#1A1512", // near-black outline
  O: "#FF8A3D", // ember orange
  Y: "#F4D35E", // sun yellow
  E: "#2E86AB", // eye cyan glow
};

function mirrorRows(halfRows: string[]): string[] {
  return halfRows.map((row) => row + [...row].reverse().join(""));
}

function drawGrid(
  scene: Phaser.Scene,
  key: string,
  rows: string[],
  pixelSize: number,
  mirror = false
) {
  const finalRows = mirror ? mirrorRows(rows) : rows;
  const width = finalRows[0].length * pixelSize;
  const height = finalRows.length * pixelSize;

  const canvasTexture = scene.textures.createCanvas(key, width, height);
  if (!canvasTexture) return;
  const ctx = canvasTexture.getContext();

  finalRows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === "." || ch === " ") return;
      const color = PALETTE[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    });
  });

  canvasTexture.refresh();
}

// ---------- Creature / character grids ----------
// NOTE: these are authored as full rows (not half + mirror). An earlier
// version of this file built creatures from a half-width row mirrored
// horizontally, but several rows ended in a transparent pixel right at
// the seam, so the mirror produced two separate blobs with a gap
// between them instead of one merged silhouette (visible in-game as
// "double" characters/enemies). Authoring full rows directly avoids
// that class of bug entirely.

const PLAYER_GRID = [
  "............",
  "...GGGGGG...",
  "..GggggggG..",
  "..GKggggKG..",
  "...SSSSSS...",
  "..SsKssKsS..",
  "...SSSSSS...",
  "..JJJJJJJJ..",
  ".JJjjjjjjJJ.",
  ".JJjjjjjjJJ.",
  "..JJJJJJJJ..",
  "...SS..SS...",
  "...SS..SS...",
  "...KK..KK...",
  "............",
];

const BAT_GRID = [
  "............",
  "..K......K..",
  ".KKK....KKK.",
  "KKKKK..KKKKK",
  "KkKKKKKKKKkK",
  ".KKKKEEKKK..",
  "..KKKKKKK...",
  "...KKKKK....",
  "............",
];

const JAGUAR_GRID = [
  "............",
  "....PPPP....",
  "...PppppP...",
  "..PpEppEpP..",
  ".PpppppppPp.",
  ".PppppppppP.",
  "..PPPPPPPP..",
  "...P.PP.P...",
  "...P.PP.P...",
  "............",
];

const SKELETON_GRID = [
  "............",
  "...WWWWWW...",
  "..WEWWWWEW..",
  "...WWWWWW...",
  "..WWWWWWWW..",
  "..W.WWWW.W..",
  ".WW.WWWW.WW.",
  "....W..W....",
  "....K..K....",
  "............",
];

const CAMAZOTZ_GRID = [
  "................",
  "..K..........K..",
  ".KKK........KKK.",
  "KKKKK......KKKKK",
  "KKKKKKK..KKKKKKK",
  "KrKKKKKKKKKKKKrK",
  "RKKKKKKEEKKKKKKR",
  ".RKKKKKKKKKKKKR.",
  "..RRRRRRRRRRRR..",
  "...RR.RRRR.RR...",
  "....R..RR..R....",
  "....K..RR..K....",
  "................",
];

const GEM_GRID = ["..G.", ".GgG", "GggG", ".GGG", "..G."];

const LIFE_CROSS_GRID = [
  "..RR..",
  "..rr..",
  "RRRRRR",
  "RrrrrR",
  "..rr..",
  "..RR..",
];

// ---------- Projectile / fx grids ----------

const DART_GRID = ["..K.", ".KkK", "KkkK", ".Kk.", "..K."];
const ORB_GRID = [".jj.", "jJJj", "jJJj", ".jj."];
const SUN_GRID = ["..Y..", ".YOY.", "YOoOY", ".YOY.", "..Y.."];
const WHIP_GRID = [".GG.", "GggG", ".GG."];
const SHRAPNEL_GRID = [".W.", "WwW", ".W."];

export function generateAllTextures(scene: Phaser.Scene) {
  drawGrid(scene, "tex-player", PLAYER_GRID, 4);
  drawGrid(scene, "tex-bat", BAT_GRID, 4);
  drawGrid(scene, "tex-jaguar", JAGUAR_GRID, 4);
  drawGrid(scene, "tex-skeleton", SKELETON_GRID, 4);
  drawGrid(scene, "tex-camazotz", CAMAZOTZ_GRID, 5);
  drawGrid(scene, "tex-gem", GEM_GRID, 4, false);
  drawGrid(scene, "tex-dart", DART_GRID, 4, false);
  drawGrid(scene, "tex-orb", ORB_GRID, 4, false);
  drawGrid(scene, "tex-sun", SUN_GRID, 5, false);
  drawGrid(scene, "tex-whip", WHIP_GRID, 5, false);
  drawGrid(scene, "tex-shrapnel", SHRAPNEL_GRID, 4, false);
  drawGrid(scene, "tex-lifecross", LIFE_CROSS_GRID, 4, false);

  generateGroundTile(scene);
  generateVignette(scene);
  generateParticle(scene);
}

function generateGroundTile(scene: Phaser.Scene) {
  const size = 64;
  const key = "tex-ground";
  const canvasTexture = scene.textures.createCanvas(key, size, size);
  if (!canvasTexture) return;
  const ctx = canvasTexture.getContext();

  ctx.fillStyle = "#120E0B";
  ctx.fillRect(0, 0, size, size);

  // Carved stone block pattern
  ctx.strokeStyle = "#231B15";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  const rng = Phaser.Math.RND;
  for (let i = 0; i < 10; i++) {
    const x = rng.between(4, size - 8);
    const y = rng.between(4, size - 8);
    ctx.fillStyle = rng.pick(["#1C1712", "#241C16", "#0E7A5F22"]);
    ctx.fillRect(x, y, rng.between(2, 5), rng.between(2, 5));
  }

  // faint jade moss speckle
  ctx.fillStyle = "rgba(14, 122, 95, 0.15)";
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(rng.between(0, size), rng.between(0, size), 2, 2);
  }

  canvasTexture.refresh();
}

function generateVignette(scene: Phaser.Scene) {
  const size = 512;
  const key = "tex-vignette";
  const canvasTexture = scene.textures.createCanvas(key, size, size);
  if (!canvasTexture) return;
  const ctx = canvasTexture.getContext();
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.25,
    size / 2,
    size / 2,
    size * 0.65
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  canvasTexture.refresh();
}

function generateParticle(scene: Phaser.Scene) {
  const size = 8;
  const key = "tex-particle";
  const canvasTexture = scene.textures.createCanvas(key, size, size);
  if (!canvasTexture) return;
  const ctx = canvasTexture.getContext();
  ctx.fillStyle = "#E6C65C";
  ctx.fillRect(0, 0, size, size);
  canvasTexture.refresh();
}
