import { PrismaService } from '../../../../../../shared/infra/database/prisma.service.js';
import { resetDatabase } from '../../../../../../../test/integration/reset-database.js';
import { User } from '../../../../domain/entities/user.entity.js';
import { AccountStatus } from '../../../../domain/enums/account-status.enum.js';
import { CpfAlreadyInUseError } from '../../../../domain/errors/cpf-already-in-use.error.js';
import { EmailAlreadyInUseError } from '../../../../domain/errors/email-already-in-use.error.js';
import { Cpf } from '../../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../../domain/value-objects/email.vo.js';
import { Phone } from '../../../../domain/value-objects/phone.vo.js';
import { PhotoUrl } from '../../../../domain/value-objects/photo-url.vo.js';
import { PrismaUserRepository } from '../../../../infra/persistence/repositories/prisma-user.repository.js';

function makeUser(overrides: { email?: string; cpf?: string } = {}): User {
  return User.create({
    name: 'Maria Silva',
    email: Email.create(overrides.email ?? 'maria@ufal.br'),
    cpf: Cpf.create(overrides.cpf ?? '529.982.247-25'),
    passwordHash: '$argon2id$hash',
    phone: Phone.create('(82) 99999-1234'),
    photoUrl: PhotoUrl.create('https://cdn.morae.app/u/1.png'),
  });
}

describe('PrismaUserRepository (integração)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaUserRepository(prisma);

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('salva e recupera o usuário com todos os dados', async () => {
    const user = makeUser();

    await repository.save(user);
    const found = await repository.findById(user.id);

    expect(found).not.toBeNull();
    expect(found!.name).toBe('Maria Silva');
    expect(found!.email.value).toBe('maria@ufal.br');
    expect(found!.cpf.value).toBe('52998224725');
    expect(found!.passwordHash).toBe('$argon2id$hash');
    expect(found!.phone?.value).toBe('82999991234');
    expect(found!.photoUrl?.value).toBe('https://cdn.morae.app/u/1.png');
    expect(found!.emailVerified).toBe(false);
    expect(found!.status).toBe(AccountStatus.ACTIVE);
    expect(found!.createdAt).toEqual(user.createdAt);
    expect(found!.updatedAt).toEqual(user.updatedAt);
  });

  it('atualiza o usuário existente em vez de criar outro', async () => {
    const user = makeUser();
    await repository.save(user);

    user.verifyEmail();
    user.suspend();
    await repository.save(user);

    const found = await repository.findById(user.id);
    expect(found!.emailVerified).toBe(true);
    expect(found!.status).toBe(AccountStatus.SUSPENDED);
    expect(await prisma.user.count()).toBe(1);
  });

  it('busca por e-mail', async () => {
    const user = makeUser();
    await repository.save(user);

    const found = await repository.findByEmail(Email.create('MARIA@ufal.br'));

    expect(found?.id).toBe(user.id);
    expect(
      await repository.findByEmail(Email.create('outra@ufal.br')),
    ).toBeNull();
  });

  it('informa se e-mail e CPF já existem', async () => {
    await repository.save(makeUser());

    expect(await repository.existsByEmail(Email.create('maria@ufal.br'))).toBe(
      true,
    );
    expect(await repository.existsByEmail(Email.create('outra@ufal.br'))).toBe(
      false,
    );
    expect(await repository.existsByCpf(Cpf.create('529.982.247-25'))).toBe(
      true,
    );
    expect(await repository.existsByCpf(Cpf.create('111.444.777-35'))).toBe(
      false,
    );
  });

  it('devolve null para id inexistente ou que não é UUID', async () => {
    expect(
      await repository.findById('0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10'),
    ).toBeNull();
    expect(await repository.findById('nao-e-uuid')).toBeNull();
  });

  it('converte e-mail duplicado em EmailAlreadyInUseError', async () => {
    await repository.save(makeUser());

    await expect(
      repository.save(makeUser({ cpf: '111.444.777-35' })),
    ).rejects.toThrow(EmailAlreadyInUseError);
  });

  it('converte CPF duplicado em CpfAlreadyInUseError', async () => {
    await repository.save(makeUser());

    await expect(
      repository.save(makeUser({ email: 'outra@ufal.br' })),
    ).rejects.toThrow(CpfAlreadyInUseError);
  });

  it('barra o duplicado mesmo com gravações simultâneas', async () => {
    const results = await Promise.allSettled([
      repository.save(makeUser({ cpf: '529.982.247-25' })),
      repository.save(makeUser({ cpf: '111.444.777-35' })),
    ]);

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      EmailAlreadyInUseError,
    );
    expect(await prisma.user.count()).toBe(1);
  });
});
