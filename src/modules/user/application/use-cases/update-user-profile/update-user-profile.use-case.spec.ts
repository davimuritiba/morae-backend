import { FakeLogger } from '../../../../../shared/test/fakes/fake-logger.js';
import { UpdateUserProfileUseCase } from './update-user-profile.use-case.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';
import { User } from '../../../domain/entities/user.entity.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { Phone } from '../../../domain/value-objects/phone.vo.js';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import { EmailAlreadyInUseError } from '../../../domain/errors/email-already-in-use.error.js';
import { CpfAlreadyInUseError } from '../../../domain/errors/cpf-already-in-use.error.js';
import { EmptyUserProfileUpdateError } from '../../../domain/errors/empty-user-profile-update.error.js';

function makeUser(overrides: Partial<Parameters<typeof User.create>[0]> = {}) {
  return User.create({
    name: 'Maria Silva',
    email: Email.create('maria@ufal.br'),
    cpf: Cpf.create('529.982.247-25'),
    passwordHash: 'hash-da-senha',
    phone: Phone.create('(82) 99999-1234'),
    ...overrides,
  });
}

describe('UpdateUserProfileUseCase', () => {
  let users: InMemoryUserRepository;
  let sentVerificationFor: string[];
  let sut: UpdateUserProfileUseCase;
  let logger: FakeLogger;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    sentVerificationFor = [];
    logger = new FakeLogger();
    sut = new UpdateUserProfileUseCase(
      users,
      {
        execute: async ({ userId }) => {
          sentVerificationFor.push(userId);
        },
      },
      logger,
    );
  });

  it('atualiza os dados pessoais permitidos e persiste a alteração', async () => {
    const user = makeUser();
    await users.save(user);

    const output = await sut.execute({
      userId: user.id,
      name: '  Maria Oliveira  ',
      phone: null,
      cpf: '111.444.777-35',
    });

    expect(output).toMatchObject({
      userId: user.id,
      name: 'Maria Oliveira',
      email: 'maria@ufal.br',
      phone: null,
      emailVerified: false,
    });
    expect(users.items[0]?.cpf.value).toBe('11144477735');
    expect(output).not.toHaveProperty('cpf');
    expect(output).not.toHaveProperty('passwordHash');
    expect(sentVerificationFor).toEqual([]);
  });

  it('revalida o novo e-mail e pede verificação quando ele muda', async () => {
    const user = makeUser();
    user.verifyEmail();
    await users.save(user);

    const output = await sut.execute({
      userId: user.id,
      email: 'nova@ufal.br',
    });

    expect(output.email).toBe('nova@ufal.br');
    expect(output.emailVerified).toBe(false);
    expect(sentVerificationFor).toEqual([user.id]);
  });

  it('não envia nova verificação quando o e-mail normalizado não mudou', async () => {
    const user = makeUser();
    await users.save(user);

    await sut.execute({ userId: user.id, email: ' MARIA@UFAL.BR ' });

    expect(sentVerificationFor).toEqual([]);
  });

  it('não desfaz a atualização se o envio do e-mail falhar', async () => {
    const user = makeUser();
    await users.save(user);
    const failing = new UpdateUserProfileUseCase(
      users,
      {
        execute: async () => {
          throw new Error('SMTP indisponível');
        },
      },
      logger,
    );

    await expect(
      failing.execute({ userId: user.id, email: 'nova@ufal.br' }),
    ).resolves.toMatchObject({ email: 'nova@ufal.br' });
    expect(logger.errors).toHaveLength(1);
    expect(user.email.value).toBe('nova@ufal.br');
  });

  it('rejeita e-mail ou CPF já usados por outra conta', async () => {
    const user = makeUser();
    const other = makeUser({
      name: 'Outra pessoa',
      email: Email.create('outra@ufal.br'),
      cpf: Cpf.create('111.444.777-35'),
    });
    await users.save(user);
    await users.save(other);

    await expect(
      sut.execute({ userId: user.id, email: other.email.value }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);
    await expect(
      sut.execute({ userId: user.id, cpf: other.cpf.value }),
    ).rejects.toBeInstanceOf(CpfAlreadyInUseError);
  });

  it('rejeita id inexistente, corpo vazio e dados inválidos', async () => {
    const user = makeUser();
    await users.save(user);

    await expect(
      sut.execute({ userId: 'inexistente', name: 'Novo nome' }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
    await expect(sut.execute({ userId: user.id })).rejects.toBeInstanceOf(
      EmptyUserProfileUpdateError,
    );
    await expect(
      sut.execute({ userId: user.id, email: 'inválido' }),
    ).rejects.toThrow();
    await expect(
      sut.execute({ userId: user.id, cpf: '111.111.111-11' }),
    ).rejects.toThrow();
  });
});
