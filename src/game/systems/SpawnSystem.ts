import type { EnemyKind } from "../types";
import { difficultyAt } from "../config";

export interface SpawnRequest {
  kind: EnemyKind;
  x: number;
  y: number;
}

const SPAWN_MARGIN = 60; // spawn just outside the camera view

export class SpawnSystem {
  private nextSpawnAt = 800;
  private bossSpawned = false;

  /** Weighted enemy pool that shifts toward tougher foes over time. */
  private pickKind(elapsedSeconds: number): EnemyKind {
    const minutes = elapsedSeconds / 60;
    const roll = Math.random();
    if (minutes < 0.5) {
      return roll < 0.85 ? "bat" : "skeleton";
    }
    if (minutes < 1.5) {
      if (roll < 0.55) return "bat";
      if (roll < 0.85) return "skeleton";
      return "jaguar";
    }
    if (roll < 0.4) return "bat";
    if (roll < 0.7) return "skeleton";
    return "jaguar";
  }

  update(
    timeMs: number,
    elapsedSeconds: number,
    playerX: number,
    playerY: number,
    viewWidth: number,
    viewHeight: number
  ): SpawnRequest[] {
    const requests: SpawnRequest[] = [];

    // Boss arrives once, ~4 minutes in, as the climactic threat before
    // the 5-minute survive-and-win line.
    if (!this.bossSpawned && elapsedSeconds >= 240) {
      this.bossSpawned = true;
      const angle = Math.random() * Math.PI * 2;
      const dist = viewWidth * 0.6;
      requests.push({
        kind: "camazotz",
        x: playerX + Math.cos(angle) * dist,
        y: playerY + Math.sin(angle) * dist,
      });
    }

    if (timeMs < this.nextSpawnAt) return requests;

    const diff = difficultyAt(elapsedSeconds);
    this.nextSpawnAt = timeMs + diff.spawnIntervalMs;

    const count = diff.enemiesPerWave;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const edgeDist = Math.max(viewWidth, viewHeight) / 2 + SPAWN_MARGIN;
      requests.push({
        kind: this.pickKind(elapsedSeconds),
        x: playerX + Math.cos(angle) * edgeDist,
        y: playerY + Math.sin(angle) * edgeDist,
      });
    }

    return requests;
  }
}
