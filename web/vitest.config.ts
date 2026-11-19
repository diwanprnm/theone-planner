import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Konfigurasi uji terpisah dari vite.config.ts supaya build PWA tidak perlu
 * tahu-menahu soal Vitest. Alias `@` dibuat sama agar impor di uji identik
 * dengan yang dipakai aplikasi.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Sebagian uji memakai fake-indexeddb yang perlu di-setup lebih dulu.
    setupFiles: ['./src/test/setup.ts'],
  },
});
