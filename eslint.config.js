import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'pnpm-lock.yaml'] },
  ...tseslint.configs.recommended,
);
