import { randomUUID } from 'node:crypto';
import { resetDatabase } from '../../../../../test/integration/reset-database.js';
import { PrismaTransactionContext } from '../../../infra/database/prisma-transaction-context.js';
import { PrismaUnitOfWork } from '../../../infra/database/prisma-unit-of-work.js';
import { PrismaService } from '../../../infra/database/prisma.service.js';

describe('PrismaUnitOfWork (integração)', () => {
  const prisma = new PrismaService();
  const context = new PrismaTransactionContext(prisma);
  const unitOfWork = new PrismaUnitOfWork(context);

  // Grava pelo cliente do contexto, como fazem os repositórios.
  function createUser(email: string, cpf: string): Promise<unknown> {
    return context.client.user.create({
      data: {
        id: randomUUID(),
        name: 'Maria Silva',
        email,
        cpf,
        passwordHash: '$argon2id$hash',
        updatedAt: new Date(),
      },
    });
  }

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('confirma todas as gravações quando o trabalho termina sem erro', async () => {
    const result = await unitOfWork.run(async () => {
      await createUser('a@ufal.br', '52998224725');
      await createUser('b@ufal.br', '11144477735');
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(await prisma.user.count()).toBe(2);
  });

  it('desfaz tudo e repassa o mesmo erro quando o trabalho falha', async () => {
    const failure = new Error('falha depois de gravar');

    await expect(
      unitOfWork.run(async () => {
        await createUser('a@ufal.br', '52998224725');
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(await prisma.user.count()).toBe(0);
  });

  it('desfaz a primeira gravação quando a segunda viola uma constraint', async () => {
    await expect(
      unitOfWork.run(async () => {
        await createUser('a@ufal.br', '52998224725');
        await createUser('a@ufal.br', '11144477735');
      }),
    ).rejects.toThrow();

    expect(await prisma.user.count()).toBe(0);
  });

  it('run aninhado participa da transação externa', async () => {
    await expect(
      unitOfWork.run(async () => {
        await unitOfWork.run(() => createUser('a@ufal.br', '52998224725'));
        throw new Error('falha no trabalho externo');
      }),
    ).rejects.toThrow('falha no trabalho externo');

    expect(await prisma.user.count()).toBe(0);
  });

  it('usa o cliente da transação só dentro de run()', async () => {
    expect(context.client).toBe(prisma);

    await unitOfWork.run(() => {
      expect(context.client).not.toBe(prisma);
      return Promise.resolve();
    });

    expect(context.client).toBe(prisma);
  });
});
