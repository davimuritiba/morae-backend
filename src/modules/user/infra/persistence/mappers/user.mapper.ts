import type {
  AccountStatus as PrismaAccountStatus,
  User as PrismaUser,
} from '../../../../../shared/infra/database/generated/prisma/client.js';
import { User } from '../../../domain/entities/user.entity.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { Phone } from '../../../domain/value-objects/phone.vo.js';
import { PhotoUrl } from '../../../domain/value-objects/photo-url.vo.js';

const accountStatusToPrisma: Record<AccountStatus, PrismaAccountStatus> = {
  [AccountStatus.ACTIVE]: 'ACTIVE',
  [AccountStatus.SUSPENDED]: 'SUSPENDED',
  [AccountStatus.DEACTIVATED]: 'DEACTIVATED',
};

const accountStatusToDomain: Record<PrismaAccountStatus, AccountStatus> = {
  ACTIVE: AccountStatus.ACTIVE,
  SUSPENDED: AccountStatus.SUSPENDED,
  DEACTIVATED: AccountStatus.DEACTIVATED,
};

// Converte entre a entidade User e a linha da tabela users.
export class UserMapper {
  // Os VOs são recriados com create(): um dado inválido no banco falha aqui,
  // em vez de entrar no domínio.
  static toDomain(raw: PrismaUser): User {
    return User.restore(raw.id, {
      name: raw.name,
      email: Email.create(raw.email),
      cpf: Cpf.create(raw.cpf),
      passwordHash: raw.passwordHash,
      phone: raw.phone === null ? null : Phone.create(raw.phone),
      photoUrl: raw.photoUrl === null ? null : PhotoUrl.create(raw.photoUrl),
      emailVerified: raw.emailVerified,
      status: accountStatusToDomain[raw.status],
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  // Devolve a linha completa: serve tanto para create quanto para update.
  static toPersistence(user: User): PrismaUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email.value,
      cpf: user.cpf.value,
      passwordHash: user.passwordHash,
      phone: user.phone?.value ?? null,
      photoUrl: user.photoUrl?.value ?? null,
      emailVerified: user.emailVerified,
      status: accountStatusToPrisma[user.status],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
