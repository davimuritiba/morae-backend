import { execSync } from 'node:child_process';
import pg from 'pg';
import { assertTestDatabase, testDatabaseUrl } from './test-database-url.js';

// Roda uma vez antes dos testes de integração: cria o banco de testes, se
// ainda não existir, e aplica as migrations nele.
export default async function setup(): Promise<void> {
  const url = new URL(testDatabaseUrl());
  assertTestDatabase(url.toString());
  const database = url.pathname.slice(1);

  // CREATE DATABASE precisa ser executado conectado a outro banco.
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  adminUrl.search = '';
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database],
    );
    if (!rowCount) {
      await admin.query(`CREATE DATABASE "${database}"`);
    }
  } finally {
    await admin.end();
  }

  execSync('npx --no-install prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'inherit',
  });
}
