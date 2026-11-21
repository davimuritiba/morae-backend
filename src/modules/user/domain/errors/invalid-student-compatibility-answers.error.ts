import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidStudentCompatibilityAnswersError extends DomainError {
  readonly code = 'INVALID_STUDENT_COMPATIBILITY_ANSWERS';

  constructor() {
    super('As respostas de convivência do estudante são inválidas.');
  }
}
