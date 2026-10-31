import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

// Modules the exported viewer can't use, and what stands in for them:
// no IndexedDB (the song is embedded in the file) and no SoundFont (32 MB).
const VIEWER_MODULES: Record<string, string> = {
  [path('./src/lib/db.ts')]: path('./src/viewer/db.ts'),
  [path('./src/lib/audioPlayer.ts')]: path('./src/viewer/audioPlayer.ts'),
}

function viewerModules(): Plugin {
  return {
    name: 'chordbook-viewer-modules',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      return resolved && VIEWER_MODULES[resolved.id] ? VIEWER_MODULES[resolved.id] : null
    },
  }
}

// Builds the song viewer as one self-contained HTML file (the shell that the
// app's HTML export fills with a song). `npm run build:viewer` copies it to public/.
export default defineConfig({
  plugins: [viewerModules(), react(), viteSingleFile()],
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist-viewer',
    emptyOutDir: true,
    rollupOptions: { input: path('./viewer.html') },
  },
})
