import type { Clock } from '../../../../../shared/application/clock.js';
import type { Logger } from '../../../../../shared/application/logger.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import { Message } from '../../../domain/entities/message.entity.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import type { ChatRepository } from '../../../domain/repositories/chat.repository.js';
import type { MessageRepository } from '../../../domain/repositories/message.repository.js';
import { MessageContent } from '../../../domain/value-objects/message-content.vo.js';
import {
  ensureCanChat,
  findChatOfParticipant,
} from '../../policies/chat-access.policy.js';
import type { ChatNotifier } from '../../ports/chat-notifier.port.js';
import type { ChatUserDirectory } from '../../ports/chat-user-directory.port.js';
import type { ListingDirectory } from '../../ports/listing-directory.port.js';
import { toMessageView } from '../../views/message.view.js';
import type { SendMessageInput } from './send-message.input.js';
import type { SendMessageOutput } from './send-message.output.js';

export class SendMessageUseCase implements UseCase<
  SendMessageInput,
  SendMessageOutput
> {
  constructor(
    private readonly chats: ChatRepository,
    private readonly messages: MessageRepository,
    private readonly users: ChatUserDirectory,
    private readonly listings: ListingDirectory,
    private readonly notifier: ChatNotifier,
    private readonly clock: Clock,
    private readonly unitOfWork: UnitOfWork,
    private readonly logger: Logger,
  ) {}

  async execute(input: SendMessageInput): Promise<SendMessageOutput> {
    await ensureCanChat(this.users, input.actorId);

    const chat = await findChatOfParticipant(
      this.chats,
      input.chatId,
      input.actorId,
    );

    const content = input.content?.trim()
      ? MessageContent.create(input.content)
      : null;

    if (input.listingId) {
      const listing = await this.listings.findApprovedById(input.listingId);
      if (!listing) {
        throw new ListingNotFoundError();
      }
    }

    const message = Message.create({
      chatId: chat.id,
      senderId: input.actorId,
      content,
      listingId: input.listingId,
      sentAt: this.clock.now(),
    });
    chat.registerMessage(message);

    await this.unitOfWork.run(async () => {
      await this.messages.save(message);
      await this.chats.save(chat);
    });

    const view = toMessageView(message);
    const recipientIds = chat.participants
      .map((p) => p.userId)
      .filter((id) => id !== input.actorId);

    try {
      await this.notifier.notifyNewMessage(view, recipientIds);
    } catch (error) {
      this.logger.error(
        `Falha ao notificar a mensagem ${message.id} da conversa ${chat.id}.`,
        error,
      );
    }

    return view;
  }
}
