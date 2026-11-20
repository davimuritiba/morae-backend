import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { AddInterestUseCase } from '../../../application/use-cases/add-interest/add-interest.use-case.js';
import { ListInterestedUsersUseCase } from '../../../application/use-cases/list-interested-users/list-interested-users.use-case.js';
import { RemoveInterestUseCase } from '../../../application/use-cases/remove-interest/remove-interest.use-case.js';

@Controller('interests')
@UseGuards(JwtAuthGuard)
export class InterestsController {
  constructor(
    private readonly addInterest: AddInterestUseCase,
    private readonly removeInterest: RemoveInterestUseCase,
    private readonly listInterestedUsers: ListInterestedUsersUseCase,
  ) {}

  @Put(':listingId')
  add(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.addInterest.execute({ userId, listingId });
  }

  @Delete(':listingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ): Promise<void> {
    return this.removeInterest.execute({ userId, listingId });
  }

  @Get('listings/:listingId')
  list(
    @CurrentUserId() ownerUserId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.listInterestedUsers.execute({ ownerUserId, listingId });
  }
}
