import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PublishPropertyUseCase } from '../../../application/use-cases/publish-property/publish-property.use-case.js';
import type { PublishPropertyInput } from '../../../application/use-cases/publish-property/publish-property.input.js';
import { SearchListingsUseCase } from '../../../application/use-cases/search-listings/search-listings.use-case.js';
import { SearchListingsDto } from '../dtos/search-listings.dto.js';

@Controller('properties')
export class PropertyController {
  constructor(
    private readonly publishProperty: PublishPropertyUseCase,
    private readonly searchListings: SearchListingsUseCase,
  ) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  search(@Query() query: SearchListingsDto) {
    return this.searchListings.execute({ location: query.location });
  }

  @Post()
  publish(@Body() input: PublishPropertyInput): Promise<{ propertyId: string; listingId: string }> {
    return this.publishProperty.execute(input);
  }
}
