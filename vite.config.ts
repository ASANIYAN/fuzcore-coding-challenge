import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { getViteAllowedHosts } from "./vite.allowed-hosts";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    allowedHosts: getViteAllowedHosts(),
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
