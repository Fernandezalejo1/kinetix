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
      // Split vendor chunks for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion'],
            'vendor-charts': ['recharts'],
            'vendor-lucide': ['lucide-react'],
            'vendor-confetti': ['canvas-confetti'],
          },
        },
      },
      // Reduce chunk size warning limit
      chunkSizeWarningLimit: 600,
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
