import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Phaser is big and has some optional sub-modules; pre-bundling it
  // explicitly keeps dev-server startup fast and avoids dependency
  // re-optimization reloads mid-session.
  optimizeDeps: {
    include: ["phaser"],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
  server: {
    host: true,
  },
});
