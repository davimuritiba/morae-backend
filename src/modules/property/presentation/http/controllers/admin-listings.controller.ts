import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '../../../../../modules/user/domain/enums/permission.enum.js';
import {
  AdminPermissionsGuard,
  RequireAdminPermission,
} from '../../../../../shared/presentation/guards/admin-permissions.guard.js';
import { GetAdminListingUseCase } from '../../../application/use-cases/get-admin-listing/get-admin-listing.use-case.js';
import { ListAdminListingsUseCase } from '../../../application/use-cases/list-admin-listings/list-admin-listings.use-case.js';
import { ModerateAdminListingUseCase } from '../../../application/use-cases/moderate-admin-listing/moderate-admin-listing.use-case.js';
import { ListAdminListingsDto } from '../dtos/list-admin-listings.dto.js';
import { ModerateAdminListingDto } from '../dtos/moderate-admin-listing.dto.js';

@Controller('admin/listings')
@UseGuards(AdminPermissionsGuard)
@RequireAdminPermission(Permission.MODERATE_LISTINGS)
export class AdminListingsController {
  constructor(
    private readonly listListings: ListAdminListingsUseCase,
    private readonly getListing: GetAdminListingUseCase,
    private readonly moderateListing: ModerateAdminListingUseCase,
  ) {}

  @Get()
  list(@Query() query: ListAdminListingsDto) {
    return this.listListings.execute({
      search: query.search,
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 25,
    });
  }

  @Get(':listingId')
  getById(@Param('listingId', ParseUUIDPipe) listingId: string) {
    return this.getListing.execute(listingId);
  }

  @Patch(':listingId/status')
  moderate(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() input: ModerateAdminListingDto,
  ) {
    return this.moderateListing.execute({ listingId, status: input.status });
  }
}
