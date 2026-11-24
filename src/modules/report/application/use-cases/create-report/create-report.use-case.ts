import type { UseCase } from '../../../../../shared/application/use-case.js';
import { InvalidReportTargetError } from '../../../domain/errors/invalid-report-target.error.js';
import { ReportSelfActionError } from '../../../domain/errors/report-self-action.error.js';
import { ReportRepository } from '../../../domain/repositories/report.repository.js';
import type { CreateReportInput, ReportRecord } from '../../../domain/repositories/report.repository.js';

export class CreateReportUseCase implements UseCase<
  { reporterId: string } & CreateReportInput,
  ReportRecord
> {
  constructor(private readonly reports: ReportRepository) {}

  execute(input: { reporterId: string } & CreateReportInput): Promise<ReportRecord> {
    const hasUserTarget = Boolean(input.targetUserId);
    const hasListingTarget = Boolean(input.listingId);
    if (hasUserTarget === hasListingTarget) throw new InvalidReportTargetError();
    if (input.targetUserId === input.reporterId) throw new ReportSelfActionError();

    return this.reports.create(input.reporterId, {
      targetUserId: input.targetUserId,
      listingId: input.listingId,
      category: input.category,
      description: input.description.trim(),
    });
  }
}
