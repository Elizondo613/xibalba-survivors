import { Sparkles, ArrowRight } from "lucide-react";
import { useGameStore, gameBridge } from "../store/gameStore";
import { MAPS } from "../game/maps";

export default function ZoneClearScreen() {
  const phase = useGameStore((s) => s.phase);
  const mapIndex = useGameStore((s) => s.mapIndex);

  if (phase !== "zone-clear") return null;

  const clearedMap = MAPS[mapIndex];
  const nextMap = MAPS[mapIndex + 1];

  const handleContinue = () => {
    gameBridge.advanceMap?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-obsidian/95 px-6 text-center backdrop-blur-md">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(201,162,39,0.2),transparent_60%)]" />

      <div className="relative flex flex-col items-center gap-2">
        <Sparkles className="h-8 w-8 text-gold-light animate-flicker" />
        <h2 className="font-glyph text-2xl font-bold uppercase tracking-[0.15em] text-gold-light sm:text-3xl">
          {clearedMap.name}: superada
        </h2>
      </div>

      <p className="relative max-w-lg font-glyph text-base leading-relaxed text-bone/85">
        {clearedMap.clearText}
      </p>

      <button
        onClick={handleContinue}
        className="relative flex items-center gap-2 rounded-lg border-2 border-gold bg-gradient-to-b from-jade to-jade-dark px-8 py-3 font-glyph font-bold uppercase tracking-wide text-bone shadow-glow transition-transform hover:scale-105 active:scale-95"
      >
        Continuar{nextMap ? ` a ${nextMap.name}` : ""}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}