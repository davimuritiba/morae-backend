import type { Clock } from '../../../../../shared/application/clock.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import { Chat } from '../../../domain/entities/chat.entity.js';
import { ChatUserUnavailableError } from '../../../domain/errors/chat-user-unavailable.error.js';
import type { ChatRepository } from '../../../domain/repositories/chat.repository.js';
import { GroupName } from '../../../domain/value-objects/group-name.vo.js';
import {
  ensureCanChat,
  isReachable,
} from '../../policies/chat-access.policy.js';
import type { ChatUserDirectory } from '../../ports/chat-user-directory.port.js';
import type { CreateGroupChatInput } from './create-group-chat.input.js';

export interface CreateGroupChatOutput {
  chatId: string;
}

export class CreateGroupChatUseCase implements UseCase<
  CreateGroupChatInput,
  CreateGroupChatOutput
> {
  constructor(
    private readonly chats: ChatRepository,
    private readonly users: ChatUserDirectory,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateGroupChatInput): Promise<CreateGroupChatOutput> {
    await ensureCanChat(this.users, input.actorId);

    const chat = Chat.createGroup({
      creatorId: input.actorId,
      name: GroupName.create(input.name),
      memberIds: input.memberIds,
      now: this.clock.now(),
    });

    const memberIds = chat.participants
      .map((p) => p.userId)
      .filter((id) => id !== input.actorId);
    const members = await this.users.findByIds(memberIds);
    const reachable = new Set(members.filter(isReachable).map((m) => m.id));
    if (memberIds.some((id) => !reachable.has(id))) {
      throw new ChatUserUnavailableError();
    }

    await this.chats.save(chat);
    return { chatId: chat.id };
  }
}
