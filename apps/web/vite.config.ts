import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const engineRules = (file: string) =>
  fileURLToPath(new URL(`../../packages/engine/src/rules/${file}`, import.meta.url));

// The page and the computer's worker ship without Ajv, which compiles schemas with `new Function`
// and would force `unsafe-eval` into the Content-Security-Policy (see public/_headers). The rules
// data is bundled as static JSON and `pnpm build` validates it against its schemas first.
export default defineConfig({
  plugins: [react()],
  // MIT and the other permissive licenses ask that their notices travel with the code, and the
  // bundles carry no comments, so the build writes every bundled package's license to this file.
  // The footer links to it (/third-party-licenses.txt).
  build: { license: { fileName: 'third-party-licenses.txt' } },
  resolve: {
    alias: [{ find: /^(.*\/|#)schema-check$/, replacement: engineRules('schema-check.static.ts') }],
  },
});
