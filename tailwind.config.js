/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        jade: {
          DEFAULT: "#0E7A5F",
          light: "#1FAE86",
          dark: "#063D30",
        },
        blood: {
          DEFAULT: "#9E2B25",
          light: "#C43F35",
          dark: "#5C1712",
        },
        gold: {
          DEFAULT: "#C9A227",
          light: "#E6C65C",
          dark: "#8A6B14",
        },
        obsidian: {
          DEFAULT: "#0D0B0A",
          light: "#1B1613",
          dark: "#050403",
        },
        bone: "#E8DCC4",
      },
      fontFamily: {
        glyph: ["Cinzel", "serif"],
        pixel: ["'Press Start 2P'", "monospace"],
      },
      boxShadow: {
        glow: "0 0 12px rgba(201, 162, 39, 0.6)",
        "glow-jade": "0 0 12px rgba(31, 174, 134, 0.6)",
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.85 },
        },
      },
      animation: {
        flicker: "flicker 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
