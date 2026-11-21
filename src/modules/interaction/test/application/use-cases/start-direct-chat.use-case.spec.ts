import { FixedClock } from '../../../../../shared/test/fakes/fixed-clock.js';
import { StartDirectChatUseCase } from '../../../application/use-cases/start-direct-chat/start-direct-chat.use-case.js';
import { Chat } from '../../../domain/entities/chat.entity.js';
import { ChatType } from '../../../domain/enums/chat-type.enum.js';
import { CannotChatWithYourselfError } from '../../../domain/errors/cannot-chat-with-yourself.error.js';
import { ChatAccessDeniedError } from '../../../domain/errors/chat-access-denied.error.js';
import { ChatUserUnavailableError } from '../../../domain/errors/chat-user-unavailable.error.js';
import { EmailNotVerifiedError } from '../../../domain/errors/email-not-verified.error.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import { InMemoryChatRepository } from '../../../infra/persistence/in-memory/in-memory-chat.repository.js';
import { FakeChatUserDirectory } from '../../fakes/fake-chat-user-directory.js';
import { FakeListingDirectory } from '../../fakes/fake-listing-directory.js';

const ANA = 'aaaaaaaa-0000-4000-8000-000000000001';
const BRUNO = 'bbbbbbbb-0000-4000-8000-000000000002';
const UNKNOWN = 'ffffffff-0000-4000-8000-000000000009';
const LISTING_ID = '9a7e4c2b-1d3f-4b8a-a6c5-2e0f9d8b7a61';
const NOW = new Date('2026-11-17T10:00:00.000Z');

describe('StartDirectChatUseCase', () => {
  let chats: InMemoryChatRepository;
  let users: FakeChatUserDirectory;
  let listings: FakeListingDirectory;
  let sut: StartDirectChatUseCase;

  beforeEach(() => {
    chats = new InMemoryChatRepository();
    users = new FakeChatUserDirectory();
    listings = new FakeListingDirectory();
    sut = new StartDirectChatUseCase(
      chats,
      users,
      listings,
      new FixedClock(NOW),
    );

    users.add({ id: ANA });
    users.add({ id: BRUNO });
  });

  describe('com outro usuário', () => {
    it('cria a conversa', async () => {
      const output = await sut.execute({ actorId: ANA, targetUserId: BRUNO });

      expect(output.created).toBe(true);
      expect(chats.items).toHaveLength(1);

      const chat = chats.items[0];
      expect(chat.id).toBe(output.chatId);
      expect(chat.type).toBe(ChatType.DIRECT);
      expect(chat.createdBy).toBe(ANA);
      expect(chat.createdAt).toEqual(NOW);
      expect(chat.participants.map((p) => p.userId)).toEqual([ANA, BRUNO]);
    });

    it('devolve a conversa existente, mesmo iniciada pelo outro lado', async () => {
      const first = await sut.execute({ actorId: ANA, targetUserId: BRUNO });
      const second = await sut.execute({ actorId: BRUNO, targetUserId: ANA });

      expect(second).toEqual({ chatId: first.chatId, created: false });
      expect(chats.items).toHaveLength(1);
    });

    it('recusa conversa consigo mesmo', async () => {
      await expect(
        sut.execute({ actorId: ANA, targetUserId: ANA }),
      ).rejects.toThrow(CannotChatWithYourselfError);
    });
  });

  describe('a partir de um anúncio', () => {
    it('cria a conversa com o dono do anúncio', async () => {
      listings.add({ id: LISTING_ID, ownerUserId: BRUNO });

      const output = await sut.execute({ actorId: ANA, listingId: LISTING_ID });

      expect(output.created).toBe(true);
      expect(chats.items[0].directKey).toBe(Chat.directKeyFor(ANA, BRUNO));
    });

    it('reaproveita a conversa que já existe com o dono', async () => {
      listings.add({ id: LISTING_ID, ownerUserId: BRUNO });
      const first = await sut.execute({ actorId: ANA, targetUserId: BRUNO });

      const output = await sut.execute({ actorId: ANA, listingId: LISTING_ID });

      expect(output).toEqual({ chatId: first.chatId, created: false });
    });

    it('recusa anúncio inexistente ou não aprovado', async () => {
      await expect(
        sut.execute({ actorId: ANA, listingId: LISTING_ID }),
      ).rejects.toThrow(ListingNotFoundError);
    });

    it('recusa o próprio anúncio', async () => {
      listings.add({ id: LISTING_ID, ownerUserId: ANA });

      await expect(
        sut.execute({ actorId: ANA, listingId: LISTING_ID }),
      ).rejects.toThrow(CannotChatWithYourselfError);
    });
  });

  describe('quem inicia', () => {
    it('precisa ter o e-mail verificado', async () => {
      users.add({ id: ANA, emailVerified: false });

      await expect(
        sut.execute({ actorId: ANA, targetUserId: BRUNO }),
      ).rejects.toThrow(EmailNotVerifiedError);
      expect(chats.items).toHaveLength(0);
    });

    it.each([
      ['inativo', () => users.add({ id: ANA, active: false })],
      ['inexistente', () => users.users.delete(ANA)],
    ])('é recusado quando %s', async (_case, arrange) => {
      arrange();

      await expect(
        sut.execute({ actorId: ANA, targetUserId: BRUNO }),
      ).rejects.toThrow(ChatAccessDeniedError);
    });
  });

  describe('o destinatário', () => {
    it.each([
      ['inexistente', UNKNOWN, () => undefined],
      ['inativo', BRUNO, () => users.add({ id: BRUNO, active: false })],
      [
        'sem e-mail verificado',
        BRUNO,
        () => users.add({ id: BRUNO, emailVerified: false }),
      ],
    ])('é recusado quando %s', async (_case, targetUserId, arrange) => {
      arrange();

      await expect(sut.execute({ actorId: ANA, targetUserId })).rejects.toThrow(
        ChatUserUnavailableError,
      );
      expect(chats.items).toHaveLength(0);
    });
  });

  it('devolve a conversa criada por uma requisição simultânea', async () => {
    const winner = Chat.createDirect({
      userId: BRUNO,
      otherUserId: ANA,
      now: NOW,
    });
    await chats.save(winner);
    vi.spyOn(chats, 'findByDirectKey').mockResolvedValueOnce(null);

    const output = await sut.execute({ actorId: ANA, targetUserId: BRUNO });

    expect(output).toEqual({ chatId: winner.id, created: false });
    expect(chats.items).toHaveLength(1);
  });
});
