import { useEffect, useRef, useState } from "react";
import { setTouchVector } from "../game/utils/InputState";

const BASE_RADIUS = 54;
const KNOB_RADIUS = 26;

export default function VirtualJoystick() {
  const [isTouch, setIsTouch] = useState(false);
  const [active, setActive] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    return () => setTouchVector(0, 0);
  }, []);

  if (!isTouch) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = baseRef.current?.getBoundingClientRect();
    if (!rect) return;
    originRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    pointerIdRef.current = e.pointerId;
    setActive(true);
    updateKnob(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId || !active) return;
    updateKnob(e.clientX, e.clientY);
  };

  const endTouch = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    setTouchVector(0, 0);
  };

  const updateKnob = (clientX: number, clientY: number) => {
    const dx = clientX - originRef.current.x;
    const dy = clientY - originRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, BASE_RADIUS);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;
    setKnob({ x: nx * clamped, y: ny * clamped });
    setTouchVector(nx * (clamped / BASE_RADIUS), ny * (clamped / BASE_RADIUS));
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endTouch}
      onPointerCancel={endTouch}
      className="pointer-events-auto fixed bottom-8 left-8 z-40 flex touch-none items-center justify-center rounded-full border-2 border-gold/50 bg-obsidian/40 backdrop-blur-sm"
      style={{ width: BASE_RADIUS * 2, height: BASE_RADIUS * 2 }}
    >
      <div
        className="pointer-events-none absolute rounded-full border border-gold/30"
        style={{ width: BASE_RADIUS * 1.4, height: BASE_RADIUS * 1.4 }}
      />
      <div
        className="pointer-events-none rounded-full bg-gold/80 shadow-glow transition-transform duration-75"
        style={{
          width: KNOB_RADIUS * 2,
          height: KNOB_RADIUS * 2,
          transform: `translate(${knob.x}px, ${knob.y}px)`,
          opacity: active ? 1 : 0.75,
        }}
      />
    </div>
  );
}
