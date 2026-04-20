import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** בקאנד אמיתי — ליקוט וטפסים */
const FORMS_API = process.env.VITE_FORMS_API || "http://localhost:3028";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4105,
    proxy: {
      "/app": { target: FORMS_API, changeOrigin: true },
      "/admin": { target: FORMS_API, changeOrigin: true },
      "/api": { target: FORMS_API, changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
});
