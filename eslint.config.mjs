// Only the checks that keep the async data layer honest: a promise is awaited (or explicitly `void`), never used as a
// boolean or passed where a plain value is expected. Style is left to the formatter.
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'data/**', 'projects/**', 'third_party/**', 'tmp-puppet-check/**', 'public/**'] },
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts'],
    extends: [tseslint.configs.base],
    // Loaded so the existing eslint-disable comments for their rules resolve.
    plugins: { 'react-hooks': reactHooks, '@next/next': nextPlugin },
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/await-thenable': 'error',
    },
  },
);
