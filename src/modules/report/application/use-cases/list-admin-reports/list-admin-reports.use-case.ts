import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  AdminReportPage,
  AdminReportQuery,
  ReportRepository,
} from '../../../domain/repositories/report.repository.js';

export class ListAdminReportsUseCase implements UseCase<AdminReportQuery, AdminReportPage> {
  constructor(private readonly reports: ReportRepository) {}

  execute(input: AdminReportQuery): Promise<AdminReportPage> {
    return this.reports.findPage({ ...input, search: input.search?.trim() || undefined });
  }
}
