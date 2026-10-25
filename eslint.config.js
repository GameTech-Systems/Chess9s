import tseslint from 'typescript-eslint';

export default tseslint.config(
  // .wrangler/ is the local output of `npx wrangler dev` (git-ignored).
  { ignores: ['**/dist/**', '**/node_modules/**', '.wrangler/**', 'pnpm-lock.yaml'] },
  ...tseslint.configs.recommended,
);
