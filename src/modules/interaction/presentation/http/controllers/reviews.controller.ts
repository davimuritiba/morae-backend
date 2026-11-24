import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { ListEligibleReviewContractsUseCase } from '../../../application/use-cases/list-eligible-review-contracts/list-eligible-review-contracts.use-case.js';
import { ListUserReviewsUseCase } from '../../../application/use-cases/list-user-reviews/list-user-reviews.use-case.js';
import { SubmitReviewUseCase } from '../../../application/use-cases/submit-review/submit-review.use-case.js';
import { SubmitReviewDto } from '../dto/submit-review.dto.js';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly submitReview: SubmitReviewUseCase,
    private readonly listUserReviews: ListUserReviewsUseCase,
    private readonly listEligibleContracts: ListEligibleReviewContractsUseCase,
  ) {}

  @Get('users/:userId')
  listForUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.listUserReviews.execute(userId);
  }

  @Get('eligible-contracts')
  @UseGuards(JwtAuthGuard)
  listEligible(@CurrentUserId() userId: string) {
    return this.listEligibleContracts.execute(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  submit(
    @CurrentUserId() userId: string,
    @Body() input: SubmitReviewDto,
  ) {
    return this.submitReview.execute({
      reviewerId: userId,
      contractId: input.contractId,
      cleanliness: input.cleanliness,
      condition: input.condition,
      location: input.location,
      communication: input.communication,
      value: input.value,
      overall: input.overall,
      comment: input.comment,
    });
  }
}
