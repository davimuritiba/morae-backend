import { InMemoryUnitOfWork } from '../../../../../shared/infra/database/in-memory-unit-of-work.js';
import { FixedClock } from '../../../../../shared/test/fakes/fixed-clock.js';
import { LoginUseCase } from '../../../application/use-cases/login/login.use-case.js';
import { RequestPasswordResetUseCase } from '../../../application/use-cases/request-password-reset/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from '../../../application/use-cases/reset-password/reset-password.use-case.js';
import { User } from '../../../domain/entities/user.entity.js';
import { InvalidPasswordResetTokenError } from '../../../domain/errors/invalid-password-reset-token.error.js';
import { PasswordConfirmationMismatchError } from '../../../domain/errors/password-confirmation-mismatch.error.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { InMemoryPasswordResetTokenRepository } from '../../../infra/persistence/in-memory/in-memory-password-reset-token.repository.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';
import { FakeHasher } from '../../fakes/fake-hasher.js';
import { FakePasswordResetNotifier } from '../../fakes/fake-password-reset-notifier.js';
import { FakeVerificationTokenGenerator } from '../../fakes/fake-verification-token-generator.js';

const NOW = new Date('2026-11-19T10:00:00.000Z');
const TTL_MS = 30 * 60 * 1000;

describe('password reset use cases', () => {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryPasswordResetTokenRepository();
  const notifier = new FakePasswordResetNotifier();
  const hasher = new FakeHasher();
  const unitOfWork = new InMemoryUnitOfWork();
  let clock: FixedClock;
  let request: RequestPasswordResetUseCase;
  let reset: ResetPasswordUseCase;
  let user: User;

  beforeEach(async () => {
    users.items.splice(0);
    tokens.items.splice(0);
    notifier.sent.splice(0);
    clock = new FixedClock(NOW);
    const generator = new FakeVerificationTokenGenerator();
    request = new RequestPasswordResetUseCase(
      users,
      tokens,
      generator,
      notifier,
      clock,
      unitOfWork,
      { tokenTtlMs: TTL_MS },
    );
    reset = new ResetPasswordUseCase(
      users,
      tokens,
      generator,
      hasher,
      clock,
      unitOfWork,
    );
    user = User.create({
      name: 'Maria Silva',
      email: Email.create('maria@ufal.br'),
      cpf: Cpf.create('529.982.247-25'),
      passwordHash: 'hashed:senha-antiga',
    });
    user.verifyEmail();
    await users.save(user);
  });

  async function issueToken(): Promise<string> {
    await request.execute({ email: user.email.value });
    return notifier.sent[notifier.sent.length - 1].token;
  }

  it('creates a hashed, expiring token and emails the raw token', async () => {
    await request.execute({ email: user.email.value });

    expect(tokens.items).toHaveLength(1);
    expect(tokens.items[0].tokenHash).toBe('hash:token-1');
    expect(tokens.items[0].expiresAt).toEqual(new Date(NOW.getTime() + TTL_MS));
    expect(notifier.sent[0]).toMatchObject({
      to: user.email.value,
      name: user.name,
      token: 'token-1',
    });
  });

  it('does not disclose or email unknown accounts', async () => {
    await request.execute({ email: 'unknown@ufal.br' });

    expect(notifier.sent).toHaveLength(0);
    expect(tokens.items).toHaveLength(0);
  });

  it('invalidates an older reset link when a new one is requested', async () => {
    const oldToken = await issueToken();
    const newToken = await issueToken();

    await expect(
      reset.execute({
        token: oldToken,
        password: 'senha-nova-123',
        passwordConfirmation: 'senha-nova-123',
      }),
    ).rejects.toThrow(InvalidPasswordResetTokenError);
    await reset.execute({
      token: newToken,
      password: 'senha-nova-123',
      passwordConfirmation: 'senha-nova-123',
    });
    expect(tokens.items).toHaveLength(1);
  });

  it('changes the login password and consumes the token exactly once', async () => {
    const token = await issueToken();
    const input = {
      token,
      password: 'senha-nova-123',
      passwordConfirmation: 'senha-nova-123',
    };

    await reset.execute(input);

    expect(user.passwordHash).toBe('hashed:senha-nova-123');
    await expect(
      new LoginUseCase(users, hasher).execute({
        email: user.email.value,
        password: 'senha-antiga',
      }),
    ).rejects.toThrow();
    await expect(
      new LoginUseCase(users, hasher).execute({
        email: user.email.value,
        password: 'senha-nova-123',
      }),
    ).resolves.toMatchObject({ userId: user.id });
    await expect(reset.execute(input)).rejects.toThrow(
      InvalidPasswordResetTokenError,
    );
  });

  it('rejects mismatched confirmation without consuming the token', async () => {
    const token = await issueToken();

    await expect(
      reset.execute({
        token,
        password: 'senha-nova-123',
        passwordConfirmation: 'outra-senha-123',
      }),
    ).rejects.toThrow(PasswordConfirmationMismatchError);
    expect(tokens.items[0].usedAt).toBeNull();
    expect(user.passwordHash).toBe('hashed:senha-antiga');
  });

  it('rejects an expired token', async () => {
    const token = await issueToken();
    clock.advance(TTL_MS);

    await expect(
      reset.execute({
        token,
        password: 'senha-nova-123',
        passwordConfirmation: 'senha-nova-123',
      }),
    ).rejects.toThrow(InvalidPasswordResetTokenError);
    expect(user.passwordHash).toBe('hashed:senha-antiga');
  });
});
