import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidPropertyFieldError extends DomainError {
  readonly code: string;

  constructor(field: string, message: string) {
    super(message);
    this.code = `PROPERTY_INVALID_${field.toUpperCase()}`;
  }
}
