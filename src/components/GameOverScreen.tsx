import { Skull, RotateCcw, Trophy, Timer, Gem, Sparkles } from "lucide-react";
import { useGameStore, gameBridge } from "../store/gameStore";
import { MAPS } from "../game/maps";

export default function GameOverScreen() {
  const phase = useGameStore((s) => s.phase);
  const stats = useGameStore((s) => s.finalStats);
  const reset = useGameStore((s) => s.reset);
  const highScore = useGameStore((s) => s.highScore);
  const newLevelRecord = useGameStore((s) => s.newLevelRecord);
  const newTimeRecord = useGameStore((s) => s.newTimeRecord);
  const mode = useGameStore((s) => s.mode);
  const mapIndex = useGameStore((s) => s.mapIndex);

  if (phase !== "gameover" || !stats) return null;

  const minutes = Math.floor(stats.timeSurvived / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(stats.timeSurvived % 60)
    .toString()
    .padStart(2, "0");

  const handleRetry = () => {
    gameBridge.restart?.();
  };

  const handleMenu = () => {
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-obsidian/95 px-4 text-center backdrop-blur-md">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(158,43,37,0.25),transparent_60%)]" />

      <div className="relative flex flex-col items-center gap-2">
        <Skull className="h-12 w-12 text-blood-light" />
        <h2 className="font-glyph text-3xl font-black uppercase tracking-[0.15em] text-blood-light sm:text-5xl">
          Has caído en Xibalba
        </h2>
        <p className="text-sm text-bone/60">El inframundo reclamó otra alma.</p>
        {mode === "story" && (
          <p className="text-xs text-bone/40">Caíste en: {MAPS[mapIndex]?.name}</p>
        )}
      </div>

      <div className="relative grid grid-cols-3 gap-4 rounded-xl border border-blood/30 bg-obsidian-light/60 px-6 py-4">
        <Stat icon={<Timer className="h-4 w-4" />} label="Tiempo" value={`${minutes}:${seconds}`} />
        <Stat icon={<Trophy className="h-4 w-4" />} label="Nivel" value={String(stats.level)} />
        <Stat icon={<Gem className="h-4 w-4" />} label="Bajas" value={String(stats.kills)} />
      </div>

      {(newLevelRecord || newTimeRecord) && (
        <div className="relative flex items-center gap-2 rounded-full border border-gold bg-gold/10 px-4 py-1.5 text-gold-light animate-flicker">
          <Sparkles className="h-4 w-4" />
          <span className="font-glyph text-xs font-bold uppercase tracking-wide">
            ¡Nuevo récord{newLevelRecord && newTimeRecord ? "s" : ""}
            {newLevelRecord ? " de nivel" : ""}
            {newLevelRecord && newTimeRecord ? " y" : ""}
            {newTimeRecord ? " de tiempo" : ""}!
          </span>
        </div>
      )}

      <div className="relative flex items-center gap-4 text-[10px] uppercase tracking-wider text-bone/40">
        <span>Récord: Nv.{highScore.bestLevel}</span>
        <span>·</span>
        <span>Bajas totales: {highScore.totalKills}</span>
      </div>

      <div className="relative flex gap-3">
        <button
          onClick={handleRetry}
          className="flex items-center gap-2 rounded-lg border-2 border-gold bg-gradient-to-b from-blood to-blood-dark px-6 py-3 font-glyph font-bold uppercase tracking-wide text-bone shadow-glow transition-transform hover:scale-105 active:scale-95"
        >
          <RotateCcw className="h-4 w-4" /> Reintentar
        </button>
        <button
          onClick={handleMenu}
          className="rounded-lg border border-bone/30 px-6 py-3 font-glyph text-sm text-bone/70 transition-colors hover:border-bone hover:text-bone"
        >
          Menú
        </button>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-gold-light">{icon}</div>
      <span className="font-pixel text-[11px] text-bone">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-bone/50">{label}</span>
    </div>
  );
}