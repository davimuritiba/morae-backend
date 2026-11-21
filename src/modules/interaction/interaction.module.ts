import { Module } from '@nestjs/common';
import { Clock } from '../../shared/application/clock.js';
import { Logger } from '../../shared/application/logger.js';
import { UnitOfWork } from '../../shared/application/unit-of-work.js';
import { NestLoggerAdapter } from '../../shared/infra/nest-logger.js';
import { SystemClock } from '../../shared/infra/system-clock.js';
import { ChatInboxQuery } from './application/ports/chat-inbox.query.js';
import { ChatNotifier } from './application/ports/chat-notifier.port.js';
import { ChatUserDirectory } from './application/ports/chat-user-directory.port.js';
import { ListingDirectory } from './application/ports/listing-directory.port.js';
import { CreateGroupChatUseCase } from './application/use-cases/create-group-chat/create-group-chat.use-case.js';
import { GetChatUseCase } from './application/use-cases/get-chat/get-chat.use-case.js';
import { ListMessagesUseCase } from './application/use-cases/list-messages/list-messages.use-case.js';
import { ListMyChatsUseCase } from './application/use-cases/list-my-chats/list-my-chats.use-case.js';
import { MarkChatAsReadUseCase } from './application/use-cases/mark-chat-as-read/mark-chat-as-read.use-case.js';
import { SendMessageUseCase } from './application/use-cases/send-message/send-message.use-case.js';
import { StartDirectChatUseCase } from './application/use-cases/start-direct-chat/start-direct-chat.use-case.js';
import { ChatRepository } from './domain/repositories/chat.repository.js';
import { MessageRepository } from './domain/repositories/message.repository.js';
import { FavoriteRepository } from './domain/repositories/favorite.repository.js';
import { InterestRepository } from './domain/repositories/interest.repository.js';
import { PrismaChatInboxQuery } from './infra/persistence/queries/prisma-chat-inbox.query.js';
import { PrismaChatRepository } from './infra/persistence/repositories/prisma-chat.repository.js';
import { PrismaMessageRepository } from './infra/persistence/repositories/prisma-message.repository.js';
import { PrismaFavoriteRepository } from './infra/persistence/repositories/prisma-favorite.repository.js';
import { PrismaInterestRepository } from './infra/persistence/repositories/prisma-interest.repository.js';
import { PrismaChatUserDirectory } from './infra/services/prisma-chat-user-directory.js';
import { PrismaListingDirectory } from './infra/services/prisma-listing-directory.js';
import { ChatsController } from './presentation/http/controllers/chats.controller.js';
import { FavoritesController } from './presentation/http/controllers/favorites.controller.js';
import { AddFavoriteUseCase } from './application/use-cases/add-favorite/add-favorite.use-case.js';
import { ListFavoritesUseCase } from './application/use-cases/list-favorites/list-favorites.use-case.js';
import { RemoveFavoriteUseCase } from './application/use-cases/remove-favorite/remove-favorite.use-case.js';
import { AddInterestUseCase } from './application/use-cases/add-interest/add-interest.use-case.js';
import { RemoveInterestUseCase } from './application/use-cases/remove-interest/remove-interest.use-case.js';
import { ListInterestedUsersUseCase } from './application/use-cases/list-interested-users/list-interested-users.use-case.js';
import { InterestsController } from './presentation/http/controllers/interests.controller.js';
import { ChatGateway } from './presentation/ws/chat.gateway.js';
import { SocketChatNotifier } from './presentation/ws/socket-chat-notifier.js';

@Module({
  controllers: [ChatsController, FavoritesController, InterestsController],
  providers: [
    { provide: ChatRepository, useClass: PrismaChatRepository },
    { provide: MessageRepository, useClass: PrismaMessageRepository },
    { provide: FavoriteRepository, useClass: PrismaFavoriteRepository },
    { provide: InterestRepository, useClass: PrismaInterestRepository },
    { provide: ChatInboxQuery, useClass: PrismaChatInboxQuery },
    { provide: ChatUserDirectory, useClass: PrismaChatUserDirectory },
    { provide: ListingDirectory, useClass: PrismaListingDirectory },
    {
      provide: ListFavoritesUseCase,
      useFactory: (favorites: FavoriteRepository) => new ListFavoritesUseCase(favorites),
      inject: [FavoriteRepository],
    },
    {
      provide: AddFavoriteUseCase,
      useFactory: (favorites: FavoriteRepository) => new AddFavoriteUseCase(favorites),
      inject: [FavoriteRepository],
    },
    {
      provide: RemoveFavoriteUseCase,
      useFactory: (favorites: FavoriteRepository) => new RemoveFavoriteUseCase(favorites),
      inject: [FavoriteRepository],
    },
    {
      provide: AddInterestUseCase,
      useFactory: (interests: InterestRepository) => new AddInterestUseCase(interests),
      inject: [InterestRepository],
    },
    {
      provide: RemoveInterestUseCase,
      useFactory: (interests: InterestRepository) => new RemoveInterestUseCase(interests),
      inject: [InterestRepository],
    },
    {
      provide: ListInterestedUsersUseCase,
      useFactory: (interests: InterestRepository) =>
        new ListInterestedUsersUseCase(interests),
      inject: [InterestRepository],
    },
    ChatGateway,
    { provide: ChatNotifier, useClass: SocketChatNotifier },
    { provide: Clock, useClass: SystemClock },
    {
      provide: Logger,
      useFactory: () => new NestLoggerAdapter('InteractionModule'),
    },

    {
      provide: StartDirectChatUseCase,
      useFactory: (
        chats: ChatRepository,
        users: ChatUserDirectory,
        listings: ListingDirectory,
        clock: Clock,
      ) => new StartDirectChatUseCase(chats, users, listings, clock),
      inject: [ChatRepository, ChatUserDirectory, ListingDirectory, Clock],
    },
    {
      provide: CreateGroupChatUseCase,
      useFactory: (
        chats: ChatRepository,
        users: ChatUserDirectory,
        clock: Clock,
      ) => new CreateGroupChatUseCase(chats, users, clock),
      inject: [ChatRepository, ChatUserDirectory, Clock],
    },
    {
      provide: ListMyChatsUseCase,
      useFactory: (inbox: ChatInboxQuery, users: ChatUserDirectory) =>
        new ListMyChatsUseCase(inbox, users),
      inject: [ChatInboxQuery, ChatUserDirectory],
    },
    {
      provide: GetChatUseCase,
      useFactory: (inbox: ChatInboxQuery, users: ChatUserDirectory) =>
        new GetChatUseCase(inbox, users),
      inject: [ChatInboxQuery, ChatUserDirectory],
    },
    {
      provide: ListMessagesUseCase,
      useFactory: (
        chats: ChatRepository,
        messages: MessageRepository,
        users: ChatUserDirectory,
      ) => new ListMessagesUseCase(chats, messages, users),
      inject: [ChatRepository, MessageRepository, ChatUserDirectory],
    },
    {
      provide: SendMessageUseCase,
      useFactory: (
        chats: ChatRepository,
        messages: MessageRepository,
        users: ChatUserDirectory,
        listings: ListingDirectory,
        notifier: ChatNotifier,
        clock: Clock,
        unitOfWork: UnitOfWork,
        logger: Logger,
      ) =>
        new SendMessageUseCase(
          chats,
          messages,
          users,
          listings,
          notifier,
          clock,
          unitOfWork,
          logger,
        ),
      inject: [
        ChatRepository,
        MessageRepository,
        ChatUserDirectory,
        ListingDirectory,
        ChatNotifier,
        Clock,
        UnitOfWork,
        Logger,
      ],
    },
    {
      provide: MarkChatAsReadUseCase,
      useFactory: (
        chats: ChatRepository,
        users: ChatUserDirectory,
        notifier: ChatNotifier,
        clock: Clock,
        logger: Logger,
      ) => new MarkChatAsReadUseCase(chats, users, notifier, clock, logger),
      inject: [ChatRepository, ChatUserDirectory, ChatNotifier, Clock, Logger],
    },
  ],
})
export class InteractionModule {}
