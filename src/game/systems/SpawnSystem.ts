import type { EnemyKind } from "../types";
import { difficultyAt, ELITE_SPAWN_WEIGHT, SPAWN_CAPS, SPAWN_WEIGHTS } from "../config";

export interface SpawnRequest {
  kind: EnemyKind;
  x: number;
  y: number;
  hpMult?: number;
  dmgMult?: number;
}

const SPAWN_MARGIN = 60;
const REGULAR_KINDS: ("bat" | "skeleton" | "jaguar")[] = ["bat", "skeleton", "jaguar"];

/** Spawns one house's enemies. Both modes now work the same way: one
 * boss visit per house, `bossAtSeconds` into it. In Modo Infinito the
 * scene loads the next house when that boss dies. */
export class SpawnSystem {
  private nextSpawnAt = 800;
  private bossSpawned = false;

  constructor(
    private bossKind: EnemyKind,
    private eliteKind: EnemyKind | undefined,
    readonly bossAtSeconds: number,
    /** Extra boss strength (Modo Infinito cycles); 1 = normal. */
    private bossMult = 1
  ) {}

  private pickKind(aliveCounts: Record<EnemyKind, number>): EnemyKind {
    const pool: { kind: EnemyKind; weight: number }[] = REGULAR_KINDS.filter(
      (k) => aliveCounts[k] < SPAWN_CAPS[k]
    ).map((k) => ({ kind: k, weight: SPAWN_WEIGHTS[k] }));

    if (this.eliteKind && aliveCounts[this.eliteKind] < SPAWN_CAPS[this.eliteKind]) {
      pool.push({ kind: this.eliteKind, weight: ELITE_SPAWN_WEIGHT });
    }

    if (pool.length === 0) return "bat";

    const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const p of pool) {
      roll -= p.weight;
      if (roll <= 0) return p.kind;
    }
    return pool[pool.length - 1].kind;
  }

  update(
    timeMs: number,
    elapsedSeconds: number,
    playerX: number,
    playerY: number,
    viewWidth: number,
    viewHeight: number,
    aliveCounts: Record<EnemyKind, number>
  ): SpawnRequest[] {
    const requests: SpawnRequest[] = [];

    if (!this.bossSpawned && elapsedSeconds >= this.bossAtSeconds && aliveCounts[this.bossKind] < SPAWN_CAPS[this.bossKind]) {
      this.bossSpawned = true;
      const angle = Math.random() * Math.PI * 2;
      const dist = viewWidth * 0.6;
      requests.push({
        kind: this.bossKind,
        x: playerX + Math.cos(angle) * dist,
        y: playerY + Math.sin(angle) * dist,
        hpMult: this.bossMult,
        dmgMult: 1 + (this.bossMult - 1) * 0.6,
      });
    }

    if (timeMs < this.nextSpawnAt) return requests;

    const diff = difficultyAt(elapsedSeconds);
    this.nextSpawnAt = timeMs + diff.spawnIntervalMs;

    const runningCounts = { ...aliveCounts };

    const count = diff.enemiesPerWave;
    for (let i = 0; i < count; i++) {
      const kind = this.pickKind(runningCounts);
      runningCounts[kind] += 1;

      const angle = Math.random() * Math.PI * 2;
      const edgeDist = Math.max(viewWidth, viewHeight) / 2 + SPAWN_MARGIN;
      requests.push({
        kind,
        x: playerX + Math.cos(angle) * edgeDist,
        y: playerY + Math.sin(angle) * edgeDist,
      });
    }

    return requests;
  }
}