import { Injectable } from '@nestjs/common';
import { rethrowUniqueViolation } from '../../../../../shared/infra/database/prisma-errors.js';
import { PrismaTransactionContext } from '../../../../../shared/infra/database/prisma-transaction-context.js';
import { isUuid } from '../../../../../shared/infra/database/uuid.js';
import type {
  AccountStatus as PrismaAccountStatus,
  Prisma,
} from '../../../../../shared/infra/database/generated/prisma/client.js';
import type { User } from '../../../domain/entities/user.entity.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { resolveAccountType } from '../../../domain/enums/account-type.enum.js';
import type { AccountType } from '../../../domain/enums/account-type.enum.js';
import { CpfAlreadyInUseError } from '../../../domain/errors/cpf-already-in-use.error.js';
import { EmailAlreadyInUseError } from '../../../domain/errors/email-already-in-use.error.js';
import {
  UserRepository,
  type AdminUserPage,
  type AdminUserQuery,
  type AdminUserRecord,
} from '../../../domain/repositories/user.repository.js';
import type { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import type { Email } from '../../../domain/value-objects/email.vo.js';
import { UserMapper } from '../mappers/user.mapper.js';

// Nomes das constraints UNIQUE criadas pela migration init.
const UNIQUE_ERRORS = {
  users_email_key: () => new EmailAlreadyInUseError(),
  users_cpf_key: () => new CpfAlreadyInUseError(),
};

const ADMIN_USER_INCLUDE = {
  student: {
    select: { course: true, period: true, verificationStatus: true },
  },
  propertyOwner: {
    select: { verificationStatus: true },
  },
} satisfies Prisma.UserInclude;

type AdminUserRow = Prisma.UserGetPayload<{
  include: typeof ADMIN_USER_INCLUDE;
}>;

const accountStatusToPrisma: Record<AccountStatus, PrismaAccountStatus> = {
  [AccountStatus.ACTIVE]: 'ACTIVE',
  [AccountStatus.SUSPENDED]: 'SUSPENDED',
  [AccountStatus.DEACTIVATED]: 'DEACTIVATED',
};

const accountStatusFromPrisma: Record<PrismaAccountStatus, AccountStatus> = {
  ACTIVE: AccountStatus.ACTIVE,
  SUSPENDED: AccountStatus.SUSPENDED,
  DEACTIVATED: AccountStatus.DEACTIVATED,
};

function toAdminRecord(row: AdminUserRow): AdminUserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    photoUrl: row.photoUrl,
    emailVerified: row.emailVerified,
    status: accountStatusFromPrisma[row.status],
    createdAt: row.createdAt,
    student: row.student
      ? {
          course: row.student.course,
          period: row.student.period,
          verificationStatus: row.student.verificationStatus,
        }
      : null,
    propertyOwner: row.propertyOwner
      ? { verificationStatus: row.propertyOwner.verificationStatus }
      : null,
  };
}

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findAll(): Promise<User[]> {
    const rows = await this.db.client.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => UserMapper.toDomain(row));
  }

  async findAdminPage(query: AdminUserQuery): Promise<AdminUserPage> {
    const where: Prisma.UserWhereInput = {};
    if (query.status) where.status = accountStatusToPrisma[query.status];
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.db.client.user.findMany({
        where,
        include: ADMIN_USER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.client.user.count({ where }),
    ]);

    return {
      items: rows.map(toAdminRecord),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findAdminById(id: string): Promise<AdminUserRecord | null> {
    if (!isUuid(id)) return null;

    const row = await this.db.client.user.findUnique({
      where: { id },
      include: ADMIN_USER_INCLUDE,
    });
    return row ? toAdminRecord(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    if (!isUuid(id)) return null;

    const row = await this.db.client.user.findUnique({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findAccountStatusById(userId: string): Promise<AccountStatus | null> {
    if (!isUuid(userId)) return null;

    const row = await this.db.client.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    return row ? accountStatusFromPrisma[row.status] : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.db.client.user.findUnique({
      where: { email: email.value },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findIdByEmail(email: Email): Promise<string | null> {
    const row = await this.db.client.user.findUnique({
      where: { email: email.value },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async findAccountType(userId: string): Promise<AccountType> {
    const profiles = await this.db.client.user.findUnique({
      where: { id: userId },
      select: {
        student: { select: { id: true } },
        propertyOwner: { select: { id: true } },
        administrator: { select: { id: true } },
      },
    });

    return resolveAccountType({
      student: profiles?.student !== null && profiles?.student !== undefined,
      propertyOwner:
        profiles?.propertyOwner !== null && profiles?.propertyOwner !== undefined,
      administrator:
        profiles?.administrator !== null && profiles?.administrator !== undefined,
    });
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const row = await this.db.client.user.findUnique({
      where: { email: email.value },
      select: { id: true },
    });
    return row !== null;
  }

  async existsByCpf(cpf: Cpf): Promise<boolean> {
    const row = await this.db.client.user.findUnique({
      where: { cpf: cpf.value },
      select: { id: true },
    });
    return row !== null;
  }

  // Cria ou atualiza pelo id. A constraint UNIQUE do banco é a garantia final
  // contra duplicados em requisições simultâneas.
  async save(user: User): Promise<void> {
    const data = UserMapper.toPersistence(user);

    try {
      await this.db.client.user.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      rethrowUniqueViolation(error, UNIQUE_ERRORS);
    }
  }
}
