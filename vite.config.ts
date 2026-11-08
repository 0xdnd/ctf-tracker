import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, normalize, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

// Preview only: mimic GitHub Pages. Paths that match no file (or folder with index.html) in dist
// get dist/404.html with status 404; public/404.js then boots the app shell for real client routes.
function pagesFallbackPreview(): Plugin {
  return {
    name: 'pages-404-fallback-preview',
    configurePreviewServer(server) {
      const outDir = resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use((req, res, next) => {
        if ((req.method !== 'GET' && req.method !== 'HEAD') || !req.url) return next();
        let pathname: string;
        try { pathname = decodeURIComponent(req.url.split('?')[0].split('#')[0]); } catch { return next(); }
        const target = normalize(join(outDir, pathname));
        if (!target.startsWith(outDir)) return next();
        const isFile = (f: string) => existsSync(f) && statSync(f).isFile();
        if (isFile(target) || isFile(join(target, 'index.html'))) return next();
        const page = join(outDir, '404.html');
        if (!isFile(page)) return next();
        const body = readFileSync(page);
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Length', body.length);
        res.end(req.method === 'HEAD' ? undefined : body);
      });
    },
  };
}

// Packages reachable only through mermaid (its dependency closure minus everything the app's
// other dependencies pull in). Used to name mermaid-only lazy chunks so the bundle budget can
// track them separately from the app.
function dependencyClosure(roots: string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length > 0) {
    const name = stack.pop()!;
    if (seen.has(name)) continue;
    seen.add(name);
    const file = join(ROOT, 'node_modules', name, 'package.json');
    if (!existsSync(file)) continue;
    const deps = (JSON.parse(readFileSync(file, 'utf-8')) as { dependencies?: Record<string, string> }).dependencies;
    stack.push(...Object.keys(deps ?? {}));
  }
  return seen;
}

function mermaidOnlyPackages(): Set<string> {
  const deps = Object.keys((JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')) as { dependencies: Record<string, string> }).dependencies);
  const shared = dependencyClosure(deps.filter((d) => d !== 'mermaid'));
  return new Set([...dependencyClosure(['mermaid'])].filter((d) => !shared.has(d)));
}

const MERMAID_GLUE = /[\\/]src[\\/](components[\\/]cheatsheet[\\/]MermaidDiagram\.tsx|utils[\\/]mermaidRenderer\.ts)$/;

function packageOf(id: string): string | null {
  const parts = id.split(/[\\/]node_modules[\\/]/);
  if (parts.length < 2) return null;
  const segs = parts[parts.length - 1].split(/[\\/]/);
  return segs[0].startsWith('@') ? `${segs[0]}/${segs[1]}` : segs[0];
}

/** True when every real module in the chunk is mermaid, a mermaid-only dependency, or the mermaid glue. */
function isMermaidChunk(moduleIds: readonly string[], mermaidPkgs: Set<string>): boolean {
  const real = moduleIds.filter((id) => !id.startsWith('\0'));
  return (
    real.length > 0 &&
    real.every((id) => {
      if (MERMAID_GLUE.test(id.split('?')[0])) return true;
      const pkg = packageOf(id);
      return pkg !== null && mermaidPkgs.has(pkg);
    })
  );
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Tauri desktop builds (`--mode tauri`) use hash routing + relative assets; web uses clean URLs at '/'.
  const isTauri = mode === 'tauri';
  const mermaidPkgs = mermaidOnlyPackages();
  return {
  plugins: [react(), ...(isTauri ? [] : [pagesFallbackPreview()])],
  base: isTauri ? './' : '/',
  esbuild: { legalComments: 'eof' },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
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
    // App code importing the lazy mermaid glue is already running, so the app chunks it depends on
    // are loaded; skip their preload list there. Imports inside mermaid keep normal preloading.
    modulePreload: {
      resolveDependencies: (filename, deps, { hostId }) =>
        /(^|\/)vendor-mermaid-/.test(filename) && !/(^|\/)vendor-mermaid-/.test(hostId) ? [] : deps,
    },
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: (chunk) =>
          isMermaidChunk(chunk.moduleIds, mermaidPkgs)
            ? 'assets/vendor-mermaid-[name]-[hash].js'
            : 'assets/[name]-[hash].js',
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
