import type { UseCase } from '../../../../../shared/application/use-case.js';
import type { ReportRecord, ReportRepository } from '../../../domain/repositories/report.repository.js';

export class RemoveReportedListingUseCase implements UseCase<string, ReportRecord> {
  constructor(private readonly reports: ReportRepository) {}

  execute(reportId: string): Promise<ReportRecord> {
    return this.reports.removeReportedListing(reportId);
  }
}
