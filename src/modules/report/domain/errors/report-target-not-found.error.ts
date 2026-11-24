import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ReportTargetNotFoundError extends DomainError {
  readonly code = 'REPORT_TARGET_NOT_FOUND';

  constructor() {
    super('O perfil ou anúncio informado não foi encontrado.');
  }
}
