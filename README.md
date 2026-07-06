# 🦇 Xibalba Survivors

Roguelike de acción estilo *Vampire Survivors*, ambientado en el inframundo maya (Xibalba). Sobrevive 5 minutos a oleadas crecientes de murciélagos de Camazotz, jaguares espectrales y guerreros esqueléticos, sube de nivel, elige poderes ancestrales y enfréntate a Camazotz, Señor Murciélago.

Construido con **React 18 + Vite + TypeScript + Phaser 3**. Todo el arte (sprites 16-bit) y el audio (música + SFX) se **genera proceduralmente en el cliente** — no depende de ningún CDN externo de assets, así que no hay enlaces rotos ni riesgo de supply-chain por paquetes de terceros.

---

## 🎮 Controles

- **Desktop:** `WASD` o flechas para moverte. El ataque es automático.
- **Móvil:** joystick virtual táctil en la esquina inferior izquierda.
- Sube de nivel recogiendo cacao/cristales de los enemigos derrotados y elige 1 de 3 mejoras.
- Objetivo: sobrevivir **5 minutos**. La dificultad escala con el tiempo y Camazotz aparece cerca del minuto 4.

---

## 🧱 Stack

| Capa | Tecnología |
|---|---|
| UI / Menús / HUD | React 18 + TypeScript + Tailwind CSS |
| Motor del juego | Phaser 3 (Arcade Physics) |
| Estado global (puente React ↔ Phaser) | Zustand |
| Iconos | lucide-react |
| Audio | Web Audio API (sintetizado, sin archivos externos) |
| Build | Vite 5 |

---
