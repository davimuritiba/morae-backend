import { Injectable } from '@nestjs/common';
import { rethrowUniqueViolation } from '../../../../../shared/infra/database/prisma-errors.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { isUuid } from '../../../../../shared/infra/database/uuid.js';
import type { Student } from '../../../domain/entities/student.entity.js';
import { EnrollmentNumberAlreadyInUseError } from '../../../domain/errors/enrollment-number-already-in-use.error.js';
import { StudentRepository } from '../../../domain/repositories/student.repository.js';
import type { EnrollmentNumber } from '../../../domain/value-objects/enrollment-number.vo.js';
import { StudentMapper, studentInclude } from '../mappers/student.mapper.js';

// Nomes das constraints UNIQUE criadas pela migration init.
// students_user_id_key (usuário que já é estudante) não tem erro de domínio
// próprio: o caso de uso deve impedir isso antes, então chega como erro cru.
const UNIQUE_ERRORS = {
  students_enrollment_number_key: () => new EnrollmentNumberAlreadyInUseError(),
};

@Injectable()
export class PrismaStudentRepository extends StudentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Student | null> {
    if (!isUuid(id)) return null;

    const row = await this.prisma.student.findUnique({
      where: { id },
      include: studentInclude,
    });
    return row ? StudentMapper.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<Student | null> {
    if (!isUuid(userId)) return null;

    const row = await this.prisma.student.findUnique({
      where: { userId },
      include: studentInclude,
    });
    return row ? StudentMapper.toDomain(row) : null;
  }

  async existsByEnrollmentNumber(
    enrollmentNumber: EnrollmentNumber,
  ): Promise<boolean> {
    const row = await this.prisma.student.findUnique({
      where: { enrollmentNumber: enrollmentNumber.value },
      select: { id: true },
    });
    return row !== null;
  }

  // Grava o agregado num único upsert com o perfil aninhado: o Prisma executa
  // tudo numa transação, então Student e StudentProfile nunca ficam
  // dessincronizados.
  async save(student: Student): Promise<void> {
    const data = StudentMapper.toPersistence(student);
    const profile = student.profile
      ? StudentMapper.profileToPersistence(student.profile)
      : null;

    try {
      await this.prisma.student.upsert({
        where: { id: data.id },
        create: {
          ...data,
          ...(profile && { profile: { create: profile } }),
        },
        update: {
          ...data,
          ...(profile && {
            profile: { upsert: { create: profile, update: profile } },
          }),
        },
      });
    } catch (error) {
      rethrowUniqueViolation(error, UNIQUE_ERRORS);
    }
  }
}
