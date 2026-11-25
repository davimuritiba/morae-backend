import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  InterestRepository,
  ReceivedInterestView,
} from '../../../domain/repositories/interest.repository.js';

<<<<<<< HEAD
export interface ListReceivedInterestsInput {
  ownerUserId: string;
}

=======
>>>>>>> d7b741c (fix(interests): listar manifestações para anunciantes)
export interface ListReceivedInterestsOutput {
  items: ReceivedInterestView[];
}

export class ListReceivedInterestsUseCase
<<<<<<< HEAD
  implements UseCase<ListReceivedInterestsInput, ListReceivedInterestsOutput>
{
  constructor(private readonly interests: InterestRepository) {}

  async execute(input: ListReceivedInterestsInput): Promise<ListReceivedInterestsOutput> {
    return { items: await this.interests.listForOwner(input.ownerUserId) };
=======
  implements UseCase<{ ownerUserId: string }, ListReceivedInterestsOutput>
{
  constructor(private readonly interests: InterestRepository) {}

  async execute(input: { ownerUserId: string }): Promise<ListReceivedInterestsOutput> {
    return { items: await this.interests.listReceived(input.ownerUserId) };
>>>>>>> d7b741c (fix(interests): listar manifestações para anunciantes)
  }
}
