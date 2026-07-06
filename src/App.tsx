import GameCanvas from "./components/GameCanvas";
import HUD from "./components/HUD";
import VirtualJoystick from "./components/VirtualJoystick";
import UpgradeModal from "./components/UpgradeModal";
import StartScreen from "./components/StartScreen";
import GameOverScreen from "./components/GameOverScreen";
import VictoryScreen from "./components/VictoryScreen";
import { useGameStore } from "./store/gameStore";

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const showPlayUi = phase === "playing" || phase === "levelup";

  return (
    <div className="relative h-full w-full overflow-hidden bg-obsidian">
      <GameCanvas />

      {showPlayUi && <HUD />}
      {showPlayUi && <VirtualJoystick />}

      <UpgradeModal />
      <StartScreen />
      <GameOverScreen />
      <VictoryScreen />
    </div>
  );
}
