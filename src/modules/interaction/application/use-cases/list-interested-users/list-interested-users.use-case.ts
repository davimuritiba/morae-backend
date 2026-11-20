import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  InterestedUserView,
  InterestRepository,
} from '../../../domain/repositories/interest.repository.js';

export interface ListInterestedUsersInput {
  ownerUserId: string;
  listingId: string;
}

export interface ListInterestedUsersOutput {
  items: InterestedUserView[];
}

export class ListInterestedUsersUseCase
  implements UseCase<ListInterestedUsersInput, ListInterestedUsersOutput>
{
  constructor(private readonly interests: InterestRepository) {}

  async execute(input: ListInterestedUsersInput): Promise<ListInterestedUsersOutput> {
    return {
      items: await this.interests.listForListing(input.ownerUserId, input.listingId),
    };
  }
}
