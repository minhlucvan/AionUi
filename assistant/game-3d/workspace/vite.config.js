import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          cannon: ['cannon-es'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    host: true,
  },
  optimizeDeps: {
    include: ['three', 'cannon-es'],
  },
});
