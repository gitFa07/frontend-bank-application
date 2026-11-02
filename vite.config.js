import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    // three.js is lazy-loaded in its own ~540 kB chunk.
    build: { chunkSizeWarningLimit: 600 },
    server: {
      // Exposes the dev server on the LAN so the UI can be tried on a phone.
      host: true,
      // The backend only allows CORS from its own origin, so the browser talks
      // to Vite and Vite forwards /api to the backend.
      proxy: {
        "/api": {
          target: env.VITE_PROXY_TARGET || "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  };
});
