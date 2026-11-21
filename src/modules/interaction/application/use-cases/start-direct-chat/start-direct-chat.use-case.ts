import type { Clock } from '../../../../../shared/application/clock.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import { Chat } from '../../../domain/entities/chat.entity.js';
import { CannotChatWithYourselfError } from '../../../domain/errors/cannot-chat-with-yourself.error.js';
import { ChatUserUnavailableError } from '../../../domain/errors/chat-user-unavailable.error.js';
import { DirectChatAlreadyExistsError } from '../../../domain/errors/direct-chat-already-exists.error.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import type { ChatRepository } from '../../../domain/repositories/chat.repository.js';
import {
  ensureCanChat,
  isReachable,
} from '../../policies/chat-access.policy.js';
import type { ChatUserDirectory } from '../../ports/chat-user-directory.port.js';
import type { ListingDirectory } from '../../ports/listing-directory.port.js';
import type { StartDirectChatInput } from './start-direct-chat.input.js';
import type { StartDirectChatOutput } from './start-direct-chat.output.js';

export class StartDirectChatUseCase implements UseCase<
  StartDirectChatInput,
  StartDirectChatOutput
> {
  constructor(
    private readonly chats: ChatRepository,
    private readonly users: ChatUserDirectory,
    private readonly listings: ListingDirectory,
    private readonly clock: Clock,
  ) {}

  async execute(input: StartDirectChatInput): Promise<StartDirectChatOutput> {
    await ensureCanChat(this.users, input.actorId);

    const targetUserId = await this.resolveTargetUserId(input);
    if (targetUserId === input.actorId) {
      throw new CannotChatWithYourselfError();
    }

    const target = await this.users.findById(targetUserId);
    if (!isReachable(target)) {
      throw new ChatUserUnavailableError();
    }

    const directKey = Chat.directKeyFor(input.actorId, targetUserId);
    const existing = await this.chats.findByDirectKey(directKey);
    if (existing) {
      return { chatId: existing.id, created: false };
    }

    const chat = Chat.createDirect({
      userId: input.actorId,
      otherUserId: targetUserId,
      now: this.clock.now(),
    });

    try {
      await this.chats.save(chat);
    } catch (error) {
      if (!(error instanceof DirectChatAlreadyExistsError)) throw error;
      const winner = await this.chats.findByDirectKey(directKey);
      if (!winner) throw error;
      return { chatId: winner.id, created: false };
    }

    return { chatId: chat.id, created: true };
  }

  private async resolveTargetUserId(
    input: StartDirectChatInput,
  ): Promise<string> {
    if (!('listingId' in input)) {
      return input.targetUserId;
    }

    const listing = await this.listings.findApprovedById(input.listingId);
    if (!listing) {
      throw new ListingNotFoundError();
    }
    return listing.ownerUserId;
  }
}
