import { ListAdminUsersUseCase } from '../../../application/use-cases/list-admin-users/list-admin-users.use-case.js';
import { User } from '../../../domain/entities/user.entity.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';

describe('ListAdminUsersUseCase', () => {
  it('searches and paginates registered users', async () => {
    const users = new InMemoryUserRepository();
    await users.save(User.create({
      name: 'Maria Silva',
      email: Email.create('maria@ufal.br'),
      cpf: Cpf.create('529.982.247-25'),
      passwordHash: 'hashed:password',
    }));
    await users.save(User.create({
      name: 'João Souza',
      email: Email.create('joao@ufal.br'),
      cpf: Cpf.create('111.444.777-35'),
      passwordHash: 'hashed:password',
    }));
    const sut = new ListAdminUsersUseCase(users);

    await expect(
      sut.execute({ search: 'maria', page: 1, limit: 1 }),
    ).resolves.toMatchObject({
      total: 1,
      page: 1,
      limit: 1,
      items: [{ name: 'Maria Silva', email: 'maria@ufal.br' }],
    });
  });
});
