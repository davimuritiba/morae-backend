import type { PrismaService } from '../../src/shared/infra/database/prisma.service.js';
import { assertTestDatabase } from './test-database-url.js';

// Apaga os dados de todas as tabelas, mantendo a estrutura. Usar no
// beforeEach de cada teste de integração.
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  assertTestDatabase(process.env['DATABASE_URL']);

  await prisma.$executeRaw`
    TRUNCATE TABLE users, students, student_profiles, property_owners, administrators CASCADE
  `;
}
