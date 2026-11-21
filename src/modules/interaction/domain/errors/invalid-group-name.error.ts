import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidGroupNameError extends DomainError {
  readonly code = 'INVALID_GROUP_NAME';

  constructor(maxLength: number) {
    super(
      `O nome do grupo é obrigatório, deve ter no máximo ${maxLength} caracteres e ficar em uma linha.`,
    );
  }
}
