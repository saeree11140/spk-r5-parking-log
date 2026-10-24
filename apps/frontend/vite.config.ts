import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
    strictPort: true,
    // Same origin as production: the browser talks to /api on this host.
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
});
