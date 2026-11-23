import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  InterestRepository,
  MyInterestView,
} from '../../../domain/repositories/interest.repository.js';

export interface GetMyInterestInput {
  userId: string;
  listingId: string;
}

export class GetMyInterestUseCase
  implements UseCase<GetMyInterestInput, MyInterestView | null>
{
  constructor(private readonly interests: InterestRepository) {}

  execute(input: GetMyInterestInput): Promise<MyInterestView | null> {
    return this.interests.findForUser(input.userId, input.listingId);
  }
}
