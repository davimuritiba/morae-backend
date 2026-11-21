import type { Student } from '../entities/student.entity.js';
import type { EnrollmentNumber } from '../value-objects/enrollment-number.vo.js';

export abstract class StudentRepository {
  abstract findById(id: string): Promise<Student | null>;
  abstract findByUserId(userId: string): Promise<Student | null>;
  abstract existsByEnrollmentNumber(
    enrollmentNumber: EnrollmentNumber,
  ): Promise<boolean>;
  // Persiste o agregado inteiro: Student + StudentProfile.
  // Como em UserRepository, a matrícula deve ser única no banco (constraint
  // UNIQUE), com a violação convertida em EnrollmentNumberAlreadyInUseError.
  abstract save(student: Student): Promise<void>;
}
