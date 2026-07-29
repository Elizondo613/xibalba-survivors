import { create } from "zustand";
import type { GameMode, GamePhase, RunStats, UpgradeOption } from "../game/types";
import { audioManager } from "../game/utils/AudioManager";
import { loadHighScore, recordRun, type HighScoreData } from "../game/utils/HighScoreManager";

interface GameStoreState {
  phase: GamePhase;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  timeSurvived: number;
  kills: number;
  cacaoCollected: number;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  upgradeOptions: UpgradeOption[];
  finalStats: RunStats | null;
  musicOn: boolean;
  sfxOn: boolean;

  highScore: HighScoreData;
  newLevelRecord: boolean;
  newTimeRecord: boolean;

  /** Modo Historia vs Modo Infinito, and which "house" of Xibalba
   * (index into MAPS) the current story run is on. Infinite mode
   * ignores mapIndex and always plays MAPS[0] on a loop. */
  mode: GameMode;
  mapIndex: number;

  setPhase: (phase: GamePhase) => void;
  setHud: (partial: Partial<GameStoreState>) => void;
  setUpgradeOptions: (options: UpgradeOption[]) => void;
  setBoss: (active: boolean, hp?: number, maxHp?: number, name?: string) => void;
  endRun: (stats: RunStats, victory: boolean) => void;
  reset: () => void;
  toggleMusic: () => void;
  toggleSfx: () => void;
  chooseStoryMode: () => void;
  chooseInfiniteMode: () => void;
  setMapIndex: (mapIndex: number) => void;
}

export const gameBridge: {
  chooseUpgrade: ((option: UpgradeOption) => void) | null;
  restart: (() => void) | null;
  requestStart: (() => void) | null;
  advanceMap: (() => void) | null;
} = {
  chooseUpgrade: null,
  restart: null,
  requestStart: null,
  advanceMap: null,
};

const initialHud = {
  hp: 100,
  maxHp: 100,
  level: 1,
  xp: 0,
  xpToNext: 14,
  timeSurvived: 0,
  kills: 0,
  cacaoCollected: 0,
  bossActive: false,
  bossHp: 0,
  bossMaxHp: 0,
  bossName: "",
};

export const useGameStore = create<GameStoreState>((set) => ({
  phase: "menu",
  ...initialHud,
  upgradeOptions: [],
  finalStats: null,
  musicOn: true,
  sfxOn: true,
  highScore: loadHighScore(),
  newLevelRecord: false,
  newTimeRecord: false,
  mode: "story",
  mapIndex: 0,

  setPhase: (phase) => set({ phase }),
  setHud: (partial) => set(partial),
  setUpgradeOptions: (upgradeOptions) => set({ upgradeOptions }),
  setBoss: (bossActive, bossHp = 0, bossMaxHp = 0, bossName = "") =>
    set({ bossActive, bossHp, bossMaxHp, bossName }),
  endRun: (stats, victory) => {
    const { data, newLevelRecord, newTimeRecord } = recordRun(stats);
    set({
      finalStats: stats,
      phase: victory ? "victory" : "gameover",
      highScore: data,
      newLevelRecord,
      newTimeRecord,
    });
  },
  reset: () =>
    set({
      ...initialHud,
      phase: "menu",
      upgradeOptions: [],
      finalStats: null,
      newLevelRecord: false,
      newTimeRecord: false,
    }),
  toggleMusic: () =>
    set((s) => {
      const next = !s.musicOn;
      audioManager.setMusicEnabled(next);
      return { musicOn: next };
    }),
  toggleSfx: () =>
    set((s) => {
      const next = !s.sfxOn;
      audioManager.setSfxEnabled(next);
      return { sfxOn: next };
    }),
  chooseStoryMode: () => set({ mode: "story", mapIndex: 0, phase: "story-intro" }),
  chooseInfiniteMode: () => set({ mode: "infinite", mapIndex: 0 }),
  setMapIndex: (mapIndex) => set({ mapIndex }),
}));