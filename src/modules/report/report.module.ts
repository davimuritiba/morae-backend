import { Module } from '@nestjs/common';
import { CreateReportUseCase } from './application/use-cases/create-report/create-report.use-case.js';
import { ListAdminReportsUseCase } from './application/use-cases/list-admin-reports/list-admin-reports.use-case.js';
import { RemoveReportedListingUseCase } from './application/use-cases/remove-reported-listing/remove-reported-listing.use-case.js';
import { RemoveReportedProfileUseCase } from './application/use-cases/remove-reported-profile/remove-reported-profile.use-case.js';
import { UpdateAdminReportUseCase } from './application/use-cases/update-admin-report/update-admin-report.use-case.js';
import { ReportRepository } from './domain/repositories/report.repository.js';
import { PrismaReportRepository } from './infra/persistence/repositories/prisma-report.repository.js';
import { AdminReportsController } from './presentation/http/controllers/admin-reports.controller.js';
import { ReportsController } from './presentation/http/controllers/reports.controller.js';

@Module({
  controllers: [ReportsController, AdminReportsController],
  providers: [
    { provide: ReportRepository, useClass: PrismaReportRepository },
    {
      provide: CreateReportUseCase,
      useFactory: (reports: ReportRepository) => new CreateReportUseCase(reports),
      inject: [ReportRepository],
    },
    {
      provide: ListAdminReportsUseCase,
      useFactory: (reports: ReportRepository) => new ListAdminReportsUseCase(reports),
      inject: [ReportRepository],
    },
    {
      provide: UpdateAdminReportUseCase,
      useFactory: (reports: ReportRepository) => new UpdateAdminReportUseCase(reports),
      inject: [ReportRepository],
    },
    {
      provide: RemoveReportedProfileUseCase,
      useFactory: (reports: ReportRepository) => new RemoveReportedProfileUseCase(reports),
      inject: [ReportRepository],
    },
    {
      provide: RemoveReportedListingUseCase,
      useFactory: (reports: ReportRepository) => new RemoveReportedListingUseCase(reports),
      inject: [ReportRepository],
    },
  ],
})
export class ReportModule {}