import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "EstudioPro — Promoción militar",
        short_name: "EstudioPro",
        description:
          "Sistema de estudio para examen de promoción: banco de preguntas, tarjetas con repaso espaciado (SM-2), cuestionarios y simulacros. Funciona sin internet.",
        lang: "es",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        background_color: "#ECF3F9",
        theme_color: "#1B8FBE",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,ico,json}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: "es2022",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,jsx}"],
  },
});
