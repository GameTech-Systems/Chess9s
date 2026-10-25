// Bundles the command line and its worker for Node: the engine's imports have no file
// extensions, so Node can't run the TypeScript sources directly.
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: true,
    target: 'node22',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        cli: 'src/cli.ts',
        worker: 'src/worker.ts',
        bench: 'src/bench-cli.ts',
        merge: 'src/merge-cli.ts',
        lock: 'src/lock-cli.ts',
      },
      output: { entryFileNames: '[name].js', format: 'es' },
    },
  },
  ssr: { noExternal: ['@chess9s/engine'] },
});
