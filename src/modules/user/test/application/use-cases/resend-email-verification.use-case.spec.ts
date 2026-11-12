import { InMemoryUnitOfWork } from '../../../../../shared/infra/database/in-memory-unit-of-work.js';
import { FixedClock } from '../../../../../shared/test/fakes/fixed-clock.js';
import { ResendEmailVerificationUseCase } from '../../../application/use-cases/resend-email-verification/resend-email-verification.use-case.js';
import { SendEmailVerificationUseCase } from '../../../application/use-cases/send-email-verification/send-email-verification.use-case.js';
import { User } from '../../../domain/entities/user.entity.js';
import { InvalidEmailError } from '../../../domain/errors/invalid-email.error.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { InMemoryEmailVerificationTokenRepository } from '../../../infra/persistence/in-memory/in-memory-email-verification-token.repository.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';
import { FakeEmailVerificationNotifier } from '../../fakes/fake-email-verification-notifier.js';
import { FakeVerificationTokenGenerator } from '../../fakes/fake-verification-token-generator.js';

describe('ResendEmailVerificationUseCase', () => {
  let users: InMemoryUserRepository;
  let notifier: FakeEmailVerificationNotifier;
  let sut: ResendEmailVerificationUseCase;
  let user: User;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    notifier = new FakeEmailVerificationNotifier();
    const send = new SendEmailVerificationUseCase(
      users,
      new InMemoryEmailVerificationTokenRepository(),
      new FakeVerificationTokenGenerator(),
      notifier,
      new FixedClock(new Date('2026-11-12T10:00:00.000Z')),
      new InMemoryUnitOfWork(),
      { tokenTtlMs: 24 * 60 * 60 * 1000 },
    );
    sut = new ResendEmailVerificationUseCase(users, send);

    user = User.create({
      name: 'Maria Silva',
      email: Email.create('maria@ufal.br'),
      cpf: Cpf.create('529.982.247-25'),
      passwordHash: 'hashed:senha',
    });
    await users.save(user);
  });

  it('reenvia o link para conta existente e não verificada', async () => {
    await sut.execute({ email: 'maria@ufal.br' });

    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0].to).toBe('maria@ufal.br');
  });

  it('encontra a conta mesmo com maiúsculas e espaços no e-mail', async () => {
    await sut.execute({ email: '  MARIA@ufal.br ' });

    expect(notifier.sent).toHaveLength(1);
  });

  it('termina sem erro e sem enviar quando o e-mail não tem conta', async () => {
    await expect(
      sut.execute({ email: 'ninguem@ufal.br' }),
    ).resolves.toBeUndefined();
    expect(notifier.sent).toHaveLength(0);
  });

  it('não envia para conta já verificada', async () => {
    user.verifyEmail();

    await expect(
      sut.execute({ email: 'maria@ufal.br' }),
    ).resolves.toBeUndefined();
    expect(notifier.sent).toHaveLength(0);
  });

  it('rejeita e-mail em formato inválido', async () => {
    await expect(sut.execute({ email: 'maria' })).rejects.toThrow(
      InvalidEmailError,
    );
  });
});
