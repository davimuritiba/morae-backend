import { ListMessagesUseCase } from '../../../application/use-cases/list-messages/list-messages.use-case.js';
import { Chat } from '../../../domain/entities/chat.entity.js';
import { ChatParticipant } from '../../../domain/entities/chat-participant.entity.js';
import { Message } from '../../../domain/entities/message.entity.js';
import { ParticipantRole } from '../../../domain/enums/participant-role.enum.js';
import { ChatNotFoundError } from '../../../domain/errors/chat-not-found.error.js';
import { EmailNotVerifiedError } from '../../../domain/errors/email-not-verified.error.js';
import { GroupName } from '../../../domain/value-objects/group-name.vo.js';
import { MessageContent } from '../../../domain/value-objects/message-content.vo.js';
import { InMemoryChatRepository } from '../../../infra/persistence/in-memory/in-memory-chat.repository.js';
import { InMemoryMessageRepository } from '../../../infra/persistence/in-memory/in-memory-message.repository.js';
import { FakeChatUserDirectory } from '../../fakes/fake-chat-user-directory.js';

const ANA = 'aaaaaaaa-0000-4000-8000-000000000001';
const BRUNO = 'bbbbbbbb-0000-4000-8000-000000000002';
const CARLA = 'cccccccc-0000-4000-8000-000000000003';
const OUTSIDER = 'dddddddd-0000-4000-8000-000000000004';
const START = new Date('2026-11-17T10:00:00.000Z');

function minutesAfter(minutes: number): Date {
  return new Date(START.getTime() + minutes * 60_000);
}

describe('ListMessagesUseCase', () => {
  let chats: InMemoryChatRepository;
  let messages: InMemoryMessageRepository;
  let users: FakeChatUserDirectory;
  let sut: ListMessagesUseCase;
  let chat: Chat;

  async function send(senderId: string, minute: number): Promise<Message> {
    const message = Message.create({
      chatId: chat.id,
      senderId,
      content: MessageContent.create(`mensagem ${minute}`),
      sentAt: minutesAfter(minute),
    });
    await messages.save(message);
    return message;
  }

  beforeEach(async () => {
    chats = new InMemoryChatRepository();
    messages = new InMemoryMessageRepository();
    users = new FakeChatUserDirectory();
    sut = new ListMessagesUseCase(chats, messages, users);

    for (const id of [ANA, BRUNO, CARLA, OUTSIDER]) users.add({ id });
    chat = Chat.createDirect({ userId: ANA, otherUserId: BRUNO, now: START });
    await chats.save(chat);
  });

  it('lista as mais recentes primeiro, paginando por cursor', async () => {
    for (let minute = 1; minute <= 5; minute++) await send(ANA, minute);

    const first = await sut.execute({
      actorId: BRUNO,
      chatId: chat.id,
      before: null,
      limit: 2,
    });
    expect(first.messages.map((m) => m.content)).toEqual([
      'mensagem 5',
      'mensagem 4',
    ]);
    expect(first.nextCursor).not.toBeNull();

    const second = await sut.execute({
      actorId: BRUNO,
      chatId: chat.id,
      before: first.nextCursor,
      limit: 2,
    });
    expect(second.messages.map((m) => m.content)).toEqual([
      'mensagem 3',
      'mensagem 2',
    ]);

    const last = await sut.execute({
      actorId: BRUNO,
      chatId: chat.id,
      before: second.nextCursor,
      limit: 2,
    });
    expect(last.messages.map((m) => m.content)).toEqual(['mensagem 1']);
    expect(last.nextCursor).toBeNull();
  });

  it('desempata mensagens do mesmo instante pelo id', async () => {
    const a = await send(ANA, 1);
    const b = await send(BRUNO, 1);

    const first = await sut.execute({
      actorId: ANA,
      chatId: chat.id,
      before: null,
      limit: 1,
    });
    const second = await sut.execute({
      actorId: ANA,
      chatId: chat.id,
      before: first.nextCursor,
      limit: 1,
    });

    const ids = [...first.messages, ...second.messages].map((m) => m.id);
    expect(ids.sort()).toEqual([a.id, b.id].sort());
  });

  it('mostra só o que foi enviado depois de o participante entrar', async () => {
    const group = Chat.restore(chat.id, {
      type: chat.type,
      name: GroupName.create('Rep'),
      createdBy: ANA,
      directKey: null,
      participants: [
        ...chat.participants,
        ChatParticipant.create({
          userId: CARLA,
          role: ParticipantRole.MEMBER,
          joinedAt: minutesAfter(3),
        }),
      ],
      lastMessageAt: null,
      createdAt: START,
      updatedAt: START,
    });
    await chats.save(group);
    for (let minute = 1; minute <= 5; minute++) await send(ANA, minute);

    const output = await sut.execute({
      actorId: CARLA,
      chatId: chat.id,
      before: null,
      limit: 10,
    });

    expect(output.messages.map((m) => m.content)).toEqual([
      'mensagem 5',
      'mensagem 4',
      'mensagem 3',
    ]);
  });

  it('limita a página a 100 mensagens', async () => {
    for (let minute = 1; minute <= 101; minute++) await send(ANA, minute);

    const output = await sut.execute({
      actorId: ANA,
      chatId: chat.id,
      before: null,
      limit: 500,
    });

    expect(output.messages).toHaveLength(100);
    expect(output.nextCursor).not.toBeNull();
  });

  it('recusa quem não participa', async () => {
    await expect(
      sut.execute({
        actorId: OUTSIDER,
        chatId: chat.id,
        before: null,
        limit: 10,
      }),
    ).rejects.toThrow(ChatNotFoundError);
  });

  it('exige e-mail verificado', async () => {
    users.add({ id: ANA, emailVerified: false });

    await expect(
      sut.execute({ actorId: ANA, chatId: chat.id, before: null, limit: 10 }),
    ).rejects.toThrow(EmailNotVerifiedError);
  });
});
