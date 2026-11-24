import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Permission } from '../../../../user/domain/enums/permission.enum.js';
import {
  AdminPermissionsGuard,
  RequireAdminPermission,
  RequireAdminPermissions,
} from '../../../../../shared/presentation/guards/admin-permissions.guard.js';
import { ListAdminReportsUseCase } from '../../../application/use-cases/list-admin-reports/list-admin-reports.use-case.js';
import { RemoveReportedListingUseCase } from '../../../application/use-cases/remove-reported-listing/remove-reported-listing.use-case.js';
import { RemoveReportedProfileUseCase } from '../../../application/use-cases/remove-reported-profile/remove-reported-profile.use-case.js';
import { UpdateAdminReportUseCase } from '../../../application/use-cases/update-admin-report/update-admin-report.use-case.js';
import { ListAdminReportsDto } from '../dto/list-admin-reports.dto.js';
import { UpdateAdminReportDto } from '../dto/update-admin-report.dto.js';

@Controller('admin/reports')
@UseGuards(AdminPermissionsGuard)
@RequireAdminPermission(Permission.VIEW_REPORTS)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdminReportsController {
  constructor(
    private readonly listReports: ListAdminReportsUseCase,
    private readonly updateReport: UpdateAdminReportUseCase,
    private readonly removeProfile: RemoveReportedProfileUseCase,
    private readonly removeListing: RemoveReportedListingUseCase,
  ) {}

  @Get()
  list(@Query() query: ListAdminReportsDto) {
    return this.listReports.execute({
      search: query.search,
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 25,
    });
  }

  @Patch(':reportId/status')
  update(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() input: UpdateAdminReportDto,
  ) {
    return this.updateReport.execute({
      reportId,
      status: input.status,
      adminNote: input.adminNote,
    });
  }

  @Post(':reportId/remove-profile')
  @RequireAdminPermissions(Permission.VIEW_REPORTS, Permission.MANAGE_USERS)
  removeReportedProfile(@Param('reportId', ParseUUIDPipe) reportId: string) {
    return this.removeProfile.execute(reportId).then(({ id, status, updatedAt }) => ({
      id,
      status,
      updatedAt,
    }));
  }

  @Post(':reportId/remove-listing')
  @RequireAdminPermissions(Permission.VIEW_REPORTS, Permission.MODERATE_LISTINGS)
  removeReportedListing(@Param('reportId', ParseUUIDPipe) reportId: string) {
    return this.removeListing.execute(reportId).then(({ id, status, updatedAt }) => ({
      id,
      status,
      updatedAt,
    }));
  }
}
