import { GetUserByIdUseCase } from '../../../application/use-cases/get-user-by-id/get-user-by-id.use-case.js';
import { User } from '../../../domain/entities/user.entity.js';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { Phone } from '../../../domain/value-objects/phone.vo.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';

describe('GetUserByIdUseCase', () => {
  let users: InMemoryUserRepository;
  let sut: GetUserByIdUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    sut = new GetUserByIdUseCase(users);
  });

  it('retorna os dados públicos do usuário', async () => {
    const user = User.create({
      name: 'Maria Silva',
      email: Email.create('maria@ufal.br'),
      cpf: Cpf.create('529.982.247-25'),
      passwordHash: 'hashed:senha-segura-123',
      phone: Phone.create('(82) 99999-1234'),
    });
    await users.save(user);

    await expect(sut.execute(user.id)).resolves.toEqual({
      userId: user.id,
      name: 'Maria Silva',
      email: 'maria@ufal.br',
      phone: '82999991234',
      photoUrl: null,
      emailVerified: false,
      status: 'ACTIVE',
    });
  });

  it('rejeita um id inexistente', async () => {
    await expect(
      sut.execute('00000000-0000-0000-0000-000000000000'),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it('does not expose a profile after administrative deactivation', async () => {
    const user = User.create({
      name: 'Maria Silva',
      email: Email.create('maria@ufal.br'),
      cpf: Cpf.create('529.982.247-25'),
      passwordHash: 'hashed:senha-segura-123',
    });
    user.deactivate();
    await users.save(user);

    await expect(sut.execute(user.id)).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
