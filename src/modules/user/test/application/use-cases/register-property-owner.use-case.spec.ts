import { InMemoryUnitOfWork } from '../../../../../shared/infra/database/in-memory-unit-of-work.js';
import { FakeLogger } from '../../../../../shared/test/fakes/fake-logger.js';
import { FixedClock } from '../../../../../shared/test/fakes/fixed-clock.js';
import { RegisterPropertyOwnerUseCase } from '../../../application/use-cases/register-property-owner/register-property-owner.use-case.js';
import { SendEmailVerificationUseCase } from '../../../application/use-cases/send-email-verification/send-email-verification.use-case.js';
import { CpfAlreadyInUseError } from '../../../domain/errors/cpf-already-in-use.error.js';
import { EmailAlreadyInUseError } from '../../../domain/errors/email-already-in-use.error.js';
import { InMemoryEmailVerificationTokenRepository } from '../../../infra/persistence/in-memory/in-memory-email-verification-token.repository.js';
import { InMemoryPropertyOwnerRepository } from '../../../infra/persistence/in-memory/in-memory-property-owner.repository.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';
import { FakeEmailVerificationNotifier } from '../../fakes/fake-email-verification-notifier.js';
import { FakeHasher } from '../../fakes/fake-hasher.js';
import { FakeVerificationTokenGenerator } from '../../fakes/fake-verification-token-generator.js';

const input = {
  name: 'Ana Proprietária',
  email: 'ana@example.com',
  cpf: '529.982.247-25',
  password: 'senha-segura-123',
  phone: '(82) 99999-1234',
};

describe('RegisterPropertyOwnerUseCase', () => {
  it('cria User e PropertyOwner na mesma conta e dispara verificação de e-mail', async () => {
    const users = new InMemoryUserRepository();
    const owners = new InMemoryPropertyOwnerRepository();
    const tokens = new InMemoryEmailVerificationTokenRepository();
    const notifier = new FakeEmailVerificationNotifier();
    const hasher = new FakeHasher();
    const uow = new InMemoryUnitOfWork();
    const send = new SendEmailVerificationUseCase(
      users,
      tokens,
      new FakeVerificationTokenGenerator(),
      notifier,
      new FixedClock(new Date('2026-11-12T10:00:00Z')),
      uow,
      { tokenTtlMs: 86400000 },
    );
    const useCase = new RegisterPropertyOwnerUseCase(
      users,
      owners,
      hasher,
      uow,
      send,
      new FakeLogger(),
    );

    const result = await useCase.execute(input);
    expect(result.userId).toBe(users.items[0].id);
    expect(result.propertyOwnerId).toBe(owners.items[0].id);
    expect(owners.items[0].userId).toBe(result.userId);
    expect(users.items[0].passwordHash).toBe('hashed:senha-segura-123');
    expect(notifier.sent[0].to).toBe('ana@example.com');
  });

  it('recusa e-mail ou CPF duplicado antes de persistir outro proprietário', async () => {
    const users = new InMemoryUserRepository();
    const owners = new InMemoryPropertyOwnerRepository();
    const tokens = new InMemoryEmailVerificationTokenRepository();
    const uow = new InMemoryUnitOfWork();
    const send = new SendEmailVerificationUseCase(
      users,
      tokens,
      new FakeVerificationTokenGenerator(),
      new FakeEmailVerificationNotifier(),
      new FixedClock(new Date()),
      uow,
      { tokenTtlMs: 86400000 },
    );
    const useCase = new RegisterPropertyOwnerUseCase(
      users,
      owners,
      new FakeHasher(),
      uow,
      send,
      new FakeLogger(),
    );
    await useCase.execute(input);
    await expect(
      useCase.execute({ ...input, cpf: '111.444.777-35' }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);
    await expect(
      useCase.execute({ ...input, email: 'outra@example.com' }),
    ).rejects.toBeInstanceOf(CpfAlreadyInUseError);
    expect(users.items).toHaveLength(1);
    expect(owners.items).toHaveLength(1);
  });
});
