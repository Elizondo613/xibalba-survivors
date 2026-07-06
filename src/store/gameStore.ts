import { create } from "zustand";
import type { GamePhase, RunStats, UpgradeOption } from "../game/types";
import { audioManager } from "../game/utils/AudioManager";

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
  upgradeOptions: UpgradeOption[];
  finalStats: RunStats | null;
  musicOn: boolean;
  sfxOn: boolean;

  setPhase: (phase: GamePhase) => void;
  setHud: (partial: Partial<GameStoreState>) => void;
  setUpgradeOptions: (options: UpgradeOption[]) => void;
  setBoss: (active: boolean, hp?: number, maxHp?: number) => void;
  endRun: (stats: RunStats, victory: boolean) => void;
  reset: () => void;
  toggleMusic: () => void;
  toggleSfx: () => void;
}

/** Set by GameCanvas once the Phaser game boots; used by React UI to
 * call back into the running scene (choose upgrade, resume, restart). */
export const gameBridge: {
  chooseUpgrade: ((option: UpgradeOption) => void) | null;
  restart: (() => void) | null;
  requestStart: (() => void) | null;
} = {
  chooseUpgrade: null,
  restart: null,
  requestStart: null,
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
};

export const useGameStore = create<GameStoreState>((set) => ({
  phase: "menu",
  ...initialHud,
  upgradeOptions: [],
  finalStats: null,
  musicOn: true,
  sfxOn: true,

  setPhase: (phase) => set({ phase }),
  setHud: (partial) => set(partial),
  setUpgradeOptions: (upgradeOptions) => set({ upgradeOptions }),
  setBoss: (bossActive, bossHp = 0, bossMaxHp = 0) =>
    set({ bossActive, bossHp, bossMaxHp }),
  endRun: (stats, victory) =>
    set({
      finalStats: stats,
      phase: victory ? "victory" : "gameover",
    }),
  reset: () =>
    set({
      ...initialHud,
      phase: "menu",
      upgradeOptions: [],
      finalStats: null,
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
}));
