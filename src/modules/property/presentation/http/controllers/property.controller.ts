import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PublishPropertyUseCase } from '../../../application/use-cases/publish-property/publish-property.use-case.js';
import type { PublishPropertyInput } from '../../../application/use-cases/publish-property/publish-property.input.js';
import { SearchListingsUseCase } from '../../../application/use-cases/search-listings/search-listings.use-case.js';
import { SearchListingsDto } from '../dtos/search-listings.dto.js';
import { GetListingUseCase } from '../../../application/use-cases/get-listing/get-listing.use-case.js';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { ManageOwnerListingUseCase } from '../../../application/use-cases/manage-owner-listing/manage-owner-listing.use-case.js';
import { RemoveOwnerListingUseCase } from '../../../application/use-cases/manage-owner-listing/remove-owner-listing.use-case.js';
import { ManageOwnerListingDto } from '../dtos/manage-owner-listing.dto.js';

@Controller('properties')
export class PropertyController {
  constructor(
    private readonly publishProperty: PublishPropertyUseCase,
    private readonly searchListings: SearchListingsUseCase,
    private readonly getListing: GetListingUseCase,
    private readonly manageOwnerListing: ManageOwnerListingUseCase,
    private readonly removeOwnerListing: RemoveOwnerListingUseCase,
  ) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  search(@Query() query: SearchListingsDto) {
    return this.searchListings.execute({ location: query.location });
  }

  @Get(':listingId')
  getListingById(@Param('listingId', ParseUUIDPipe) listingId: string) {
    return this.getListing.execute({ listingId });
  }

  @Patch(':listingId/status')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  manageStatus(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() input: ManageOwnerListingDto,
  ) {
    return this.manageOwnerListing.execute({ userId, listingId, status: input.status });
  }

  @Delete(':listingId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ): Promise<void> {
    await this.removeOwnerListing.execute({ userId, listingId });
  }

  @Post()
  publish(@Body() input: PublishPropertyInput): Promise<{ propertyId: string; listingId: string }> {
    return this.publishProperty.execute(input);
  }
}
