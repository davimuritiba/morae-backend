import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidReportTargetError extends DomainError {
  readonly code = 'INVALID_REPORT_TARGET';

  constructor() {
    super('Informe um perfil ou anúncio válido para denunciar.');
  }
}
