import { useState } from "react";
import { Skull, ArrowRight } from "lucide-react";
import { useGameStore, gameBridge } from "../store/gameStore";
import { STORY_INTRO_SLIDES, STORY_INTRO_START_LABEL } from "../game/story";

export default function StoryIntroScreen() {
  const phase = useGameStore((s) => s.phase);
  const [slideIndex, setSlideIndex] = useState(0);

  if (phase !== "story-intro") return null;

  const isLastSlide = slideIndex === STORY_INTRO_SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      gameBridge.requestStart?.();
    } else {
      setSlideIndex((i) => i + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-obsidian px-6 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(158,43,37,0.15),transparent_65%)]" />

      <Skull className="relative h-8 w-8 text-blood-light/80" />

      <p className="relative max-w-xl font-glyph text-lg leading-relaxed text-bone/90 sm:text-xl">
        {STORY_INTRO_SLIDES[slideIndex]}
      </p>

      <div className="relative flex items-center gap-2">
        {STORY_INTRO_SLIDES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === slideIndex ? "bg-gold" : "bg-bone/20"
            }`}
          />
        ))}
      </div>

      <button
        onClick={handleNext}
        className="relative flex items-center gap-2 rounded-lg border-2 border-gold bg-gradient-to-b from-blood to-blood-dark px-8 py-3 font-glyph text-base font-bold uppercase tracking-wide text-bone shadow-glow transition-transform hover:scale-105 active:scale-95"
      >
        {isLastSlide ? STORY_INTRO_START_LABEL : "Continuar"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}