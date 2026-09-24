import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function localVaultPlugin() {
  return {
    name: 'local-vault-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/local-vault', async (_req: any, res: any) => {
        try {
          const userHome = process.env.USERPROFILE || process.env.HOME || '';
          const defaultManualPath = process.env.CPTS_VAULT_PATH || 
            (userHome ? path.join(userHome, 'Desktop', 'CPTS Field Manual') : 'C:\\Users\\DANIEL\\Desktop\\CPTS Field Manual');

          if (!fs.existsSync(defaultManualPath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Vault directory not found on Desktop.' }));
            return;
          }

          function walk(dir: string, baseDir: string = dir): { rel: string; full: string; name: string }[] {
            let files: { rel: string; full: string; name: string }[] = [];
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.name.startsWith('.') || entry.name === '__MACOSX' || entry.name === 'node_modules') continue;
              const full = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                files = files.concat(walk(full, baseDir));
              } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
                const rel = path.relative(baseDir, full).replace(/\\/g, '/');
                files.push({ rel, full, name: entry.name });
              }
            }
            return files;
          }

          const fileList = walk(defaultManualPath);
          const notes: any[] = [];
          const wikilinkMap: Record<string, string> = {};

          function cleanText(text: string): string {
            return text.trim().replace(/^["']|["']$/g, '');
          }

          for (let i = 0; i < fileList.length; i++) {
            const f = fileList[i];
            const raw = fs.readFileSync(f.full, 'utf-8');
            const segments = f.rel.split('/');
            const fileName = f.name.replace(/\.(md|markdown)$/i, '');

            const frontmatter: Record<string, string> = {};
            const tags: string[] = [];
            const tools: string[] = [];
            const aliases: string[] = [];
            let body = raw;

            const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
            if (fmMatch) {
              body = raw.slice(fmMatch[0].length);
              const lines = fmMatch[1].split(/\r?\n/);
              let currentKey = '';
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                if (trimmed.startsWith('- ') && currentKey) {
                  const val = cleanText(trimmed.slice(2));
                  if (currentKey === 'tags') tags.push(val);
                  else if (currentKey === 'tools') tools.push(val);
                  else if (currentKey === 'aliases' || currentKey === 'alias') aliases.push(val);
                  continue;
                }
                const colonIdx = line.indexOf(':');
                if (colonIdx !== -1) {
                  currentKey = line.slice(0, colonIdx).trim().toLowerCase();
                  const value = line.slice(colonIdx + 1).trim();
                  if (value.startsWith('[') && value.endsWith(']')) {
                    const listItems = value.slice(1, -1).split(',').map(cleanText).filter(Boolean);
                    if (currentKey === 'tags') tags.push(...listItems);
                    else if (currentKey === 'tools') tools.push(...listItems);
                    else if (currentKey === 'aliases' || currentKey === 'alias') aliases.push(...listItems);
                  } else if (value) {
                    frontmatter[currentKey] = cleanText(value);
                    if (currentKey === 'alias' || currentKey === 'aliases') aliases.push(cleanText(value));
                  }
                }
              }
            }

            const commands: string[] = [];
            const codeBlockRegex = /```(?:bash|sh|cmd|powershell|ps1|zsh|shell)?\r?\n([\s\S]*?)```/g;
            let cbMatch: RegExpExecArray | null;
            while ((cbMatch = codeBlockRegex.exec(body)) !== null) {
              const lines = cbMatch[1].split(/\r?\n/);
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
                if (trimmed.length > 3 && !commands.includes(trimmed)) commands.push(trimmed);
              }
            }

            const title = frontmatter['title'] || fileName;
            const titleEn = frontmatter['titleen'] || frontmatter['title_en'] || title;
            const titleHe = frontmatter['titlehe'] || frontmatter['title_he'] || undefined;

            let category = frontmatter['category'];
            const rawCategory = segments[0] || 'General';
            let subCategory = frontmatter['subcategory'];
            if (!category) {
              category = segments.length >= 2 ? segments[0] : 'General Tactical';
            }
            if (!subCategory && segments.length >= 3) {
              subCategory = segments.slice(1, -1).join(' / ');
            } else if (!subCategory && segments.length === 2) {
              subCategory = segments[0];
            } else if (!subCategory) {
              subCategory = category;
            }

            const slug = f.rel.replace(/\.(md|markdown)$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
            const noteId = `note-${slug || 'item-' + i}`;

            const noteEntry = {
              id: noteId,
              title,
              titleEn,
              titleHe,
              category,
              rawCategory,
              subCategory,
              relPath: f.rel,
              filename: fileName,
              difficulty: frontmatter['difficulty'] || 'intermediate',
              stage: frontmatter['stage'] || 'Exploitation',
              commands,
              tools: tools.length > 0 ? tools : tags.slice(0, 5),
              tags: tags.length > 0 ? tags : [category.toLowerCase()],
              summary: frontmatter['summary'] || frontmatter['description'] || '',
              rawMarkdown: raw,
              aliases,
              lastModified: new Date().toISOString(),
            };

            notes.push(noteEntry);
            wikilinkMap[fileName.toLowerCase()] = noteId;
            wikilinkMap[title.toLowerCase()] = noteId;
            if (titleEn) wikilinkMap[titleEn.toLowerCase()] = noteId;
            for (const alias of aliases) {
              wikilinkMap[alias.toLowerCase()] = noteId;
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            notes,
            wikilinkMap,
            summary: {
              totalNotes: notes.length,
              totalCommands: notes.reduce((acc, n) => acc + (n.commands?.length || 0), 0),
            }
          }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message }));
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localVaultPlugin()],
  base: './',
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom', 'zustand'],
  },
  server: {
    host: true,
    port: 3000,
    open: false,
    watch: {
      ignored: ['**/dist/**', '**/docs/**', '**/assets/**', '**/scratch/**', '**/release/**', '**/*.tmp**'],
    },
  },
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{ts,tsx}'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('cptsNotesIndex.json')) {
            return 'cpts-vault-data';
          }
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
            if (id.includes('react') || id.includes('zustand')) return 'vendor-framework';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('clsx') || id.includes('tailwind-merge')) return 'vendor-ui-utils';
            if (id.includes('canvas-confetti') || id.includes('jszip')) return 'vendor-utils';
          }
        }
      }
    }
  }
});
