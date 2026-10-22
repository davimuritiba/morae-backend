import { Injectable } from '@nestjs/common';
import { rethrowUniqueViolation } from '../../../../../shared/infra/database/prisma-errors.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { isUuid } from '../../../../../shared/infra/database/uuid.js';
import type { User } from '../../../domain/entities/user.entity.js';
import { CpfAlreadyInUseError } from '../../../domain/errors/cpf-already-in-use.error.js';
import { EmailAlreadyInUseError } from '../../../domain/errors/email-already-in-use.error.js';
import { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import type { Email } from '../../../domain/value-objects/email.vo.js';
import { UserMapper } from '../mappers/user.mapper.js';

// Nomes das constraints UNIQUE criadas pela migration init.
const UNIQUE_ERRORS = {
  users_email_key: () => new EmailAlreadyInUseError(),
  users_cpf_key: () => new CpfAlreadyInUseError(),
};

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<User | null> {
    if (!isUuid(id)) return null;

    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { email: email.value },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const row = await this.prisma.user.findUnique({
      where: { email: email.value },
      select: { id: true },
    });
    return row !== null;
  }

  async existsByCpf(cpf: Cpf): Promise<boolean> {
    const row = await this.prisma.user.findUnique({
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
      await this.prisma.user.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      rethrowUniqueViolation(error, UNIQUE_ERRORS);
    }
  }
}
