import { InMemoryUnitOfWork } from '../../../../../shared/infra/database/in-memory-unit-of-work.js';
import { FakeLogger } from '../../../../../shared/test/fakes/fake-logger.js';
import { FixedClock } from '../../../../../shared/test/fakes/fixed-clock.js';
import { SendMessageUseCase } from '../../../application/use-cases/send-message/send-message.use-case.js';
import type { SendMessageInput } from '../../../application/use-cases/send-message/send-message.input.js';
import { Chat } from '../../../domain/entities/chat.entity.js';
import { ChatNotFoundError } from '../../../domain/errors/chat-not-found.error.js';
import { EmailNotVerifiedError } from '../../../domain/errors/email-not-verified.error.js';
import { EmptyMessageError } from '../../../domain/errors/empty-message.error.js';
import { InvalidMessageContentError } from '../../../domain/errors/invalid-message-content.error.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import { GroupName } from '../../../domain/value-objects/group-name.vo.js';
import { InMemoryChatRepository } from '../../../infra/persistence/in-memory/in-memory-chat.repository.js';
import { InMemoryMessageRepository } from '../../../infra/persistence/in-memory/in-memory-message.repository.js';
import { FakeChatNotifier } from '../../fakes/fake-chat-notifier.js';
import { FakeChatUserDirectory } from '../../fakes/fake-chat-user-directory.js';
import { FakeListingDirectory } from '../../fakes/fake-listing-directory.js';

const ANA = 'aaaaaaaa-0000-4000-8000-000000000001';
const BRUNO = 'bbbbbbbb-0000-4000-8000-000000000002';
const CARLA = 'cccccccc-0000-4000-8000-000000000003';
const OUTSIDER = 'dddddddd-0000-4000-8000-000000000004';
const LISTING_ID = '9a7e4c2b-1d3f-4b8a-a6c5-2e0f9d8b7a61';
const CREATED_AT = new Date('2026-11-17T09:00:00.000Z');
const NOW = new Date('2026-11-17T10:00:00.000Z');

describe('SendMessageUseCase', () => {
  let chats: InMemoryChatRepository;
  let messages: InMemoryMessageRepository;
  let users: FakeChatUserDirectory;
  let listings: FakeListingDirectory;
  let notifier: FakeChatNotifier;
  let logger: FakeLogger;
  let sut: SendMessageUseCase;
  let chat: Chat;

  function input(overrides: Partial<SendMessageInput> = {}): SendMessageInput {
    return {
      actorId: ANA,
      chatId: chat.id,
      content: 'Oi, tudo bem?',
      listingId: null,
      ...overrides,
    };
  }

  beforeEach(async () => {
    chats = new InMemoryChatRepository();
    messages = new InMemoryMessageRepository();
    users = new FakeChatUserDirectory();
    listings = new FakeListingDirectory();
    notifier = new FakeChatNotifier();
    logger = new FakeLogger();
    sut = new SendMessageUseCase(
      chats,
      messages,
      users,
      listings,
      notifier,
      new FixedClock(NOW),
      new InMemoryUnitOfWork(),
      logger,
    );

    users.add({ id: ANA });
    users.add({ id: BRUNO });
    users.add({ id: OUTSIDER });
    chat = Chat.createDirect({
      userId: ANA,
      otherUserId: BRUNO,
      now: CREATED_AT,
    });
    await chats.save(chat);
  });

  it('salva a mensagem e atualiza a conversa', async () => {
    const output = await sut.execute(input());

    expect(messages.items).toHaveLength(1);
    const saved = messages.items[0];
    expect(output).toEqual({
      id: saved.id,
      chatId: chat.id,
      senderId: ANA,
      content: 'Oi, tudo bem?',
      listingId: null,
      createdAt: NOW,
    });

    const updated = await chats.findById(chat.id);
    expect(updated?.lastMessageAt).toEqual(NOW);
    expect(updated?.findParticipant(ANA)?.lastReadAt).toEqual(NOW);
    expect(updated?.findParticipant(BRUNO)?.lastReadAt).toBeNull();
  });

  it('apara o texto', async () => {
    const output = await sut.execute(input({ content: '  Oi  ' }));

    expect(output.content).toBe('Oi');
  });

  it('notifica os outros participantes', async () => {
    await sut.execute(input());

    expect(notifier.notified).toHaveLength(1);
    expect(notifier.notified[0].message.id).toBe(messages.items[0].id);
    expect(notifier.notified[0].recipientIds).toEqual([BRUNO]);
  });

  it('notifica todos os membros do grupo menos o remetente', async () => {
    users.add({ id: CARLA });
    const group = Chat.createGroup({
      creatorId: ANA,
      name: GroupName.create('República'),
      memberIds: [BRUNO, CARLA],
      now: CREATED_AT,
    });
    await chats.save(group);

    await sut.execute(input({ actorId: BRUNO, chatId: group.id }));

    expect(notifier.notified[0].recipientIds).toEqual([ANA, CARLA]);
  });

  describe('anúncio', () => {
    beforeEach(() => {
      listings.add({ id: LISTING_ID, ownerUserId: BRUNO });
    });

    it('envia texto com anúncio', async () => {
      const output = await sut.execute(input({ listingId: LISTING_ID }));

      expect(output.content).toBe('Oi, tudo bem?');
      expect(output.listingId).toBe(LISTING_ID);
    });

    it.each([null, '', '   '])(
      'envia só o anúncio quando o texto é %j',
      async (content) => {
        const output = await sut.execute(
          input({ content, listingId: LISTING_ID }),
        );

        expect(output.content).toBeNull();
        expect(output.listingId).toBe(LISTING_ID);
      },
    );

    it('recusa anúncio inexistente ou não aprovado', async () => {
      await expect(sut.execute(input({ listingId: OUTSIDER }))).rejects.toThrow(
        ListingNotFoundError,
      );
      expect(messages.items).toHaveLength(0);
    });
  });

  it.each([null, '', '   '])(
    'recusa mensagem sem anúncio e com texto %j',
    async (content) => {
      await expect(sut.execute(input({ content }))).rejects.toThrow(
        EmptyMessageError,
      );
      expect(messages.items).toHaveLength(0);
    },
  );

  it('recusa texto longo demais', async () => {
    await expect(
      sut.execute(input({ content: 'a'.repeat(2001) })),
    ).rejects.toThrow(InvalidMessageContentError);
  });

  it.each([
    ['conversa inexistente', () => input({ chatId: OUTSIDER })],
    ['quem não participa', () => input({ actorId: OUTSIDER })],
  ])('responde conversa não encontrada para %s', async (_case, make) => {
    await expect(sut.execute(make())).rejects.toThrow(ChatNotFoundError);
    expect(messages.items).toHaveLength(0);
  });

  it('exige e-mail verificado do remetente', async () => {
    users.add({ id: ANA, emailVerified: false });

    await expect(sut.execute(input())).rejects.toThrow(EmailNotVerifiedError);
    expect(messages.items).toHaveLength(0);
  });

  it('mantém a mensagem salva quando a notificação falha', async () => {
    const failure = new Error('socket fora do ar');
    notifier.failWith = failure;

    const output = await sut.execute(input());

    expect(messages.items.map((m) => m.id)).toEqual([output.id]);
    expect(logger.errors).toHaveLength(1);
    expect(logger.errors[0].error).toBe(failure);
  });
});
