import { Heart, Skull, Timer, Gem } from "lucide-react";
import { useGameStore } from "../store/gameStore";
import { RUN_DURATION_SECONDS } from "../game/config";

function formatCountdown(totalSeconds: number) {
  const remaining = Math.max(0, RUN_DURATION_SECONDS - totalSeconds);
  const m = Math.floor(remaining / 60).toString().padStart(2, "0");
  const s = Math.floor(remaining % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatCountUp(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function HUD() {
  const { hp, maxHp, level, xp, xpToNext, timeSurvived, kills, bossActive, bossHp, bossMaxHp, bossName, mode } =
    useGameStore();

  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const xpPct = Math.max(0, Math.min(100, (xp / xpToNext) * 100));
  const bossPct = bossMaxHp > 0 ? Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100)) : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex flex-col items-center gap-2 p-3 sm:p-4">
      <div className="flex w-full max-w-2xl items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-blood/60 bg-obsidian/70 px-3 py-1.5 shadow-lg backdrop-blur-sm">
          <Heart className="h-4 w-4 shrink-0 text-blood-light" fill="currentColor" />
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-obsidian-dark">
            <div
              className="h-full bg-gradient-to-r from-blood-dark via-blood to-blood-light transition-all duration-200"
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span className="font-pixel text-[9px] text-bone">
            {Math.max(0, Math.round(hp))}/{Math.round(maxHp)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-gold/60 bg-obsidian/70 px-3 py-1.5 shadow-lg backdrop-blur-sm">
          <Timer className="h-4 w-4 text-gold-light" />
          <span className="font-pixel text-[10px] text-gold-light">
            {mode === "infinite" ? formatCountUp(timeSurvived) : formatCountdown(timeSurvived)}
          </span>
        </div>
      </div>

      <div className="flex w-full max-w-2xl items-center gap-2">
        <span className="font-glyph text-xs font-bold tracking-wide text-jade-light">Nv.{level}</span>
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full border border-jade-dark/60 bg-obsidian-dark">
          <div
            className="h-full bg-gradient-to-r from-jade-dark via-jade to-jade-light transition-all duration-200"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-full border border-gold/30 bg-obsidian/60 px-4 py-1 text-[11px] text-bone/90 backdrop-blur-sm">
        <span className="flex items-center gap-1">
          <Skull className="h-3.5 w-3.5 text-bone/70" /> {kills}
        </span>
        <span className="flex items-center gap-1">
          <Gem className="h-3.5 w-3.5 text-jade-light" /> {level}
        </span>
      </div>

      {bossActive && (
        <div className="mt-1 flex w-full max-w-md flex-col items-center gap-1 animate-flicker">
          <span className="font-glyph text-xs font-bold uppercase tracking-[0.2em] text-blood-light text-stroke">
            {bossName}
          </span>
          <div className="relative h-3 w-full overflow-hidden rounded-full border border-blood/70 bg-obsidian-dark">
            <div
              className="h-full bg-gradient-to-r from-blood-dark via-blood to-blood-light transition-all duration-200"
              style={{ width: `${bossPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}