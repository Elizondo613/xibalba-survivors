import { useEffect, useState } from "react";
import { Skull, Music, Volume2, VolumeX, Music2, Trophy, Timer, Swords } from "lucide-react";
import { useGameStore, gameBridge } from "../store/gameStore";
import { audioManager } from "../game/utils/AudioManager";

function formatBestTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function StartScreen() {
  const highScore = useGameStore((s) => s.highScore);
  const phase = useGameStore((s) => s.phase);
  const musicOn = useGameStore((s) => s.musicOn);
  const sfxOn = useGameStore((s) => s.sfxOn);
  const toggleMusic = useGameStore((s) => s.toggleMusic);
  const toggleSfx = useGameStore((s) => s.toggleSfx);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (gameBridge.requestStart) {
        setReady(true);
        window.clearInterval(id);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  if (phase !== "menu") return null;

  const handleStart = () => {
    audioManager.unlock();
    gameBridge.requestStart?.();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-obsidian px-4 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(14,122,95,0.18),transparent_60%)]" />

      <div className="relative flex flex-col items-center gap-3">
        <Skull className="h-10 w-10 text-gold animate-flicker" />
        <h1 className="font-glyph text-4xl font-black uppercase tracking-[0.12em] text-bone sm:text-6xl">
          <span className="text-jade-light">Xibalba</span>{" "}
          <span className="text-blood-light">Survivors</span>
        </h1>
        <p className="max-w-md text-sm text-bone/70 sm:text-base">
          Desciende al inframundo maya. Sobrevive cinco minutos a los horrores de Xibalba
          mientras el poder de los dioses se acumula en tus manos.
        </p>
      </div>

      {(highScore.bestLevel > 0 || highScore.totalKills > 0) && (
        <div className="relative flex items-center gap-5 rounded-xl border border-gold/30 bg-obsidian-light/50 px-5 py-3">
          <div className="flex flex-col items-center gap-1">
            <Trophy className="h-4 w-4 text-gold-light" />
            <span className="font-pixel text-[10px] text-bone">Nv.{highScore.bestLevel}</span>
            <span className="text-[9px] uppercase tracking-wider text-bone/50">Récord</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Swords className="h-4 w-4 text-blood-light" />
            <span className="font-pixel text-[10px] text-bone">{highScore.totalKills}</span>
            <span className="text-[9px] uppercase tracking-wider text-bone/50">Bajas totales</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Timer className="h-4 w-4 text-jade-light" />
            <span className="font-pixel text-[10px] text-bone">
              {formatBestTime(highScore.bestTimeSurvived)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-bone/50">Mejor tiempo</span>
          </div>
        </div>
      )}

      <div className="relative flex flex-col items-center gap-3">
        <button
          onClick={handleStart}
          disabled={!ready}
          className="rounded-lg border-2 border-gold bg-gradient-to-b from-jade to-jade-dark px-8 py-3 font-glyph text-lg font-bold uppercase tracking-widest text-bone shadow-glow transition-transform hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-50"
        >
          {ready ? "Comenzar" : "Despertando a Xibalba…"}
        </button>

        <div className="flex gap-3 text-bone/60">
          <button
            onClick={toggleMusic}
            className="flex items-center gap-1.5 rounded-full border border-gold/30 px-3 py-1 text-xs transition-colors hover:border-gold hover:text-gold-light"
          >
            {musicOn ? <Music2 className="h-3.5 w-3.5" /> : <Music className="h-3.5 w-3.5 opacity-40" />}
            Música
          </button>
          <button
            onClick={toggleSfx}
            className="flex items-center gap-1.5 rounded-full border border-gold/30 px-3 py-1 text-xs transition-colors hover:border-gold hover:text-gold-light"
          >
            {sfxOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 opacity-40" />}
            Efectos
          </button>
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-2 text-xs text-bone/50 sm:grid-cols-3 sm:gap-6">
        <p>⌨️ Muévete con <span className="text-gold-light">WASD</span> o flechas</p>
        <p>📱 En móvil, usa el joystick táctil</p>
        <p>⚔️ Ataques automáticos — enfócate en esquivar</p>
      </div>
    </div>
  );
}
