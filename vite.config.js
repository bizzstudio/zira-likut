// vite.config.js
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** בפיתוח: אם VITE_MAIN_SERVER_URL=/api — הבקשות עוברות דרך Vite ולא נתקעות על CORS מול 3028 */
const DEV_API_TARGET = process.env.VITE_DEV_API_PROXY || "http://localhost:3028";

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
    proxy: {
      "/api": {
        target: DEV_API_TARGET,
        changeOrigin: true,
      },
    },
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