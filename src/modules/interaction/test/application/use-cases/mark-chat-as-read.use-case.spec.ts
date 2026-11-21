import { FakeLogger } from '../../../../../shared/test/fakes/fake-logger.js';
import { FixedClock } from '../../../../../shared/test/fakes/fixed-clock.js';
import { MarkChatAsReadUseCase } from '../../../application/use-cases/mark-chat-as-read/mark-chat-as-read.use-case.js';
import { Chat } from '../../../domain/entities/chat.entity.js';
import { ChatNotFoundError } from '../../../domain/errors/chat-not-found.error.js';
import { InMemoryChatRepository } from '../../../infra/persistence/in-memory/in-memory-chat.repository.js';
import { FakeChatNotifier } from '../../fakes/fake-chat-notifier.js';
import { FakeChatUserDirectory } from '../../fakes/fake-chat-user-directory.js';

const ANA = 'aaaaaaaa-0000-4000-8000-000000000001';
const BRUNO = 'bbbbbbbb-0000-4000-8000-000000000002';
const OUTSIDER = 'dddddddd-0000-4000-8000-000000000004';
const CREATED_AT = new Date('2026-11-17T09:00:00.000Z');
const NOW = new Date('2026-11-17T10:00:00.000Z');

describe('MarkChatAsReadUseCase', () => {
  let chats: InMemoryChatRepository;
  let notifier: FakeChatNotifier;
  let logger: FakeLogger;
  let sut: MarkChatAsReadUseCase;
  let chat: Chat;

  beforeEach(async () => {
    chats = new InMemoryChatRepository();
    const users = new FakeChatUserDirectory();
    notifier = new FakeChatNotifier();
    logger = new FakeLogger();
    sut = new MarkChatAsReadUseCase(
      chats,
      users,
      notifier,
      new FixedClock(NOW),
      logger,
    );

    for (const id of [ANA, BRUNO, OUTSIDER]) users.add({ id });
    chat = Chat.createDirect({
      userId: ANA,
      otherUserId: BRUNO,
      now: CREATED_AT,
    });
    await chats.save(chat);
  });

  it('registra a leitura e avisa os outros participantes', async () => {
    await sut.execute({ actorId: BRUNO, chatId: chat.id });

    const saved = await chats.findById(chat.id);
    expect(saved?.findParticipant(BRUNO)?.lastReadAt).toEqual(NOW);
    expect(notifier.reads).toEqual([
      {
        event: { chatId: chat.id, userId: BRUNO, readAt: NOW },
        recipientIds: [ANA],
      },
    ]);
  });

  it('recusa quem não participa', async () => {
    await expect(
      sut.execute({ actorId: OUTSIDER, chatId: chat.id }),
    ).rejects.toThrow(ChatNotFoundError);
  });

  it('mantém a leitura quando a notificação falha', async () => {
    notifier.failWith = new Error('socket fora do ar');

    await sut.execute({ actorId: BRUNO, chatId: chat.id });

    const saved = await chats.findById(chat.id);
    expect(saved?.findParticipant(BRUNO)?.lastReadAt).toEqual(NOW);
    expect(logger.errors).toHaveLength(1);
  });
});
