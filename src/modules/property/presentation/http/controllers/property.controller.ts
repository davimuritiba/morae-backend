import { Body, Controller, Post } from '@nestjs/common';
import { PublishPropertyUseCase } from '../../../application/use-cases/publish-property/publish-property.use-case.js';
import type { PublishPropertyInput } from '../../../application/use-cases/publish-property/publish-property.input.js';

@Controller('properties')
export class PropertyController {
  constructor(private readonly publishProperty: PublishPropertyUseCase) {}

  @Post()
  publish(@Body() input: PublishPropertyInput): Promise<{ propertyId: string; listingId: string }> {
    return this.publishProperty.execute(input);
  }
}
