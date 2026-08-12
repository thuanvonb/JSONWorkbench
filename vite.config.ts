import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base + `docs` output so the build can be served straight from
// GitHub Pages ("Deploy from a branch" -> /docs) at any repository subpath.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    sourcemap: false,
  },
})
