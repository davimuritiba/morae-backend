import { ChangeUserAccountStatusUseCase } from '../../../application/use-cases/change-user-account-status/change-user-account-status.use-case.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { InvalidAccountStatusTransitionError } from '../../../domain/errors/invalid-account-status-transition.error.js';
import { User } from '../../../domain/entities/user.entity.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';

function createUser() {
  return User.create({
    name: 'Maria Silva',
    email: Email.create('maria@ufal.br'),
    cpf: Cpf.create('529.982.247-25'),
    passwordHash: 'hashed:password',
  });
}

describe('ChangeUserAccountStatusUseCase', () => {
  it('persists account suspension and reactivation', async () => {
    const users = new InMemoryUserRepository();
    const user = createUser();
    await users.save(user);
    const sut = new ChangeUserAccountStatusUseCase(users);

    await expect(
      sut.execute(user.id, AccountStatus.SUSPENDED),
    ).resolves.toMatchObject({ id: user.id, status: AccountStatus.SUSPENDED });
    await expect(
      sut.execute(user.id, AccountStatus.ACTIVE),
    ).resolves.toMatchObject({ id: user.id, status: AccountStatus.ACTIVE });
  });

  it('does not allow reactivating a permanently deactivated account', async () => {
    const users = new InMemoryUserRepository();
    const user = createUser();
    user.deactivate();
    await users.save(user);
    const sut = new ChangeUserAccountStatusUseCase(users);

    await expect(
      sut.execute(user.id, AccountStatus.ACTIVE),
    ).rejects.toBeInstanceOf(InvalidAccountStatusTransitionError);
  });
});
