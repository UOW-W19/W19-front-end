import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const appName = "Locale - Learn Languages Together";
const appShortName = "Locale";
const appDescription = "Connect with language learners nearby. Practice, share, and grow together.";
const appThemeColor = "#f5f2ec";

// https://vitejs.dev/config/
export default defineConfig(() => {
  const devPortRaw = Number(process.env.VITE_DEV_PORT);
  const devPort = Number.isFinite(devPortRaw) ? devPortRaw : 8080;
  const enablePwa = process.env.VITE_ENABLE_PWA !== "false";

  return {
    server: {
      host: "::",
      port: devPort,
      proxy: {
        "/api": {
          target: "http://localhost:8081",
          changeOrigin: true,
        },
        "/ws-native": {
          target: "http://localhost:8081",
          changeOrigin: true,
          ws: true,
        },
      },
    },
    plugins: [
      react(),
      enablePwa && VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.ico",
          "apple-touch-icon-180x180.png",
          "pwa-64x64.png",
          "pwa-192x192.png",
          "pwa-512x512.png",
          "maskable-icon-512x512.png",
        ],
        manifest: {
          id: "/",
          name: appName,
          short_name: appShortName,
          description: appDescription,
          theme_color: appThemeColor,
          background_color: appThemeColor,
          display: "standalone",
          display_override: ["standalone", "minimal-ui"],
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          categories: ["education", "social", "productivity"],
          icons: [
            {
              src: "pwa-64x64.png",
              sizes: "64x64",
              type: "image/png",
            },
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "maskable-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
          shortcuts: [
            {
              name: "Community Feed",
              short_name: "Feed",
              description: "Open the Locale community feed",
              url: "/",
              icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
            },
            {
              name: "Messages",
              short_name: "Messages",
              description: "Open your Locale conversations",
              url: "/messages",
              icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
            },
            {
              name: "Learn",
              short_name: "Learn",
              description: "Practice your saved words",
              url: "/learn",
              icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          importScripts: ["push-worker.js"],
          globPatterns: ["**/*.{js,css,html,svg,woff2}"],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api\//, /^\/ws-native/],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-font-files-cache",
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ].filter(Boolean),
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
