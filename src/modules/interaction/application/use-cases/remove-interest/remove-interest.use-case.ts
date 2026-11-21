import type { UseCase } from '../../../../../shared/application/use-case.js';
import type { InterestRepository } from '../../../domain/repositories/interest.repository.js';

export interface RemoveInterestInput {
  userId: string;
  listingId: string;
}

export class RemoveInterestUseCase implements UseCase<RemoveInterestInput, void> {
  constructor(private readonly interests: InterestRepository) {}

  execute(input: RemoveInterestInput): Promise<void> {
    return this.interests.remove(input.userId, input.listingId);
  }
}
