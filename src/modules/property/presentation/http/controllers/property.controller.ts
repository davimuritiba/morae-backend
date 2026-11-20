import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PublishPropertyUseCase } from '../../../application/use-cases/publish-property/publish-property.use-case.js';
import type { PublishPropertyInput } from '../../../application/use-cases/publish-property/publish-property.input.js';
import { SearchListingsUseCase } from '../../../application/use-cases/search-listings/search-listings.use-case.js';
import { SearchListingsDto } from '../dtos/search-listings.dto.js';
import { GetListingUseCase } from '../../../application/use-cases/get-listing/get-listing.use-case.js';

@Controller('properties')
export class PropertyController {
  constructor(
    private readonly publishProperty: PublishPropertyUseCase,
    private readonly searchListings: SearchListingsUseCase,
    private readonly getListing: GetListingUseCase,
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

  @Post()
  publish(@Body() input: PublishPropertyInput): Promise<{ propertyId: string; listingId: string }> {
    return this.publishProperty.execute(input);
  }
}
