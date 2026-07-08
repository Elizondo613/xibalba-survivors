import type { RunStats } from "../types";

const STORAGE_KEY = "xibalba-survivors:highscore:v1";

export interface HighScoreData {
  /** Highest level reached in any single run. */
  bestLevel: number;
  /** Lifetime total of enemies eliminated across every run ever played. */
  totalKills: number;
  /** Longest survival time (seconds) in any single run. */
  bestTimeSurvived: number;
}

export interface RecordRunResult {
  data: HighScoreData;
  newLevelRecord: boolean;
  newTimeRecord: boolean;
}

const DEFAULT_HIGH_SCORE: HighScoreData = {
  bestLevel: 0,
  totalKills: 0,
  bestTimeSurvived: 0,
};

/** Reads the stored high score. Falls back to defaults if localStorage
 * is unavailable (private browsing, disabled storage, SSR, etc.) or the
 * stored value is missing/corrupted — never throws. */
export function loadHighScore(): HighScoreData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_HIGH_SCORE };
    const parsed = JSON.parse(raw);
    return {
      bestLevel: Number(parsed.bestLevel) || 0,
      totalKills: Number(parsed.totalKills) || 0,
      bestTimeSurvived: Number(parsed.bestTimeSurvived) || 0,
    };
  } catch {
    return { ...DEFAULT_HIGH_SCORE };
  }
}

function saveHighScore(data: HighScoreData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable (private mode / quota) — fail silently,
    // the run itself should never be blocked by a persistence error.
  }
}

/** Merges the just-finished run into the persisted high score and
 * saves it. `bestLevel`/`bestTimeSurvived` track the best single run;
 * `totalKills` is a lifetime cumulative counter across all runs. */
export function recordRun(stats: RunStats): RecordRunResult {
  const current = loadHighScore();

  const newLevelRecord = stats.level > current.bestLevel;
  const newTimeRecord = stats.timeSurvived > current.bestTimeSurvived;

  const updated: HighScoreData = {
    bestLevel: Math.max(current.bestLevel, stats.level),
    totalKills: current.totalKills + stats.kills,
    bestTimeSurvived: Math.max(current.bestTimeSurvived, stats.timeSurvived),
  };

  saveHighScore(updated);
  return { data: updated, newLevelRecord, newTimeRecord };
}