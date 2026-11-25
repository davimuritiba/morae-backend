import type { UseCase } from '../../../../../shared/application/use-case.js';
<<<<<<< HEAD
import { InvalidInterestTransitionError } from '../../../domain/errors/invalid-interest-transition.error.js';
import { InterestStatus } from '../../../domain/enums/interest-status.enum.js';
import type {
  InterestReceipt,
  InterestRepository,
=======
import type {
  InterestReceipt,
  InterestRepository,
  InterestStatus,
>>>>>>> d7b741c (fix(interests): listar manifestações para anunciantes)
} from '../../../domain/repositories/interest.repository.js';

export interface UpdateInterestStatusInput {
  ownerUserId: string;
  listingId: string;
  interestedUserId: string;
  status: InterestStatus;
}

export class UpdateInterestStatusUseCase
  implements UseCase<UpdateInterestStatusInput, InterestReceipt>
{
  constructor(private readonly interests: InterestRepository) {}

  execute(input: UpdateInterestStatusInput): Promise<InterestReceipt> {
<<<<<<< HEAD
    if (
      input.status !== InterestStatus.IN_CONVERSATION &&
      input.status !== InterestStatus.ACCEPTED &&
      input.status !== InterestStatus.REJECTED
    ) {
      throw new InvalidInterestTransitionError(InterestStatus.PENDING, input.status);
    }

=======
>>>>>>> d7b741c (fix(interests): listar manifestações para anunciantes)
    return this.interests.updateStatus(
      input.ownerUserId,
      input.listingId,
      input.interestedUserId,
      input.status,
    );
  }
}
