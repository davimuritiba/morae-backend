import { randomUUID } from 'node:crypto';
import { resetDatabase } from '../../../../../test/integration/reset-database.js';
import { PrismaTransactionContext } from '../../../../shared/infra/database/prisma-transaction-context.js';
import { PrismaService } from '../../../../shared/infra/database/prisma.service.js';
import { Chat } from '../../domain/entities/chat.entity.js';
import { Message } from '../../domain/entities/message.entity.js';
import { ChatType } from '../../domain/enums/chat-type.enum.js';
import { ParticipantRole } from '../../domain/enums/participant-role.enum.js';
import { DirectChatAlreadyExistsError } from '../../domain/errors/direct-chat-already-exists.error.js';
import { GroupName } from '../../domain/value-objects/group-name.vo.js';
import { MessageContent } from '../../domain/value-objects/message-content.vo.js';
import { PrismaChatInboxQuery } from '../../infra/persistence/queries/prisma-chat-inbox.query.js';
import { PrismaChatRepository } from '../../infra/persistence/repositories/prisma-chat.repository.js';
import { PrismaMessageRepository } from '../../infra/persistence/repositories/prisma-message.repository.js';
import { PrismaChatUserDirectory } from '../../infra/services/prisma-chat-user-directory.js';
import { PrismaListingDirectory } from '../../infra/services/prisma-listing-directory.js';

const START = new Date('2026-11-17T10:00:00.000Z');

function minutesAfter(minutes: number): Date {
  return new Date(START.getTime() + minutes * 60_000);
}

describe('Persistência do chat (integração)', () => {
  const prisma = new PrismaService();
  const db = new PrismaTransactionContext(prisma);
  const chats = new PrismaChatRepository(db);
  const messages = new PrismaMessageRepository(db);
  const inbox = new PrismaChatInboxQuery(db);
  const users = new PrismaChatUserDirectory(db);
  const listings = new PrismaListingDirectory(db);

  let cpfCounter = 0;

  async function createUser(
    name: string,
    overrides: {
      emailVerified?: boolean;
      status?: 'ACTIVE' | 'SUSPENDED';
    } = {},
  ): Promise<string> {
    const id = randomUUID();
    cpfCounter += 1;
    await prisma.user.create({
      data: {
        id,
        name,
        email: `${id}@ufal.br`,
        cpf: String(cpfCounter).padStart(11, '0'),
        passwordHash: 'hash',
        emailVerified: overrides.emailVerified ?? true,
        status: overrides.status ?? 'ACTIVE',
        updatedAt: START,
      },
    });
    return id;
  }

  async function createListing(
    ownerUserId: string,
    status: 'APPROVED' | 'PENDING',
  ): Promise<string> {
    const ownerId = randomUUID();
    const residenceId = randomUUID();
    const propertyId = randomUUID();
    const listingId = randomUUID();
    await prisma.propertyOwner.create({
      data: { id: ownerId, userId: ownerUserId, updatedAt: START },
    });
    await prisma.residence.create({
      data: {
        id: residenceId,
        postalCode: '57000000',
        state: 'AL',
        street: 'Rua A',
        number: '1',
        city: 'Maceió',
        neighborhood: 'Centro',
        updatedAt: START,
      },
    });
    await prisma.property.create({
      data: {
        id: propertyId,
        ownerId,
        residenceId,
        housingType: 'APARTMENT',
        bedrooms: 2,
        bathrooms: 1,
        updatedAt: START,
      },
    });
    await prisma.listing.create({
      data: {
        id: listingId,
        propertyId,
        title: 'Apartamento',
        description: 'Perto da UFAL',
        rent: 900,
        contractType: 'MONTHLY_RENTAL',
        minimumStay: 'SIX_MONTHS',
        status,
        updatedAt: START,
      },
    });
    return listingId;
  }

  async function send(
    chat: Chat,
    senderId: string,
    minute: number,
    text = `mensagem ${minute}`,
  ): Promise<Message> {
    const message = Message.create({
      chatId: chat.id,
      senderId,
      content: MessageContent.create(text),
      sentAt: minutesAfter(minute),
    });
    chat.registerMessage(message);
    await messages.save(message);
    await chats.save(chat);
    return message;
  }

  let ana: string;
  let bruno: string;
  let carla: string;

  beforeEach(async () => {
    await resetDatabase(prisma);
    ana = await createUser('Ana');
    bruno = await createUser('Bruno');
    carla = await createUser('Carla');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('PrismaChatRepository', () => {
    it('salva e lê uma conversa DIRECT com participantes', async () => {
      const chat = Chat.createDirect({
        userId: ana,
        otherUserId: bruno,
        now: START,
      });
      await chats.save(chat);

      const found = await chats.findById(chat.id);
      expect(found?.type).toBe(ChatType.DIRECT);
      expect(found?.directKey).toBe(chat.directKey);
      expect(found?.participants.map((p) => p.userId).sort()).toEqual(
        [ana, bruno].sort(),
      );
      expect(found?.createdAt).toEqual(START);

      const byKey = await chats.findByDirectKey(Chat.directKeyFor(bruno, ana));
      expect(byKey?.id).toBe(chat.id);
    });

    it('salva grupo com nome e papéis', async () => {
      const group = Chat.createGroup({
        creatorId: ana,
        name: GroupName.create('República'),
        memberIds: [bruno, carla],
        now: START,
      });
      await chats.save(group);

      const found = await chats.findById(group.id);
      expect(found?.name?.value).toBe('República');
      expect(found?.findParticipant(ana)?.role).toBe(ParticipantRole.ADMIN);
      expect(found?.findParticipant(carla)?.role).toBe(ParticipantRole.MEMBER);
    });

    it('recusa segunda conversa DIRECT entre o mesmo par', async () => {
      await chats.save(
        Chat.createDirect({ userId: ana, otherUserId: bruno, now: START }),
      );

      await expect(
        chats.save(
          Chat.createDirect({ userId: bruno, otherUserId: ana, now: START }),
        ),
      ).rejects.toThrow(DirectChatAlreadyExistsError);
      expect(await prisma.chat.count()).toBe(1);
    });

    it('não volta lastMessageAt nem lastReadAt com um save desatualizado', async () => {
      const chat = Chat.createDirect({
        userId: ana,
        otherUserId: bruno,
        now: START,
      });
      await chats.save(chat);

      const stale = await chats.findById(chat.id);
      const fresh = await chats.findById(chat.id);
      fresh?.markAsRead(bruno, minutesAfter(10));
      await send(fresh as Chat, ana, 10);

      stale?.markAsRead(ana, minutesAfter(5));
      await chats.save(stale as Chat);

      const found = await chats.findById(chat.id);
      expect(found?.lastMessageAt).toEqual(minutesAfter(10));
      expect(found?.findParticipant(bruno)?.lastReadAt).toEqual(
        minutesAfter(10),
      );
      expect(found?.findParticipant(ana)?.lastReadAt).toEqual(minutesAfter(10));
    });

    it('devolve null para id que não é UUID', async () => {
      expect(await chats.findById('nao-e-uuid')).toBeNull();
    });
  });

  describe('PrismaMessageRepository', () => {
    it('pagina do mais recente para o mais antigo', async () => {
      const chat = Chat.createDirect({
        userId: ana,
        otherUserId: bruno,
        now: START,
      });
      await chats.save(chat);
      for (let minute = 1; minute <= 3; minute++) await send(chat, ana, minute);

      const first = await messages.listByChat({
        chatId: chat.id,
        visibleSince: START,
        before: null,
        limit: 2,
      });
      expect(first.map((m) => m.content?.value)).toEqual([
        'mensagem 3',
        'mensagem 2',
      ]);

      const last = first[1];
      const second = await messages.listByChat({
        chatId: chat.id,
        visibleSince: START,
        before: { createdAt: last.createdAt, id: last.id },
        limit: 2,
      });
      expect(second.map((m) => m.content?.value)).toEqual(['mensagem 1']);
    });

    it('respeita visibleSince', async () => {
      const chat = Chat.createDirect({
        userId: ana,
        otherUserId: bruno,
        now: START,
      });
      await chats.save(chat);
      for (let minute = 1; minute <= 3; minute++) await send(chat, ana, minute);

      const result = await messages.listByChat({
        chatId: chat.id,
        visibleSince: minutesAfter(2),
        before: null,
        limit: 10,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('PrismaChatInboxQuery', () => {
    it('lista conversas com última mensagem, não lidas e participantes', async () => {
      const direct = Chat.createDirect({
        userId: ana,
        otherUserId: bruno,
        now: START,
      });
      await chats.save(direct);
      await send(direct, ana, 1);
      await send(direct, bruno, 2);
      await send(direct, bruno, 3, 'última');

      const group = Chat.createGroup({
        creatorId: carla,
        name: GroupName.create('Rep'),
        memberIds: [ana, bruno],
        now: minutesAfter(5),
      });
      await chats.save(group);

      const result = await inbox.listForUser({
        userId: ana,
        before: null,
        limit: 10,
      });

      expect(result.map((c) => c.id)).toEqual([group.id, direct.id]);
      expect(result[0].lastMessage).toBeNull();
      expect(result[0].lastActivityAt).toEqual(minutesAfter(5));
      expect(result[0].name).toBe('Rep');

      const summary = result[1];
      expect(summary.type).toBe(ChatType.DIRECT);
      expect(summary.unreadCount).toBe(2);
      expect(summary.lastMessage?.content).toBe('última');
      expect(summary.lastMessage?.createdAt).toEqual(minutesAfter(3));
      expect(summary.participants.map((p) => p.name).sort()).toEqual([
        'Ana',
        'Bruno',
      ]);
    });

    it('zera as não lidas depois de marcar como lida', async () => {
      const chat = Chat.createDirect({
        userId: ana,
        otherUserId: bruno,
        now: START,
      });
      await chats.save(chat);
      await send(chat, bruno, 1);
      chat.markAsRead(ana, minutesAfter(2));
      await chats.save(chat);

      const summary = await inbox.findForUser(chat.id, ana);
      expect(summary?.unreadCount).toBe(0);
    });

    it('pagina pelo cursor', async () => {
      const ids: string[] = [];
      for (const [i, other] of [bruno, carla].entries()) {
        const chat = Chat.createDirect({
          userId: ana,
          otherUserId: other,
          now: minutesAfter(i),
        });
        await chats.save(chat);
        ids.push(chat.id);
      }

      const [first] = await inbox.listForUser({
        userId: ana,
        before: null,
        limit: 1,
      });
      const second = await inbox.listForUser({
        userId: ana,
        before: { lastActivityAt: first.lastActivityAt, id: first.id },
        limit: 1,
      });

      expect([first.id, second[0].id]).toEqual([ids[1], ids[0]]);
    });

    it('não encontra conversa de que o usuário não participa', async () => {
      const chat = Chat.createDirect({
        userId: ana,
        otherUserId: bruno,
        now: START,
      });
      await chats.save(chat);

      expect(await inbox.findForUser(chat.id, carla)).toBeNull();
    });
  });

  describe('diretórios', () => {
    it('lê situação dos usuários', async () => {
      const pending = await createUser('Pendente', { emailVerified: false });
      const suspended = await createUser('Suspensa', { status: 'SUSPENDED' });

      expect(await users.findById(ana)).toEqual({
        id: ana,
        emailVerified: true,
        active: true,
      });
      expect((await users.findById(pending))?.emailVerified).toBe(false);
      expect((await users.findById(suspended))?.active).toBe(false);
      expect(await users.findById('nao-e-uuid')).toBeNull();

      const found = await users.findByIds([ana, bruno, randomUUID()]);
      expect(found.map((u) => u.id).sort()).toEqual([ana, bruno].sort());
    });

    it('só encontra anúncios aprovados, com o dono', async () => {
      const approved = await createListing(bruno, 'APPROVED');
      const pending = await createListing(carla, 'PENDING');

      expect(await listings.findApprovedById(approved)).toEqual({
        id: approved,
        ownerUserId: bruno,
      });
      expect(await listings.findApprovedById(pending)).toBeNull();
    });
  });
});
