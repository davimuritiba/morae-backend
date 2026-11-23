import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ReportSelfActionError extends DomainError {
  readonly code = 'REPORT_SELF_ACTION';

  constructor() {
    super('Não é possível denunciar a própria conta ou anúncio.');
  }
}
