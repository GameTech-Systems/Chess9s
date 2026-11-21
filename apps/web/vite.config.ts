import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { writeServiceWorker } from './src/offline/build-sw.mjs';

const engineRules = (file: string) =>
  fileURLToPath(new URL(`../../packages/engine/src/rules/${file}`, import.meta.url));

// Offline play (decision 0025, D89): once the build has written every file, write dist/sw.js with
// the precache list made from them. To ship the recovery worker instead (item 8), copy
// src/offline/recovery-sw.js to dist/sw.js here in place of writeServiceWorker, and remove the
// registration from main.tsx in the same release (see recovery-sw.js).
const offline = (): Plugin => {
  let outDir = 'dist';
  return {
    name: 'chess9s-offline',
    apply: 'build',
    configResolved(config) {
      outDir = fileURLToPath(new URL(config.build.outDir, `file://${config.root}/`));
    },
    closeBundle() {
      writeServiceWorker(outDir);
    },
  };
};

// The page and the computer's worker ship without Ajv, which compiles schemas with `new Function`
// and would force `unsafe-eval` into the Content-Security-Policy (see public/_headers). The rules
// data is bundled as static JSON and `pnpm build` validates it against its schemas first.
export default defineConfig({
  plugins: [react(), offline()],
  // MIT and the other permissive licenses ask that their notices travel with the code, and the
  // bundles carry no comments, so the build writes every bundled package's license to this file.
  // The footer links to it (/third-party-licenses.txt).
  // `pnpm dev` serves the app only; online play needs the Worker too (`wrangler dev`, port 8787).
  // This sends /api (rooms and their sockets) to it, so a dev page can make and join rooms.
  server: { proxy: { '/api': { target: 'http://127.0.0.1:8787', ws: true } } },
  build: { license: { fileName: 'third-party-licenses.txt' } },
  resolve: {
    alias: [{ find: /^(.*\/|#)schema-check$/, replacement: engineRules('schema-check.static.ts') }],
  },
});
