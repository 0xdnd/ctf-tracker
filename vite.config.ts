import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Tauri desktop builds (`--mode tauri`) use hash routing + relative assets; web uses clean URLs at '/'.
  const isTauri = mode === 'tauri';
  return {
  plugins: [react()],
  base: isTauri ? './' : '/',
  esbuild: { legalComments: 'eof' },
  define: {
    'import.meta.env.VITE_TARGET': JSON.stringify(isTauri ? 'tauri' : 'web'),
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom', 'zustand'],
  },
  server: {
    host: true,
    port: 3000,
    open: false,
    watch: {
      ignored: ['**/dist/**', '**/docs/**', '**/assets/**', '**/scratch/**', '**/release/**', '**/*.tmp**', '**/*.zip', '**/.kilo/**', '**/*.log'],
    },
  },
  preview: {
    host: true,
    port: 3000,
  },
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{ts,tsx}'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Entry is ~734 kB; machinesCatalog (612 kB) is a lazy chunk loaded via loadMachinesCatalog().
    // Raise only as high as needed (default 500); lower again as the entry shrinks.
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('machinesCatalog.ts')) {
            return 'catalog-data';
          }
          if (id.includes('methodologyFramework.ts')) {
            return 'methodology-data';
          }
          if (id.includes('tracksData.ts')) {
            return 'tracks-data';
          }
          if (id.includes('node_modules')) {
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run[\\/]router|zustand|use-sync-external-store)[\\/]/.test(id)) return 'vendor-framework';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('clsx') || id.includes('tailwind-merge')) return 'vendor-ui-utils';
            if (id.includes('canvas-confetti')) return 'vendor-confetti';
            if (id.includes('jszip')) return 'vendor-zip';
          }
        }
      }
    }
  }
  };
});
