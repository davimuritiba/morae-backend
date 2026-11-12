import { InMemoryUnitOfWork } from '../../../../../shared/infra/database/in-memory-unit-of-work.js';
import { FixedClock } from '../../../../../shared/test/fakes/fixed-clock.js';
import {
  SendEmailVerificationUseCase,
  type SendEmailVerificationOptions,
} from '../../../application/use-cases/send-email-verification/send-email-verification.use-case.js';
import { User } from '../../../domain/entities/user.entity.js';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { InMemoryEmailVerificationTokenRepository } from '../../../infra/persistence/in-memory/in-memory-email-verification-token.repository.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';
import { FakeEmailVerificationNotifier } from '../../fakes/fake-email-verification-notifier.js';
import { FakeVerificationTokenGenerator } from '../../fakes/fake-verification-token-generator.js';

const NOW = new Date('2026-11-12T10:00:00.000Z');
const TTL_MS = 24 * 60 * 60 * 1000;

function makeUser(email = 'maria@ufal.br', cpf = '529.982.247-25'): User {
  return User.create({
    name: 'Maria Silva',
    email: Email.create(email),
    cpf: Cpf.create(cpf),
    passwordHash: 'hashed:senha',
  });
}

describe('SendEmailVerificationUseCase', () => {
  let users: InMemoryUserRepository;
  let tokens: InMemoryEmailVerificationTokenRepository;
  let notifier: FakeEmailVerificationNotifier;
  let sut: SendEmailVerificationUseCase;

  function build(
    options: SendEmailVerificationOptions = { tokenTtlMs: TTL_MS },
  ): SendEmailVerificationUseCase {
    return new SendEmailVerificationUseCase(
      users,
      tokens,
      new FakeVerificationTokenGenerator(),
      notifier,
      new FixedClock(NOW),
      new InMemoryUnitOfWork(),
      options,
    );
  }

  beforeEach(() => {
    users = new InMemoryUserRepository();
    tokens = new InMemoryEmailVerificationTokenRepository();
    notifier = new FakeEmailVerificationNotifier();
    sut = build();
  });

  it('salva só o hash e envia o token em texto puro por e-mail', async () => {
    const user = makeUser();
    await users.save(user);

    await sut.execute({ userId: user.id });

    expect(tokens.items).toHaveLength(1);
    expect(tokens.items[0].userId).toBe(user.id);
    expect(tokens.items[0].tokenHash).toBe('hash:token-1');
    expect(notifier.sent).toEqual([
      {
        to: 'maria@ufal.br',
        name: 'Maria Silva',
        token: 'token-1',
        expiresAt: new Date(NOW.getTime() + TTL_MS),
      },
    ]);
  });

  it('cria o token com a validade configurada', async () => {
    const user = makeUser();
    await users.save(user);

    await sut.execute({ userId: user.id });

    const [token] = tokens.items;
    expect(token.createdAt).toEqual(NOW);
    expect(token.expiresAt).toEqual(new Date(NOW.getTime() + TTL_MS));
    expect(token.isActive(NOW)).toBe(true);
  });

  it('substitui os tokens anteriores do usuário', async () => {
    const user = makeUser();
    await users.save(user);

    await sut.execute({ userId: user.id });
    await sut.execute({ userId: user.id });

    expect(tokens.items).toHaveLength(1);
    expect(tokens.items[0].tokenHash).toBe('hash:token-2');
    expect(notifier.sent.map((m) => m.token)).toEqual(['token-1', 'token-2']);
  });

  it('não mexe nos tokens de outros usuários', async () => {
    const maria = makeUser();
    const joao = makeUser('joao@ufal.br', '111.444.777-35');
    await users.save(maria);
    await users.save(joao);

    await sut.execute({ userId: maria.id });
    await sut.execute({ userId: joao.id });
    await sut.execute({ userId: maria.id });

    expect(tokens.items.map((t) => t.userId).sort()).toEqual(
      [maria.id, joao.id].sort(),
    );
  });

  it('lança UserNotFoundError para usuário inexistente', async () => {
    await expect(
      sut.execute({ userId: '0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10' }),
    ).rejects.toThrow(UserNotFoundError);
    expect(notifier.sent).toHaveLength(0);
  });

  it('não envia nada para e-mail já verificado', async () => {
    const user = makeUser();
    user.verifyEmail();
    await users.save(user);

    await sut.execute({ userId: user.id });

    expect(tokens.items).toHaveLength(0);
    expect(notifier.sent).toHaveLength(0);
  });

  it.each([
    ['suspensa', (user: User) => user.suspend()],
    ['desativada', (user: User) => user.deactivate()],
  ])('não envia nada para conta %s', async (_case, changeStatus) => {
    const user = makeUser();
    changeStatus(user);
    await users.save(user);

    await sut.execute({ userId: user.id });

    expect(tokens.items).toHaveLength(0);
    expect(notifier.sent).toHaveLength(0);
  });

  it('se o envio falhar, mantém o token salvo e repassa o erro', async () => {
    const user = makeUser();
    await users.save(user);
    notifier.failWith = new Error('servidor de e-mail fora do ar');

    await expect(sut.execute({ userId: user.id })).rejects.toThrow(
      'servidor de e-mail fora do ar',
    );
    expect(tokens.items).toHaveLength(1);
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'recusa validade de token inválida: %s',
    (tokenTtlMs) => {
      expect(() => build({ tokenTtlMs })).toThrow();
    },
  );
});
