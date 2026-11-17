import { LoginAdministratorUseCase } from '../../../application/use-cases/login-administrator/login-administrator.use-case.js';
import { Administrator } from '../../../domain/entities/administrator.entity.js';
import { InvalidCredentialsError } from '../../../domain/errors/invalid-credentials.error.js';
import { Permission } from '../../../domain/enums/permission.enum.js';
import { User } from '../../../domain/entities/user.entity.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { InMemoryAdministratorRepository } from '../../../infra/persistence/in-memory/in-memory-administrator.repository.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';
import { FakeHasher } from '../../fakes/fake-hasher.js';

describe('LoginAdministratorUseCase', () => {
  it('autentica login e senha do administrador', async () => {
    const users = new InMemoryUserRepository();
    const administrators = new InMemoryAdministratorRepository();
    const user = User.create({
      name: 'Admin',
      email: Email.create('admin@morae.com'),
      cpf: Cpf.create('52998224725'),
      passwordHash: 'hashed:senha',
    });
    const administrator = Administrator.create({
      userId: user.id,
      login: 'ADMIN',
      passwordHash: 'hashed:Admin@123',
      permissions: [Permission.MANAGE_USERS],
    });
    await users.save(user);
    await administrators.save(administrator);

    const sut = new LoginAdministratorUseCase(
      administrators,
      users,
      new FakeHasher(),
    );

    await expect(
      sut.execute({ login: 'Admin', password: 'Admin@123' }),
    ).resolves.toEqual({
      administratorId: administrator.id,
      userId: user.id,
      login: 'admin',
      permissions: [Permission.MANAGE_USERS],
    });
  });

  it('rejeita senha incorreta', async () => {
    const users = new InMemoryUserRepository();
    const administrators = new InMemoryAdministratorRepository();
    const user = User.create({
      name: 'Admin',
      email: Email.create('admin@morae.com'),
      cpf: Cpf.create('52998224725'),
      passwordHash: 'hashed:senha',
    });
    const administrator = Administrator.create({
      userId: user.id,
      login: 'admin',
      passwordHash: 'hashed:Admin@123',
    });
    await users.save(user);
    await administrators.save(administrator);

    const sut = new LoginAdministratorUseCase(
      administrators,
      users,
      new FakeHasher(),
    );

    await expect(
      sut.execute({ login: 'admin', password: 'incorreta' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
