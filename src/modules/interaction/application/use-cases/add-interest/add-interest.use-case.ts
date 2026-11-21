import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  InterestReceipt,
  InterestRepository,
} from '../../../domain/repositories/interest.repository.js';

export interface AddInterestInput {
  userId: string;
  listingId: string;
}

export class AddInterestUseCase implements UseCase<AddInterestInput, InterestReceipt> {
  constructor(private readonly interests: InterestRepository) {}

  execute(input: AddInterestInput): Promise<InterestReceipt> {
    return this.interests.add(input.userId, input.listingId);
  }
}
