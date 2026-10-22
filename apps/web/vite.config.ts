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
  resolve: {
    alias: [{ find: /^.*\/schema-check$/, replacement: engineRules('schema-check.static.ts') }],
  },
});
