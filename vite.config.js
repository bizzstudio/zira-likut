// vite.config.js
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },

  server: {
    historyApiFallback: true,
  },

  define: {
    "process.env": process.env,
  },

  // טעינת @zxing מהמקומי – מונע 504 ובעיות עם הסורק הישן
  optimizeDeps: {
    include: ['@zxing/browser', '@zxing/library'],
    exclude: ['@yudiel/react-qr-scanner'],
  },
});