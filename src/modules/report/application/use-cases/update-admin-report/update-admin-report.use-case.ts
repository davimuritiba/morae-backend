import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  ReportRecord,
  ReportRepository,
  UpdateReportInput,
} from '../../../domain/repositories/report.repository.js';

export class UpdateAdminReportUseCase implements UseCase<
  { reportId: string } & UpdateReportInput,
  ReportRecord
> {
  constructor(private readonly reports: ReportRepository) {}

  execute(input: { reportId: string } & UpdateReportInput): Promise<ReportRecord> {
    return this.reports.update(input.reportId, {
      status: input.status,
      adminNote: input.adminNote,
    });
  }
}
