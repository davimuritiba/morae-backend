import 'dotenv/config';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { testDatabaseUrl } from './test/integration/test-database-url.js';

// Testes de integração: rodam contra o Postgres do Docker (npm run db:up),
// num banco separado terminado em _test.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.int-spec.ts'],
    globalSetup: ['./test/integration/global-setup.ts'],
    env: { DATABASE_URL: testDatabaseUrl() },
    // Todos os arquivos usam o mesmo banco e o limpam entre os testes.
    fileParallelism: false,
  },
});
