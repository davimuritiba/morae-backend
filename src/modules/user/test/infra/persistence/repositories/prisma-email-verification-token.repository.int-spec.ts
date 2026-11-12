import { resetDatabase } from '../../../../../../../test/integration/reset-database.js';
import { PrismaTransactionContext } from '../../../../../../shared/infra/database/prisma-transaction-context.js';
import { PrismaService } from '../../../../../../shared/infra/database/prisma.service.js';
import { EmailVerificationToken } from '../../../../domain/entities/email-verification-token.entity.js';
import { User } from '../../../../domain/entities/user.entity.js';
import { Cpf } from '../../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../../domain/value-objects/email.vo.js';
import { PrismaEmailVerificationTokenRepository } from '../../../../infra/persistence/repositories/prisma-email-verification-token.repository.js';
import { PrismaUserRepository } from '../../../../infra/persistence/repositories/prisma-user.repository.js';

const ISSUED_AT = new Date('2026-11-12T10:00:00.000Z');
const EXPIRES_AT = new Date('2026-11-13T10:00:00.000Z');

describe('PrismaEmailVerificationTokenRepository (integração)', () => {
  const prisma = new PrismaService();
  const db = new PrismaTransactionContext(prisma);
  const users = new PrismaUserRepository(db);
  const repository = new PrismaEmailVerificationTokenRepository(db);

  // O token exige um usuário existente (chave estrangeira).
  async function makeUser(
    email = 'maria@ufal.br',
    cpf = '529.982.247-25',
  ): Promise<User> {
    const user = User.create({
      name: 'Maria Silva',
      email: Email.create(email),
      cpf: Cpf.create(cpf),
      passwordHash: '$argon2id$hash',
    });
    await users.save(user);
    return user;
  }

  function makeToken(userId: string, hashChar = 'a'): EmailVerificationToken {
    return EmailVerificationToken.create({
      userId,
      tokenHash: hashChar.repeat(64),
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
  }

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('salva e encontra o token pelo hash', async () => {
    const user = await makeUser();
    const token = makeToken(user.id);

    await repository.save(token);
    const found = await repository.findByTokenHash('a'.repeat(64));

    expect(found?.id).toBe(token.id);
    expect(found?.userId).toBe(user.id);
    expect(found?.expiresAt).toEqual(EXPIRES_AT);
    expect(found?.createdAt).toEqual(ISSUED_AT);
    expect(found?.usedAt).toBeNull();
  });

  it('devolve null para hash desconhecido', async () => {
    expect(await repository.findByTokenHash('f'.repeat(64))).toBeNull();
  });

  it('atualiza o token já salvo ao registrar o uso', async () => {
    const user = await makeUser();
    const token = makeToken(user.id);
    await repository.save(token);

    const usedAt = new Date('2026-11-12T11:00:00.000Z');
    token.use(usedAt);
    await repository.save(token);

    const found = await repository.findByTokenHash('a'.repeat(64));
    expect(found?.usedAt).toEqual(usedAt);
    expect(await prisma.emailVerificationToken.count()).toBe(1);
  });

  it('apaga só os tokens do usuário informado', async () => {
    const maria = await makeUser();
    const joao = await makeUser('joao@ufal.br', '111.444.777-35');
    await repository.save(makeToken(maria.id, 'a'));
    await repository.save(makeToken(maria.id, 'b'));
    await repository.save(makeToken(joao.id, 'c'));

    await repository.deleteAllForUser(maria.id);

    expect(await repository.findByTokenHash('a'.repeat(64))).toBeNull();
    expect(await repository.findByTokenHash('b'.repeat(64))).toBeNull();
    expect(await repository.findByTokenHash('c'.repeat(64))).not.toBeNull();
  });

  it('ignora id de usuário que não é UUID ao apagar', async () => {
    await expect(
      repository.deleteAllForUser('nao-e-uuid'),
    ).resolves.toBeUndefined();
  });

  it('recusa dois tokens com o mesmo hash', async () => {
    const user = await makeUser();
    await repository.save(makeToken(user.id, 'a'));

    await expect(repository.save(makeToken(user.id, 'a'))).rejects.toThrow();
  });

  it('apaga os tokens quando o usuário é removido do banco', async () => {
    const user = await makeUser();
    await repository.save(makeToken(user.id));

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.emailVerificationToken.count()).toBe(0);
  });
});
