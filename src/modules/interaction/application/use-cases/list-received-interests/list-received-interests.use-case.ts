import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  InterestRepository,
  ReceivedInterestView,
} from '../../../domain/repositories/interest.repository.js';

export interface ListReceivedInterestsInput {
  ownerUserId: string;
}
export interface ListReceivedInterestsOutput {
  items: ReceivedInterestView[];
}

export class ListReceivedInterestsUseCase
  implements UseCase<ListReceivedInterestsInput, ListReceivedInterestsOutput>
{
  constructor(private readonly interests: InterestRepository) {}

  async execute(input: ListReceivedInterestsInput): Promise<ListReceivedInterestsOutput> {
    return { items: await this.interests.listForOwner(input.ownerUserId) };
  }
}
