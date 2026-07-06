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

## 🚀 Cómo crear el proyecto desde cero

Si quieres reproducir el setup desde cero en vez de usar los archivos ya entregados:

### 1. Crear el proyecto con Vite

```bash
npm create vite@latest xibalba-survivors -- --template react-ts
cd xibalba-survivors
```

### 2. Instalar dependencias

```bash
# Dependencias de producción
npm install react@^18.3.1 react-dom@^18.3.1 phaser@^3.90.0 zustand@^5.0.14 lucide-react@^1.23.0

# Dependencias de desarrollo
npm install -D tailwindcss@^3.4.19 postcss@^8.5.16 autoprefixer@^10.5.2 typescript@^5.9.3 @vitejs/plugin-react@^4.7.0 @types/node@^24.13.2
```

> ⚠️ Nota de versiones: este proyecto fija **React 18** (no 19) y **Tailwind 3** (no 4) a propósito, ya que son las versiones estables y ampliamente documentadas al momento de escribir esto, y evitan romper la config clásica de `tailwind.config.js`. **Phaser 3** (no 4) porque es la versión estable y con más ejemplos/documentación para Arcade Physics.

### 3. Configurar Tailwind CSS

Crea `tailwind.config.js` y `postcss.config.js` (ver archivos entregados más abajo — ya incluyen la paleta de colores temática: `jade`, `blood`, `gold`, `obsidian`, `bone`).

En `src/index.css`, agrega las directivas de Tailwind más las fuentes de Google Fonts (`Cinzel` para texto, `Press Start 2P` para números tipo pixel-HUD). Ver archivo entregado.

### 4. Configurar TypeScript

Reemplaza el `tsconfig.json` generado por Vite con el archivo entregado (una sola configuración unificada, sin `tsconfig.app.json`/`tsconfig.node.json` separados — esto evita el problema común donde `tsc -b` termina generando `vite.config.js`/`.d.ts` sueltos en la raíz por falta de `noEmit`).

### 5. Configurar Vite para Phaser

Reemplaza `vite.config.ts` por el archivo entregado. Los puntos clave:
- `optimizeDeps.include: ['phaser']` — pre-empaqueta Phaser para que el dev server arranque rápido y no recargue por "outdated optimize deps".
- `build.rollupOptions.output.manualChunks` — separa Phaser en su propio chunk (es una librería grande) para mejor cacheo del navegador.
- `server.host: true` — permite probar en tu celular desde la misma red local (`npm run dev -- --host`).

### 6. Copiar el código fuente

Copia todos los archivos de `src/` según la estructura entregada más abajo.

### 7. Correr en desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173`.

### 8. Build de producción

```bash
npm run build
npm run preview   # sirve dist/ localmente para verificar
```

---

## ☁️ Desplegar en Netlify

### Opción A — Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### Opción B — Conectar el repo Git en la web de Netlify

1. Sube el proyecto a GitHub/GitLab.
2. En Netlify → **Add new site → Import an existing project**.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. El archivo `netlify.toml` (incluido) ya define esto automáticamente, además de:
   - Redirect SPA (`/*` → `/index.html`) para que las rutas no den 404.
   - Headers de seguridad básicos (`X-Frame-Options`, `X-Content-Type-Options`).
   - Cache agresivo para `/assets/*` (los archivos de Vite llevan hash en el nombre, así que es seguro cachearlos por 1 año).
   - `NODE_VERSION = 20`.

No necesitas configurar nada más — con el `netlify.toml` en la raíz del proyecto, Netlify detecta todo automáticamente al hacer push.

---

## 📁 Estructura del proyecto

```
xibalba-survivors/
├── index.html
├── netlify.toml
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── vite-env.d.ts
    ├── store/
    │   └── gameStore.ts        # Zustand: puente React ↔ Phaser
    ├── components/
    │   ├── GameCanvas.tsx      # Monta el juego de Phaser
    │   ├── HUD.tsx             # Vida, XP, timer, barra de jefe
    │   ├── VirtualJoystick.tsx # Joystick táctil (solo se muestra en touch)
    │   ├── UpgradeModal.tsx    # Pantalla de "sube de nivel"
    │   ├── StartScreen.tsx     # Menú principal
    │   ├── GameOverScreen.tsx
    │   └── VictoryScreen.tsx
    └── game/
        ├── types.ts            # Tipos compartidos
        ├── config.ts           # Balance: enemigos, armas, dificultad
        ├── entities/
        │   ├── Player.ts
        │   ├── Enemy.ts
        │   ├── Projectile.ts
        │   └── ExpGem.ts
        ├── systems/
        │   ├── SpawnSystem.ts    # Cuándo/dónde aparecen enemigos
        │   ├── WeaponSystem.ts   # Cooldowns y disparo de las 5 armas
        │   └── UpgradeSystem.ts  # Genera y aplica las mejoras
        ├── scenes/
        │   ├── BootScene.ts    # Genera texturas y arranca GameScene
        │   └── GameScene.ts    # Escena principal del juego
        └── utils/
            ├── TextureGenerator.ts  # Sprites pixel-art generados por código
            ├── AudioManager.ts      # Música + SFX sintetizados (Web Audio API)
            └── InputState.ts        # Puente joystick táctil ↔ Phaser
```

---

## 🎨 Sobre el arte y el audio (decisión de diseño importante)

En vez de descargar spritesheets desde Kenney.nl / OpenGameArt / itch.io, **todos los sprites se generan por código** en `TextureGenerator.ts` dibujando cuadrículas de píxeles (arte ASCII) sobre un `<canvas>` y convirtiéndolas en texturas de Phaser en tiempo de boot. De la misma forma, toda la música y los efectos de sonido en `AudioManager.ts` se sintetizan con osciladores de la Web Audio API.

**¿Por qué esta decisión?**
- **Cero riesgo de enlaces rotos**: las URLs de assets "gratuitos" de terceros cambian, se mueven o quedan detrás de licencias que no siempre son claras para uso comercial.
- **Cero dependencia de red en producción**: el juego funciona 100% offline después de cargar el bundle.
- **Cero riesgo de supply-chain**: no se agregan paquetes npm de audio/sprites de terceros con mantenimiento incierto.

Si más adelante quieres reemplazar el arte procedural por spritesheets reales (por ejemplo tus propios assets exportados de Aseprite), el punto de extensión es `TextureGenerator.ts`: basta con precargar las imágenes en `BootScene` con `this.load.spritesheet(...)` y usar las mismas claves de textura (`tex-player`, `tex-bat`, etc.) que ya consumen `Player.ts`, `Enemy.ts` y `Projectile.ts`.

---

## ⚖️ Balance del juego (editable en `src/game/config.ts`)

- **Enemigos**: `ENEMY_DEFS` — vida, velocidad, daño y XP de cada tipo (murciélago, jaguar, esqueleto, Camazotz).
- **Curva de dificultad**: `difficultyAt(elapsedSeconds)` — controla el intervalo de spawn, enemigos por oleada, y multiplicadores de vida/velocidad según el tiempo transcurrido.
- **Curva de experiencia**: `xpToNextLevel(level)`.
- **Armas**: `WEAPON_DEFS` (definiciones) + daño base en `WeaponSystem.ts`.
- **Pasivas**: `PASSIVE_DEFS` + efectos en `UpgradeSystem.ts`.

---

## 🩺 Rendimiento (60 FPS estables)

- Colisiones por distancia (círculo-círculo) en vez de física completa de Arcade entre todos los pares — más barato con decenas de enemigos en pantalla.
- El suelo se dibuja con un único `TileSprite` (1 draw call) en vez de cientos de tiles individuales.
- Texturas generadas una sola vez en el boot y reutilizadas (no se regeneran por frame).
- HUD de React se sincroniza con el store ~8 veces por segundo (no en cada frame) para no forzar re-renders innecesarios de React durante el loop de Phaser.
- `chunkSizeWarningLimit` + `manualChunks` en Vite separan Phaser en su propio chunk cacheable.

---

## 📜 Licencia de los assets

Todo el arte y audio de este proyecto es 100% original y generado por código — no hay assets de terceros, por lo que no hay restricciones de licencia que rastrear.
