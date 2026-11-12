import 'dotenv/config';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { testDatabaseUrl } from './test/integration/test-database-url.js';

// Testes e2e: sobem o AppModule inteiro e fazem requisições HTTP reais.
// Usam o mesmo banco de testes (_test) dos testes de integração.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/integration/global-setup.ts'],
    env: { DATABASE_URL: testDatabaseUrl() },
    fileParallelism: false,
  },
});
