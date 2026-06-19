import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      autoCodeSplitting: true,
    }),
    react(),
    tailwind(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom")) return "vendor-react-dom";
            if (id.includes("react/")) return "vendor-react";
            if (id.includes("@tanstack/react-router") || id.includes("@tanstack/router"))
              return "vendor-router";
            if (id.includes("@tanstack/react-query")) return "vendor-query";
          }
        },
      },
    },
    chunkSizeWarningLimit: 250,
    assetsInlineLimit: 4096,
  },
});
