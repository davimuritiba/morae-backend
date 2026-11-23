import { LoginUseCase } from '../../../application/use-cases/login/login.use-case.js';
import { EmailNotVerifiedError } from '../../../domain/errors/email-not-verified.error.js';
import { InvalidCredentialsError } from '../../../domain/errors/invalid-credentials.error.js';
import { User } from '../../../domain/entities/user.entity.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';
import { FakeHasher } from '../../fakes/fake-hasher.js';

function makeUser({ emailVerified = true } = {}) {
  const user = User.create({
    name: 'Maria Silva',
    email: Email.create('maria@ufal.br'),
    cpf: Cpf.create('529.982.247-25'),
    passwordHash: 'hashed:senha-segura-123',
  });
  if (emailVerified) user.verifyEmail();
  return user;
}

describe('LoginUseCase', () => {
  let users: InMemoryUserRepository;
  let sut: LoginUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    sut = new LoginUseCase(users, new FakeHasher());
  });

  it('autentica e retorna apenas dados públicos do usuário', async () => {
    const user = makeUser();
    await users.save(user);

    await expect(
      sut.execute({
        email: 'MARIA@UFAL.BR',
        password: 'senha-segura-123',
      }),
    ).resolves.toEqual({
      userId: user.id,
      name: 'Maria Silva',
      email: 'maria@ufal.br',
      status: 'ACTIVE',
    });
  });

  it.each([
    { email: 'maria@ufal.br', password: 'senha-incorreta' },
    { email: 'outro@ufal.br', password: 'senha-segura-123' },
  ])('rejeita credenciais inválidas', async (input) => {
    await users.save(makeUser());

    await expect(sut.execute(input)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('rejeita contas suspensas sem revelar o motivo', async () => {
    const user = makeUser();
    user.suspend();
    await users.save(user);

    await expect(
      sut.execute({
        email: 'maria@ufal.br',
        password: 'senha-segura-123',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('bloqueia quem ainda não confirmou o e-mail', async () => {
    await users.save(makeUser({ emailVerified: false }));

    await expect(
      sut.execute({
        email: 'maria@ufal.br',
        password: 'senha-segura-123',
      }),
    ).rejects.toBeInstanceOf(EmailNotVerifiedError);
  });

  it('com senha errada, não revela que o e-mail está pendente', async () => {
    await users.save(makeUser({ emailVerified: false }));

    await expect(
      sut.execute({ email: 'maria@ufal.br', password: 'senha-incorreta' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
