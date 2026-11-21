import 'dotenv/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    env: {
      DATABASE_URL: testDatabaseUrl(),
      // O AuthModule exige ao menos 32 bytes.
      JWT_SECRET:
        process.env['JWT_SECRET'] ??
        'segredo-dos-testes-e2e-com-32-bytes-ou-mais',
      // Fotos enviadas pelos testes não vão para a pasta uploads do projeto.
      UPLOADS_DIR: join(tmpdir(), 'morae-e2e-uploads'),
    },
    fileParallelism: false,
  },
});
