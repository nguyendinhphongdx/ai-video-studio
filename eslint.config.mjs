// Only the checks that keep the async data layer honest: a promise is awaited (or explicitly `void`), never used as a
// boolean or passed where a plain value is expected. Style is left to the formatter.
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Layer boundaries: the machine side of docs/conventions/01-layers-and-dependencies.md (AGENTS.md rules 1, 3, 6).
// Each layer lists everything it must not import; a file matches exactly one layer block, so each list is complete.
const AI_SDKS = ['openai', '@anthropic-ai/sdk', '@google/genai', '@google/generative-ai'];
const RENDERERS = ['@remotion/renderer', '@remotion/bundler', '@/tools/renderers', '@/tools/*/renderer'];
const rule = (patterns, allowTypeImports = false) => ({
  '@typescript-eslint/no-restricted-imports': ['error', { patterns: patterns.map(([group, message]) => ({ group, message, allowTypeImports })) }],
});
const sdk = [AI_SDKS, 'AI SDKs are imported in src/server/adapters only (rule 3).'];
const renderer = [RENDERERS, 'Only the worker renders; the web process never imports a renderer (rule 6).'];

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
  {
    // core: framework-free, knows nothing about the server, the UI, the tools or the worker.
    files: ['src/core/**/*.{ts,tsx}'],
    rules: rule([
      [['@/server/**', '@/app/**', '@/features/**', '@/components/**', '@/tools/**', '@/worker/**'], 'core never imports the server, the UI, tools or the worker (rule 1).'],
      [['next', 'next/*', 'drizzle-orm', 'drizzle-orm/*', 'postgres', 'react', 'react-dom', 'remotion', '@remotion/*'], 'core stays framework-free: no Next.js, DB, React or Remotion (rule 1).'],
      sdk,
    ]),
  },
  {
    // tools depend on core; the logger is the one server import they may use.
    files: ['src/tools/**/*.{ts,tsx}'],
    rules: rule([
      [['@/server/**', '!@/server/logger', '@/app/**', '@/features/**', '@/components/**', '@/worker/**'], 'tools depend on core only (rule 1).'],
      sdk,
    ]),
  },
  {
    // The browser side: types and shared constants from the server are fine, server values are not.
    files: ['src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}', 'src/stores/**/*.{ts,tsx}', 'src/providers/**/*.{ts,tsx}'],
    rules: rule(
      [
        // `*.types` (zod schemas and constants shared with the screens) stay importable; everything else on the server is not.
        [['@/server/**/*.service', '@/server/**/*.repository', '@/server/adapters/**', '@/server/assistant/**', '@/server/{db,orm,schema,context,config,logger,subscribers,core-deps}', '@/server/http/**'], 'UI code gets data over HTTP (`*.api.ts`), not from the server; `import type` is allowed (rule 1).'],
        [['@/worker/**', 'drizzle-orm', 'drizzle-orm/*', 'postgres'], 'UI never imports the worker or the database (rule 1).'],
        renderer,
        sdk,
      ],
      true,
    ),
  },
  {
    // Route handlers and pages call services; never repositories, the database or adapters.
    files: ['src/app/**/*.{ts,tsx}'],
    rules: rule([
      [['@/server/**/*.repository', '@/server/orm', '@/server/db', '@/server/schema', 'drizzle-orm', 'drizzle-orm/*', 'postgres'], 'Routes call a service, not a repository or the database (rules 1, 4).'],
      [['@/worker/**'], 'The web process never imports the worker.'],
      renderer,
      sdk,
    ]),
  },
  {
    // Known debt: these routes predate the rule and reach a repository or the database directly. Do not add to this list;
    // give each a service function and delete its line.
    files: ['src/app/api/v1/health/route.ts', 'src/app/api/v1/jobs/route.ts', 'src/app/api/v1/jobs/[[]id]/route.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': 'off' },
  },
  {
    // The server never reaches up into the UI or sideways into the worker.
    files: ['src/server/**/*.{ts,tsx}'],
    ignores: ['src/server/adapters/**'],
    rules: rule([[['@/app/**', '@/features/**', '@/components/**', '@/worker/**'], 'The server never imports the UI or the worker (rule 1).'], renderer, sdk]),
  },
  {
    // Adapters are where AI SDKs live.
    files: ['src/server/adapters/**/*.{ts,tsx}'],
    rules: rule([[['@/app/**', '@/features/**', '@/components/**', '@/worker/**'], 'Adapters never import the UI or the worker (rule 1).'], renderer]),
  },
);
