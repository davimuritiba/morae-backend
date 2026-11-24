import type { Clock } from '../../../../../shared/application/clock.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  EligibleReviewContract,
  ReviewRepository,
} from '../../../domain/repositories/review.repository.js';

export class ListEligibleReviewContractsUseCase
  implements UseCase<string, EligibleReviewContract[]>
{
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly clock: Clock,
  ) {}

  execute(tenantId: string): Promise<EligibleReviewContract[]> {
    return this.reviews.listEligibleContracts(tenantId, this.clock.now());
  }
}
