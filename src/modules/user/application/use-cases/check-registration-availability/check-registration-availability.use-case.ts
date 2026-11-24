import { InvalidCpfError } from '../../../domain/errors/invalid-cpf.error.js';
import { InvalidEmailError } from '../../../domain/errors/invalid-email.error.js';
import { InvalidEnrollmentNumberError } from '../../../domain/errors/invalid-enrollment-number.error.js';
import type { StudentRepository } from '../../../domain/repositories/student.repository.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { EnrollmentNumber } from '../../../domain/value-objects/enrollment-number.vo.js';
import type { CheckRegistrationAvailabilityInput } from './check-registration-availability.input.js';
import type { CheckRegistrationAvailabilityOutput } from './check-registration-availability.output.js';
import type { RegistrationFieldAvailability } from '../registration-field-availability.js';

export class CheckRegistrationAvailabilityUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly students: StudentRepository,
  ) {}

  async execute(
    input: CheckRegistrationAvailabilityInput,
  ): Promise<CheckRegistrationAvailabilityOutput> {
    const result: CheckRegistrationAvailabilityOutput = {};

    if (input.cpf !== undefined) result.cpf = await this.checkCpf(input.cpf);
    if (input.email !== undefined) {
      result.email = await this.checkEmail(input.email);
    }
    if (input.enrollmentNumber !== undefined) {
      result.enrollmentNumber = await this.checkEnrollmentNumber(
        input.enrollmentNumber,
      );
    }

    return result;
  }

  private async checkCpf(raw: string): Promise<RegistrationFieldAvailability> {
    let cpf: Cpf;
    try {
      cpf = Cpf.create(raw);
    } catch (error) {
      if (error instanceof InvalidCpfError) return this.invalid();
      throw error;
    }

    return { valid: true, unique: !(await this.users.existsByCpf(cpf)) };
  }

  private async checkEmail(
    raw: string,
  ): Promise<RegistrationFieldAvailability> {
    let email: Email;
    try {
      email = Email.create(raw);
    } catch (error) {
      if (error instanceof InvalidEmailError) return this.invalid();
      throw error;
    }

    return { valid: true, unique: !(await this.users.existsByEmail(email)) };
  }

  private async checkEnrollmentNumber(
    raw: string,
  ): Promise<RegistrationFieldAvailability> {
    let enrollmentNumber: EnrollmentNumber;
    try {
      enrollmentNumber = EnrollmentNumber.create(raw);
    } catch (error) {
      if (error instanceof InvalidEnrollmentNumberError) {
        return this.invalid();
      }
      throw error;
    }

    return {
      valid: true,
      unique: !(await this.students.existsByEnrollmentNumber(enrollmentNumber)),
    };
  }

  private invalid(): RegistrationFieldAvailability {
    return { valid: false, unique: null };
  }
}
