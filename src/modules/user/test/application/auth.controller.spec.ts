import { JwtService } from '@nestjs/jwt';
import { AuthTokenService } from '../../../../shared/infra/auth/auth-token.service.js';
import { AuthController } from '../../presentation/http/controllers/auth.controller.js';
import { LoginAdministratorUseCase } from '../../application/use-cases/login-administrator/login-administrator.use-case.js';
import { LoginUseCase } from '../../application/use-cases/login/login.use-case.js';
import { User } from '../../domain/entities/user.entity.js';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error.js';
import { Cpf } from '../../domain/value-objects/cpf.vo.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { InMemoryAdministratorRepository } from '../../infra/persistence/in-memory/in-memory-administrator.repository.js';
import { InMemoryUserRepository } from '../../infra/persistence/in-memory/in-memory-user.repository.js';
import { FakeHasher } from '../fakes/fake-hasher.js';

describe('AuthController user login', () => {
  const users = new InMemoryUserRepository();
  const hasher = new FakeHasher();
  const tokenService = new AuthTokenService(
    new JwtService({ secret: 'test-only-secret' }),
  );
  let controller: AuthController;
  let user: User;

  beforeEach(async () => {
    users.items.splice(0);
    const administrators = new InMemoryAdministratorRepository();
    user = User.create({
      name: 'Maria Silva',
      email: Email.create('maria@ufal.br'),
      cpf: Cpf.create('529.982.247-25'),
      passwordHash: 'hashed:senha-segura-123',
    });
    await users.save(user);
    controller = new AuthController(
      new LoginUseCase(users, hasher),
      tokenService,
      new LoginAdministratorUseCase(administrators, users, hasher),
    );
  });

  it('returns a bearer token that identifies the authenticated user', async () => {
    const response = await controller.loginUser({
      email: user.email.value,
      password: 'senha-segura-123',
    });

    expect(response).toMatchObject({
      userId: user.id,
      email: user.email.value,
      tokenType: 'Bearer',
    });
    await expect(tokenService.verify(response.accessToken)).resolves.toEqual({
      userId: user.id,
    });
  });

  it.each([
    { email: 'maria@ufal.br', password: 'senha-incorreta' },
    { email: 'desconhecido@ufal.br', password: 'senha-segura-123' },
  ])(
    'rejects invalid credentials without disclosing the account',
    async (input) => {
      await expect(controller.loginUser(input)).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Credenciais inválidas.',
      } satisfies Partial<InvalidCredentialsError>);
    },
  );
});
