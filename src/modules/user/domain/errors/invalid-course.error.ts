import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidCourseError extends DomainError {
  readonly code = 'INVALID_COURSE';

  constructor(maxLength: number) {
    super(
      `O curso é obrigatório e deve ter no máximo ${maxLength} caracteres.`,
    );
  }
}
