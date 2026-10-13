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
  X: "#3B4048", // slate / dark steel
  x: "#A9B6C4", // blade steel glint
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

const JAGUAR_LORD_GRID = [
  "....P......P....",
  "...PPp....pPP...",
  "..PPppp..pppPP..",
  ".PpEpppPPpppEpP.",
  ".PppppPppPppppP.",
  ".PPPPPPPPPPPPPP.",
  "RPPPPPPPPPPPPPPR",
  "RRPPPPPPPPPPPPRR",
  ".RRRRRRRRRRRRRR.",
  "..RR.RRRRRR.RR..",
  "...R..RRRR..R...",
  "...K...KK...K...",
  "................",
];

const OBSIDIAN_DANCER_GRID = [
  "............",
  ".....XX.....",
  "....XrrX....",
  "....XXXX....",
  "x..XXxxXX..x",
  ".x.XXXXXX.x.",
  "..xXXxxXXx..",
  "...XXXXXX...",
  "...XX..XX...",
  "..XX....XX..",
  "..K......K..",
  "............",
];

const AHALTOCOB_GRID = [
  "..x..x....x..x..",
  "..x.xx.xx.xx.x..",
  "..XXXXXXXXXXXX..",
  "..XKrrKXXKrrKX..",
  "..XXXXXxxXXXXX..",
  "x..XXXXXXXXXX..x",
  ".x.RXXxXXxXXR.x.",
  "..xRRXXXXXXRRx..",
  "...RRXXxxXXRR...",
  "....XXXXXXXX....",
  "....XX....XX....",
  "...XX......XX...",
  "...KK......KK...",
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
const JAGUAR_SPIKE_GRID = [".P.", "PpP", "PpP", ".P."];
// Points along +x: Projectile rotates sprites to face their velocity.
const BLADE_GRID = ["..x...", "XxxxxX", "..x..."];

export function generateAllTextures(scene: Phaser.Scene) {
  drawGrid(scene, "tex-player", PLAYER_GRID, 4);
  drawGrid(scene, "tex-bat", BAT_GRID, 4);
  drawGrid(scene, "tex-jaguar", JAGUAR_GRID, 4);
  drawGrid(scene, "tex-skeleton", SKELETON_GRID, 4);
  drawGrid(scene, "tex-camazotz", CAMAZOTZ_GRID, 5);
  drawGrid(scene, "tex-jaguarlord", JAGUAR_LORD_GRID, 5);
  drawGrid(scene, "tex-dancer", OBSIDIAN_DANCER_GRID, 4);
  drawGrid(scene, "tex-ahaltocob", AHALTOCOB_GRID, 5);
  drawGrid(scene, "tex-blade", BLADE_GRID, 4);
  drawGrid(scene, "tex-gem", GEM_GRID, 4, false);
  drawGrid(scene, "tex-dart", DART_GRID, 4, false);
  drawGrid(scene, "tex-orb", ORB_GRID, 4, false);
  drawGrid(scene, "tex-sun", SUN_GRID, 5, false);
  drawGrid(scene, "tex-whip", WHIP_GRID, 5, false);
  drawGrid(scene, "tex-shrapnel", SHRAPNEL_GRID, 4, false);
  drawGrid(scene, "tex-jaguarspike", JAGUAR_SPIKE_GRID, 5, false);
  drawGrid(scene, "tex-lifecross", LIFE_CROSS_GRID, 4, false);

  generateHouseGrounds(scene);
  generateVignette(scene);
  generateParticle(scene);
}

// ---------- Ground tiles: one per "house" of Xibalba ----------
// Each map in maps.ts points to one of these keys via `groundTexture`.

type Rng = Phaser.Math.RandomDataGenerator;

interface GroundStyle {
  base: string;
  line: string;
  specks: string[];
  /** Draws the house-specific details on top of the base stone. */
  decorate: (ctx: CanvasRenderingContext2D, rng: Rng, size: number) => void;
}

const GROUND_STYLES: Record<string, GroundStyle> = {
  // Casa de los Murciélagos: dark cave stone with faint jade moss.
  "tex-ground-murcielagos": {
    base: "#120E0B",
    line: "#231B15",
    specks: ["#1C1712", "#241C16", "#0E7A5F22"],
    decorate: (ctx, rng, size) => {
      ctx.fillStyle = "rgba(14, 122, 95, 0.15)";
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(rng.between(0, size), rng.between(0, size), 2, 2);
      }
    },
  },
  // Casa de los Jaguares: reddish earth raked by claw marks.
  "tex-ground-jaguares": {
    base: "#170D09",
    line: "#2E1A12",
    specks: ["#24130D", "#331A11"],
    decorate: (ctx, rng, size) => {
      ctx.strokeStyle = "#4A2418";
      ctx.lineWidth = 2;
      for (let n = 0; n < 2; n++) {
        const x = rng.between(6, size - 22);
        const y = rng.between(6, size - 22);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x + i * 5, y);
          ctx.lineTo(x + i * 5 + 10, y + 14);
          ctx.stroke();
        }
      }
      ctx.fillStyle = "rgba(158, 43, 37, 0.16)";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(rng.between(0, size - 3), rng.between(0, size - 3), 3, 3);
      }
    },
  },
  // Casa de las Navajas: cold slate littered with obsidian blades and
  // thin blood-red cuts.
  "tex-ground-navajas": {
    base: "#101216",
    line: "#23282F",
    specks: ["#191C21", "#20242A"],
    decorate: (ctx, rng, size) => {
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const x = rng.between(4, size - 14);
        const y = rng.between(4, size - 14);
        const len = rng.between(6, 11);
        ctx.strokeStyle = "#6F7F8F";
        ctx.beginPath();
        ctx.moveTo(x, y + len);
        ctx.lineTo(x + len, y);
        ctx.stroke();
        ctx.fillStyle = "#B8C6D4"; // glint on the tip
        ctx.fillRect(x + len - 1, y - 1, 2, 2);
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(90, 22, 22, 0.65)";
      for (let i = 0; i < 2; i++) {
        const x = rng.between(2, size - 20);
        const y = rng.between(2, size - 4);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + rng.between(8, 16), y + rng.between(-2, 2));
        ctx.stroke();
      }
    },
  },
};

function generateHouseGrounds(scene: Phaser.Scene) {
  const size = 64;
  const rng = Phaser.Math.RND;

  for (const [key, style] of Object.entries(GROUND_STYLES)) {
    const canvasTexture = scene.textures.createCanvas(key, size, size);
    if (!canvasTexture) continue;
    const ctx = canvasTexture.getContext();

    ctx.fillStyle = style.base;
    ctx.fillRect(0, 0, size, size);

    // Carved stone block outline
    ctx.strokeStyle = style.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = rng.pick(style.specks);
      ctx.fillRect(rng.between(4, size - 8), rng.between(4, size - 8), rng.between(2, 5), rng.between(2, 5));
    }

    style.decorate(ctx, rng, size);
    canvasTexture.refresh();
  }
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
