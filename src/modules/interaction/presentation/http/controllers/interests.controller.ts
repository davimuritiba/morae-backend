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
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { AddInterestUseCase } from '../../../application/use-cases/add-interest/add-interest.use-case.js';
import { GetMyInterestUseCase } from '../../../application/use-cases/get-my-interest/get-my-interest.use-case.js';
import { ListInterestedUsersUseCase } from '../../../application/use-cases/list-interested-users/list-interested-users.use-case.js';
import { ListReceivedInterestsUseCase } from '../../../application/use-cases/list-received-interests/list-received-interests.use-case.js';
import { RemoveInterestUseCase } from '../../../application/use-cases/remove-interest/remove-interest.use-case.js';
import { UpdateInterestStatusUseCase } from '../../../application/use-cases/update-interest-status/update-interest-status.use-case.js';
import { UpdateInterestStatusDto } from '../dto/update-interest-status.dto.js';

@Controller('interests')
@UseGuards(JwtAuthGuard)
export class InterestsController {
  constructor(
    private readonly addInterest: AddInterestUseCase,
    private readonly removeInterest: RemoveInterestUseCase,
    private readonly listInterestedUsers: ListInterestedUsersUseCase,
    private readonly getMyInterest: GetMyInterestUseCase,
    private readonly listReceivedInterests: ListReceivedInterestsUseCase,
    private readonly updateInterestStatus: UpdateInterestStatusUseCase,
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

  @Get('mine/:listingId')
  getMine(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.getMyInterest.execute({ userId, listingId });
  }

  @Get('received')
  listReceived(@CurrentUserId() ownerUserId: string) {
    return this.listReceivedInterests.execute({ ownerUserId });
  }

  @Get('listings/:listingId')
  list(
    @CurrentUserId() ownerUserId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.listInterestedUsers.execute({ ownerUserId, listingId });
  }

  @Patch('listings/:listingId/:userId/status')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  updateStatus(
    @CurrentUserId() ownerUserId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('userId', ParseUUIDPipe) interestedUserId: string,
    @Body() input: UpdateInterestStatusDto,
  ) {
    return this.updateInterestStatus.execute({
      ownerUserId,
      listingId,
      interestedUserId,
      status: input.status,
    });
  }
}
