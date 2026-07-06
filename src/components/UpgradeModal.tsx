import {
  Swords,
  Orbit,
  Sun,
  Wind,
  Sparkles,
  Heart,
  Feather,
  Gem,
  Flame,
  Shield,
  Sparkle,
} from "lucide-react";
import { useGameStore, gameBridge } from "../store/gameStore";
import type { UpgradeOption } from "../game/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dart: Swords,
  orbit: Orbit,
  sun: Sun,
  whip: Wind,
  shrapnel: Sparkles,
  heart: Heart,
  feather: Feather,
  amulet: Gem,
  incense: Flame,
  skin: Shield,
};

export default function UpgradeModal() {
  const phase = useGameStore((s) => s.phase);
  const options = useGameStore((s) => s.upgradeOptions);

  if (phase !== "levelup") return null;

  const handlePick = (option: UpgradeOption) => {
    gameBridge.chooseUpgrade?.(option);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/85 backdrop-blur-md">
      <div className="flex w-full max-w-3xl flex-col items-center gap-6 px-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <Sparkle className="h-6 w-6 text-gold animate-flicker" />
          <h2 className="font-glyph text-2xl font-bold uppercase tracking-[0.15em] text-gold-light sm:text-3xl">
            Los dioses te bendicen
          </h2>
          <p className="text-sm text-bone/70">Elige un poder de Xibalba</p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {options.map((option) => {
            const Icon = ICONS[option.icon] ?? Sparkles;
            return (
              <button
                key={option.id}
                onClick={() => handlePick(option)}
                className="group flex flex-col items-center gap-3 rounded-xl border-2 border-gold/40 bg-gradient-to-b from-obsidian-light to-obsidian-dark p-5 text-center shadow-lg transition-all hover:-translate-y-1 hover:border-gold hover:shadow-glow active:translate-y-0"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-jade/60 bg-jade-dark/30 text-jade-light transition-colors group-hover:border-gold group-hover:text-gold-light">
                  <Icon className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-glyph text-base font-bold text-bone">{option.name}</p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-gold/80">
                    {option.isNew ? "Nuevo" : `Nivel ${option.nextLevel}`}
                  </p>
                </div>
                <p className="text-xs leading-snug text-bone/70">{option.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
