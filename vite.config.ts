import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Sin manualChunks: Rollup divide automáticamente. Los hubs pesados
      // (Recharts) quedan en chunks lazy de sus pestañas y NO se precargan
      // desde la pantalla inicial (modulepreload del vendor único era el bug).
      // vendor-react/vendor-lucide los maneja Rollup junto a sus consumidores.
      chunkSizeWarningLimit: 700,
      // Source maps off for production (smaller builds)
      sourcemap: false,
      // Target modern browsers for smaller bundles
      target: 'es2022',
      // Use esbuild (default, faster than terser)
      minify: true as const,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['@capacitor/core'],
    },
    // Development server
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
