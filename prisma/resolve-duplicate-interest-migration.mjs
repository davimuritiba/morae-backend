import { spawnSync } from 'node:child_process';
import pg from 'pg';

const FAILED_MIGRATION = '20261124160000_add_interest_status';
const CANONICAL_MIGRATION = '20261204120000_add_interest_status';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não está definida.');
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  const table = await client.query(`
    SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS migration_table_exists
  `);

  if (!table.rows[0].migration_table_exists) {
    console.log('Banco sem histórico do Prisma; nenhuma resolução necessária.');
    process.exitCode = 0;
  } else {
    const migrations = await client.query(
      `SELECT migration_name, finished_at, rolled_back_at, logs
       FROM public._prisma_migrations
       WHERE migration_name = ANY($1::text[])
       ORDER BY started_at DESC`,
      [[FAILED_MIGRATION, CANONICAL_MIGRATION]],
    );

    const failedDuplicate = migrations.rows.find(
      (migration) =>
        migration.migration_name === FAILED_MIGRATION &&
        migration.finished_at === null &&
        migration.rolled_back_at === null &&
        /type ["']InterestStatus["'] already exists/i.test(migration.logs ?? ''),
    );
    const canonicalApplied = migrations.rows.some(
      (migration) =>
        migration.migration_name === CANONICAL_MIGRATION &&
        migration.finished_at !== null,
    );

    if (!failedDuplicate) {
      console.log('Nenhuma falha duplicada de InterestStatus para resolver.');
    } else if (!canonicalApplied) {
      throw new Error(
        `A migration ${FAILED_MIGRATION} falhou, mas ${CANONICAL_MIGRATION} ` +
          'não consta como aplicada. Estado do banco requer análise manual.',
      );
    } else {
      const schema = await client.query(`
        SELECT
          EXISTS (
            SELECT 1
            FROM pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public' AND t.typname = 'InterestStatus'
          ) AS enum_exists,
          EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'interests'
              AND column_name = 'status'
          ) AS status_exists,
          EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'interests'
              AND column_name = 'updated_at'
          ) AS updated_at_exists
      `);
      const { enum_exists, status_exists, updated_at_exists } = schema.rows[0];

      if (!enum_exists || !status_exists || !updated_at_exists) {
        throw new Error(
          'A migration canônica consta como aplicada, mas o enum ou as colunas ' +
            'esperadas não foram encontrados. Estado do banco requer análise manual.',
        );
      }

      console.log(
        `Schema verificado; marcando ${FAILED_MIGRATION} como aplicado, ` +
          `pois ${CANONICAL_MIGRATION} já criou esses objetos.`,
      );
      await client.end();

      const result = spawnSync(
        'npx',
        ['--no-install', 'prisma', 'migrate', 'resolve', '--applied', FAILED_MIGRATION],
        { stdio: 'inherit' },
      );

      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(`Prisma migrate resolve terminou com código ${result.status}.`);
      }
    }
  }
} finally {
  if (client._connected) await client.end();
}
