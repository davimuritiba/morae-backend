import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { CreateGroupChatUseCase } from '../../../application/use-cases/create-group-chat/create-group-chat.use-case.js';
import { GetChatUseCase } from '../../../application/use-cases/get-chat/get-chat.use-case.js';
import { ListMessagesUseCase } from '../../../application/use-cases/list-messages/list-messages.use-case.js';
import { ListMyChatsUseCase } from '../../../application/use-cases/list-my-chats/list-my-chats.use-case.js';
import { MarkChatAsReadUseCase } from '../../../application/use-cases/mark-chat-as-read/mark-chat-as-read.use-case.js';
import { SendMessageUseCase } from '../../../application/use-cases/send-message/send-message.use-case.js';
import type { StartDirectChatInput } from '../../../application/use-cases/start-direct-chat/start-direct-chat.input.js';
import { StartDirectChatUseCase } from '../../../application/use-cases/start-direct-chat/start-direct-chat.use-case.js';
import { decodeCursor, encodeCursor } from '../cursor.js';
import {
  CreateGroupChatDto,
  PageQueryDto,
  SendMessageDto,
  StartDirectChatDto,
} from '../dtos/chat.dtos.js';
import {
  ChatPresenter,
  type ChatResponse,
  type MessageResponse,
  type PageResponse,
} from '../presenters/chat.presenter.js';

const DEFAULT_PAGE_SIZE = 30;

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(
    private readonly startDirectChat: StartDirectChatUseCase,
    private readonly createGroupChat: CreateGroupChatUseCase,
    private readonly listMyChats: ListMyChatsUseCase,
    private readonly getChat: GetChatUseCase,
    private readonly listMessages: ListMessagesUseCase,
    private readonly sendMessage: SendMessageUseCase,
    private readonly markChatAsRead: MarkChatAsReadUseCase,
  ) {}

  @Post('direct')
  async startDirect(
    @CurrentUserId() actorId: string,
    @Body() dto: StartDirectChatDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ChatResponse> {
    const { targetUserId, listingId } = dto;
    let input: StartDirectChatInput;
    if (targetUserId && !listingId) {
      input = { actorId, targetUserId };
    } else if (listingId && !targetUserId) {
      input = { actorId, listingId };
    } else {
      throw new BadRequestException(
        'Informe targetUserId ou listingId, e apenas um deles.',
      );
    }

    const output = await this.startDirectChat.execute(input);
    response.status(output.created ? HttpStatus.CREATED : HttpStatus.OK);

    return this.chatOf(actorId, output.chatId);
  }

  @Post('groups')
  async createGroup(
    @CurrentUserId() actorId: string,
    @Body() dto: CreateGroupChatDto,
  ): Promise<ChatResponse> {
    const { chatId } = await this.createGroupChat.execute({
      actorId,
      name: dto.name,
      memberIds: dto.memberIds,
    });
    return this.chatOf(actorId, chatId);
  }

  @Get()
  async list(
    @CurrentUserId() actorId: string,
    @Query() query: PageQueryDto,
  ): Promise<PageResponse<ChatResponse>> {
    const cursor = decodeCursor(query.cursor);
    const output = await this.listMyChats.execute({
      actorId,
      before: cursor ? { lastActivityAt: cursor.at, id: cursor.id } : null,
      limit: query.limit ?? DEFAULT_PAGE_SIZE,
    });

    return {
      data: output.chats.map((chat) => ChatPresenter.chat(chat)),
      nextCursor: output.nextCursor
        ? encodeCursor(output.nextCursor.lastActivityAt, output.nextCursor.id)
        : null,
    };
  }

  @Get(':chatId')
  get(
    @CurrentUserId() actorId: string,
    @Param('chatId') chatId: string,
  ): Promise<ChatResponse> {
    return this.chatOf(actorId, chatId);
  }

  @Get(':chatId/messages')
  async messages(
    @CurrentUserId() actorId: string,
    @Param('chatId') chatId: string,
    @Query() query: PageQueryDto,
  ): Promise<PageResponse<MessageResponse>> {
    const cursor = decodeCursor(query.cursor);
    const output = await this.listMessages.execute({
      actorId,
      chatId,
      before: cursor ? { createdAt: cursor.at, id: cursor.id } : null,
      limit: query.limit ?? DEFAULT_PAGE_SIZE,
    });

    return {
      data: output.messages.map((m) => ChatPresenter.message(m)),
      nextCursor: output.nextCursor
        ? encodeCursor(output.nextCursor.createdAt, output.nextCursor.id)
        : null,
    };
  }

  @Post(':chatId/messages')
  async send(
    @CurrentUserId() actorId: string,
    @Param('chatId') chatId: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponse> {
    const output = await this.sendMessage.execute({
      actorId,
      chatId,
      content: dto.content ?? null,
      listingId: dto.listingId ?? null,
    });
    return ChatPresenter.message(output);
  }

  @Post(':chatId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async read(
    @CurrentUserId() actorId: string,
    @Param('chatId') chatId: string,
  ): Promise<void> {
    await this.markChatAsRead.execute({ actorId, chatId });
  }

  private async chatOf(actorId: string, chatId: string): Promise<ChatResponse> {
    return ChatPresenter.chat(await this.getChat.execute({ actorId, chatId }));
  }
}
