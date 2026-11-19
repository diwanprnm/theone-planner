import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Aplikasi dipakai di lokasi acara dengan sinyal buruk — aset di-cache
      // agresif supaya tetap terbuka saat offline.
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        navigateFallback: '/index.html',
        // Jangan pernah cache panggilan API: data akurat lebih penting
        // daripada kecepatan, dan antrean tulis menangani sisi offline.
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: 'TheOnePlanner',
        short_name: 'OnePlanner',
        description: 'Catat keuangan acaramu, rapi dan jelas',
        lang: 'id',
        start_url: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#4E154A',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Ikon maskable butuh area aman 80%; logo sudah diberi padding 9%.
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Menghindari CORS saat pengembangan lokal.
      '/api': {
        // 127.0.0.1, bukan "localhost": di Windows "localhost" bisa resolve ke
        // ::1 dan menabrak server lain yang kebetulan memakai port 3000.
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
