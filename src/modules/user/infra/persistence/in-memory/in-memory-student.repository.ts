import type { Student } from '../../../domain/entities/student.entity.js';
import { EnrollmentNumberAlreadyInUseError } from '../../../domain/errors/enrollment-number-already-in-use.error.js';
import { StudentRepository } from '../../../domain/repositories/student.repository.js';
import type { EnrollmentNumber } from '../../../domain/value-objects/enrollment-number.vo.js';

export class InMemoryStudentRepository extends StudentRepository {
  // Público para os testes inspecionarem o que foi salvo.
  readonly items: Student[] = [];

  findById(id: string): Promise<Student | null> {
    return Promise.resolve(this.items.find((s) => s.id === id) ?? null);
  }

  findByUserId(userId: string): Promise<Student | null> {
    return Promise.resolve(this.items.find((s) => s.userId === userId) ?? null);
  }

  existsByEnrollmentNumber(
    enrollmentNumber: EnrollmentNumber,
  ): Promise<boolean> {
    return Promise.resolve(
      this.items.some((s) => s.enrollmentNumber.equals(enrollmentNumber)),
    );
  }

  // Simula a constraint UNIQUE de matrícula do banco.
  save(student: Student): Promise<void> {
    const others = this.items.filter((s) => s.id !== student.id);

    if (
      others.some((s) => s.enrollmentNumber.equals(student.enrollmentNumber))
    ) {
      return Promise.reject(new EnrollmentNumberAlreadyInUseError());
    }

    const index = this.items.findIndex((s) => s.id === student.id);
    if (index >= 0) {
      this.items[index] = student;
    } else {
      this.items.push(student);
    }
    return Promise.resolve();
  }
}
