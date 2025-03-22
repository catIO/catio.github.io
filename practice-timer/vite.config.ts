import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Get the repository name from package.json or use a default
const base = process.env.NODE_ENV === 'production' ? '/practice-timer/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
    },
  },
  root: "client",
  build: {
    outDir: "dist/public",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/settings': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    },
    fs: {
      strict: false
    },
    hmr: {
      port: 5173,
      clientPort: 5173,
    }
  },
  worker: {
    format: 'es'
  }
});
