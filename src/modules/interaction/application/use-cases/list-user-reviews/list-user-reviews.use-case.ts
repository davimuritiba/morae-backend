import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  ReviewRepository,
  ReviewsForUser,
} from '../../../domain/repositories/review.repository.js';

export class ListUserReviewsUseCase implements UseCase<string, ReviewsForUser> {
  constructor(private readonly reviews: ReviewRepository) {}

  execute(reviewedUserId: string): Promise<ReviewsForUser> {
    return this.reviews.listForUser(reviewedUserId);
  }
}
