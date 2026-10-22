import type { User as PrismaUser } from '../../../../../../shared/infra/database/generated/prisma/client.js';
import { User } from '../../../../domain/entities/user.entity.js';
import { AccountStatus } from '../../../../domain/enums/account-status.enum.js';
import { InvalidEmailError } from '../../../../domain/errors/invalid-email.error.js';
import { Cpf } from '../../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../../domain/value-objects/email.vo.js';
import { Phone } from '../../../../domain/value-objects/phone.vo.js';
import { PhotoUrl } from '../../../../domain/value-objects/photo-url.vo.js';
import { UserMapper } from '../../../../infra/persistence/mappers/user.mapper.js';

function makeUser(): User {
  return User.create({
    name: 'Maria Silva',
    email: Email.create('maria@ufal.br'),
    cpf: Cpf.create('529.982.247-25'),
    passwordHash: '$argon2id$hash',
    phone: Phone.create('(82) 99999-1234'),
    photoUrl: PhotoUrl.create('https://cdn.morae.app/u/1.png'),
  });
}

function makeRow(overrides: Partial<PrismaUser> = {}): PrismaUser {
  return {
    id: '0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10',
    name: 'Maria Silva',
    email: 'maria@ufal.br',
    cpf: '52998224725',
    passwordHash: '$argon2id$hash',
    phone: null,
    photoUrl: null,
    emailVerified: false,
    status: 'ACTIVE',
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    updatedAt: new Date('2026-10-02T12:00:00.000Z'),
    ...overrides,
  };
}

describe('UserMapper', () => {
  it('converte os VOs em valores de coluna', () => {
    const user = makeUser();

    expect(UserMapper.toPersistence(user)).toEqual({
      id: user.id,
      name: 'Maria Silva',
      email: 'maria@ufal.br',
      cpf: '52998224725',
      passwordHash: '$argon2id$hash',
      phone: '82999991234',
      photoUrl: 'https://cdn.morae.app/u/1.png',
      emailVerified: false,
      status: 'ACTIVE',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

  it('preserva todos os dados na ida e volta', () => {
    const user = makeUser();
    user.verifyEmail();
    user.suspend();

    const restored = UserMapper.toDomain(UserMapper.toPersistence(user));

    expect(restored.id).toBe(user.id);
    expect(restored.name).toBe(user.name);
    expect(restored.email.equals(user.email)).toBe(true);
    expect(restored.cpf.equals(user.cpf)).toBe(true);
    expect(restored.passwordHash).toBe(user.passwordHash);
    expect(restored.phone?.equals(user.phone!)).toBe(true);
    expect(restored.photoUrl?.equals(user.photoUrl!)).toBe(true);
    expect(restored.emailVerified).toBe(true);
    expect(restored.status).toBe(AccountStatus.SUSPENDED);
    expect(restored.createdAt).toEqual(user.createdAt);
    expect(restored.updatedAt).toEqual(user.updatedAt);
  });

  it('mantém telefone e foto nulos', () => {
    const user = UserMapper.toDomain(makeRow());

    expect(user.phone).toBeNull();
    expect(user.photoUrl).toBeNull();
  });

  it('rejeita linha com dado inválido em vez de levá-lo ao domínio', () => {
    expect(() => UserMapper.toDomain(makeRow({ email: 'corrompido' }))).toThrow(
      InvalidEmailError,
    );
  });
});
