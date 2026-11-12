import { InMemoryUnitOfWork } from '../../../../../shared/infra/database/in-memory-unit-of-work.js';
import { FixedClock } from '../../../../../shared/test/fakes/fixed-clock.js';
import { ConfirmEmailVerificationUseCase } from '../../../application/use-cases/confirm-email-verification/confirm-email-verification.use-case.js';
import { SendEmailVerificationUseCase } from '../../../application/use-cases/send-email-verification/send-email-verification.use-case.js';
import { User } from '../../../domain/entities/user.entity.js';
import { InvalidEmailVerificationTokenError } from '../../../domain/errors/invalid-email-verification-token.error.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { InMemoryEmailVerificationTokenRepository } from '../../../infra/persistence/in-memory/in-memory-email-verification-token.repository.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';
import { FakeEmailVerificationNotifier } from '../../fakes/fake-email-verification-notifier.js';
import { FakeVerificationTokenGenerator } from '../../fakes/fake-verification-token-generator.js';

const NOW = new Date('2026-11-12T10:00:00.000Z');
const TTL_MS = 24 * 60 * 60 * 1000;

describe('ConfirmEmailVerificationUseCase', () => {
  let users: InMemoryUserRepository;
  let tokens: InMemoryEmailVerificationTokenRepository;
  let notifier: FakeEmailVerificationNotifier;
  let clock: FixedClock;
  let send: SendEmailVerificationUseCase;
  let sut: ConfirmEmailVerificationUseCase;
  let user: User;

  // O token é emitido pelo próprio SendEmailVerificationUseCase e lido do
  // e-mail "enviado", como acontece no fluxo real.
  async function issueToken(): Promise<string> {
    await send.execute({ userId: user.id });
    return notifier.sent[notifier.sent.length - 1].token;
  }

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    tokens = new InMemoryEmailVerificationTokenRepository();
    notifier = new FakeEmailVerificationNotifier();
    clock = new FixedClock(NOW);
    const generator = new FakeVerificationTokenGenerator();
    const unitOfWork = new InMemoryUnitOfWork();

    send = new SendEmailVerificationUseCase(
      users,
      tokens,
      generator,
      notifier,
      clock,
      unitOfWork,
      { tokenTtlMs: TTL_MS },
    );
    sut = new ConfirmEmailVerificationUseCase(
      users,
      tokens,
      generator,
      clock,
      unitOfWork,
    );

    user = User.create({
      name: 'Maria Silva',
      email: Email.create('maria@ufal.br'),
      cpf: Cpf.create('529.982.247-25'),
      passwordHash: 'hashed:senha',
    });
    await users.save(user);
  });

  it('verifica o e-mail e consome o token', async () => {
    const token = await issueToken();
    clock.advance(60_000);

    await sut.execute({ token });

    expect((await users.findById(user.id))?.emailVerified).toBe(true);
    expect(tokens.items[0].usedAt).toEqual(clock.now());
  });

  it('aceita o token até um instante antes de expirar', async () => {
    const token = await issueToken();
    clock.advance(TTL_MS - 1);

    await sut.execute({ token });

    expect(user.emailVerified).toBe(true);
  });

  it('recusa token expirado sem verificar o e-mail', async () => {
    const token = await issueToken();
    clock.advance(TTL_MS);

    await expect(sut.execute({ token })).rejects.toThrow(
      InvalidEmailVerificationTokenError,
    );
    expect(user.emailVerified).toBe(false);
  });

  it('recusa o mesmo token usado duas vezes', async () => {
    const token = await issueToken();
    await sut.execute({ token });

    await expect(sut.execute({ token })).rejects.toThrow(
      InvalidEmailVerificationTokenError,
    );
  });

  it.each(['', 'token-que-nunca-existiu'])(
    'recusa token desconhecido: %j',
    async (token) => {
      await expect(sut.execute({ token })).rejects.toThrow(
        InvalidEmailVerificationTokenError,
      );
    },
  );

  it('recusa o link antigo depois de um reenvio', async () => {
    const oldToken = await issueToken();
    const newToken = await issueToken();

    await expect(sut.execute({ token: oldToken })).rejects.toThrow(
      InvalidEmailVerificationTokenError,
    );
    await sut.execute({ token: newToken });
    expect(user.emailVerified).toBe(true);
  });

  it('recusa token de usuário que não existe mais', async () => {
    const token = await issueToken();
    users.items.splice(0, users.items.length);

    await expect(sut.execute({ token })).rejects.toThrow(
      InvalidEmailVerificationTokenError,
    );
  });
});
