import { FixedClock } from '../../../../../shared/test/fakes/fixed-clock.js';
import { CreateGroupChatUseCase } from '../../../application/use-cases/create-group-chat/create-group-chat.use-case.js';
import { ChatType } from '../../../domain/enums/chat-type.enum.js';
import { ParticipantRole } from '../../../domain/enums/participant-role.enum.js';
import { ChatUserUnavailableError } from '../../../domain/errors/chat-user-unavailable.error.js';
import { EmailNotVerifiedError } from '../../../domain/errors/email-not-verified.error.js';
import { InvalidGroupNameError } from '../../../domain/errors/invalid-group-name.error.js';
import { InvalidGroupSizeError } from '../../../domain/errors/invalid-group-size.error.js';
import { InMemoryChatRepository } from '../../../infra/persistence/in-memory/in-memory-chat.repository.js';
import { FakeChatUserDirectory } from '../../fakes/fake-chat-user-directory.js';

const ANA = 'aaaaaaaa-0000-4000-8000-000000000001';
const BRUNO = 'bbbbbbbb-0000-4000-8000-000000000002';
const CARLA = 'cccccccc-0000-4000-8000-000000000003';
const UNKNOWN = 'ffffffff-0000-4000-8000-000000000009';
const NOW = new Date('2026-11-17T10:00:00.000Z');

describe('CreateGroupChatUseCase', () => {
  let chats: InMemoryChatRepository;
  let users: FakeChatUserDirectory;
  let sut: CreateGroupChatUseCase;

  beforeEach(() => {
    chats = new InMemoryChatRepository();
    users = new FakeChatUserDirectory();
    sut = new CreateGroupChatUseCase(chats, users, new FixedClock(NOW));

    for (const id of [ANA, BRUNO, CARLA]) users.add({ id });
  });

  it('cria o grupo com quem criou como admin', async () => {
    const output = await sut.execute({
      actorId: ANA,
      name: ' República ',
      memberIds: [BRUNO, CARLA],
    });

    const chat = await chats.findById(output.chatId);
    expect(chat?.type).toBe(ChatType.GROUP);
    expect(chat?.name?.value).toBe('República');
    expect(chat?.participants.map((p) => [p.userId, p.role])).toEqual([
      [ANA, ParticipantRole.ADMIN],
      [BRUNO, ParticipantRole.MEMBER],
      [CARLA, ParticipantRole.MEMBER],
    ]);
  });

  it.each([
    ['inexistente', UNKNOWN, () => undefined],
    ['inativo', CARLA, () => users.add({ id: CARLA, active: false })],
    [
      'sem e-mail verificado',
      CARLA,
      () => users.add({ id: CARLA, emailVerified: false }),
    ],
  ])('recusa membro %s', async (_case, memberId, arrange) => {
    arrange();

    await expect(
      sut.execute({ actorId: ANA, name: 'Rep', memberIds: [BRUNO, memberId] }),
    ).rejects.toThrow(ChatUserUnavailableError);
    expect(chats.items).toHaveLength(0);
  });

  it('recusa grupo pequeno demais', async () => {
    await expect(
      sut.execute({ actorId: ANA, name: 'Rep', memberIds: [BRUNO] }),
    ).rejects.toThrow(InvalidGroupSizeError);
  });

  it('recusa nome inválido', async () => {
    await expect(
      sut.execute({ actorId: ANA, name: '  ', memberIds: [BRUNO, CARLA] }),
    ).rejects.toThrow(InvalidGroupNameError);
  });

  it('exige e-mail verificado de quem cria', async () => {
    users.add({ id: ANA, emailVerified: false });

    await expect(
      sut.execute({ actorId: ANA, name: 'Rep', memberIds: [BRUNO, CARLA] }),
    ).rejects.toThrow(EmailNotVerifiedError);
  });
});
