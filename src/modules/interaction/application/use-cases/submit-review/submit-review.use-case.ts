import type { Clock } from '../../../../../shared/application/clock.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  ReviewRepository,
  ReviewView,
  SubmitReviewData,
} from '../../../domain/repositories/review.repository.js';

export interface SubmitReviewInput extends SubmitReviewData {
  reviewerId: string;
}

export class SubmitReviewUseCase
  implements UseCase<SubmitReviewInput, ReviewView>
{
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly clock: Clock,
  ) {}

  execute(input: SubmitReviewInput): Promise<ReviewView> {
    const { reviewerId, ...review } = input;
    return this.reviews.submit(reviewerId, review, this.clock.now());
  }
}
