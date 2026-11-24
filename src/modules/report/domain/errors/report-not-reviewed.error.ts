import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ReportNotReviewedError extends DomainError {
  readonly code = 'REPORT_NOT_REVIEWED';

  constructor() {
    super('A denúncia precisa estar em análise antes de uma remoção.');
  }
}
