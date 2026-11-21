import { Chat } from '../../../domain/entities/chat.entity.js';
import { Message } from '../../../domain/entities/message.entity.js';
import { ChatType } from '../../../domain/enums/chat-type.enum.js';
import { ParticipantRole } from '../../../domain/enums/participant-role.enum.js';
import { CannotChatWithYourselfError } from '../../../domain/errors/cannot-chat-with-yourself.error.js';
import { ChatNotFoundError } from '../../../domain/errors/chat-not-found.error.js';
import { InvalidGroupSizeError } from '../../../domain/errors/invalid-group-size.error.js';
import { GroupName } from '../../../domain/value-objects/group-name.vo.js';
import { MessageContent } from '../../../domain/value-objects/message-content.vo.js';

const ANA = 'aaaaaaaa-0000-4000-8000-000000000001';
const BRUNO = 'bbbbbbbb-0000-4000-8000-000000000002';
const CARLA = 'cccccccc-0000-4000-8000-000000000003';
const OUTSIDER = 'dddddddd-0000-4000-8000-000000000004';
const NOW = new Date('2026-11-17T10:00:00.000Z');

function minutesAfter(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function makeDirect(): Chat {
  return Chat.createDirect({ userId: ANA, otherUserId: BRUNO, now: NOW });
}

function makeGroup(memberIds = [BRUNO, CARLA]): Chat {
  return Chat.createGroup({
    creatorId: ANA,
    name: GroupName.create('República Central'),
    memberIds,
    now: NOW,
  });
}

function makeMessage(chat: Chat, senderId: string, sentAt: Date): Message {
  return Message.create({
    chatId: chat.id,
    senderId,
    content: MessageContent.create('Oi'),
    sentAt,
  });
}

function memberIds(count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `eeeeeeee-0000-4000-8000-${String(i).padStart(12, '0')}`,
  );
}

describe('Chat', () => {
  describe('createDirect', () => {
    it('cria conversa entre dois membros', () => {
      const chat = makeDirect();

      expect(chat.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(chat.type).toBe(ChatType.DIRECT);
      expect(chat.name).toBeNull();
      expect(chat.createdBy).toBe(ANA);
      expect(chat.participants.map((p) => p.userId)).toEqual([ANA, BRUNO]);
      expect(chat.participants.every((p) => !p.isAdmin)).toBe(true);
      expect(chat.lastMessageAt).toBeNull();
      expect(chat.createdAt).toEqual(NOW);
      expect(chat.updatedAt).toEqual(NOW);
    });

    it('gera a mesma directKey independente de quem inicia', () => {
      const fromAna = makeDirect();
      const fromBruno = Chat.createDirect({
        userId: BRUNO,
        otherUserId: ANA,
        now: NOW,
      });

      expect(fromAna.directKey).toBe(fromBruno.directKey);
      expect(fromAna.directKey).toBe(Chat.directKeyFor(BRUNO, ANA));
    });

    it('recusa conversa consigo mesmo', () => {
      expect(() =>
        Chat.createDirect({ userId: ANA, otherUserId: ANA, now: NOW }),
      ).toThrow(CannotChatWithYourselfError);
    });
  });

  describe('createGroup', () => {
    it('cria grupo com o criador como admin', () => {
      const chat = makeGroup();

      expect(chat.type).toBe(ChatType.GROUP);
      expect(chat.name?.value).toBe('República Central');
      expect(chat.directKey).toBeNull();
      expect(chat.createdBy).toBe(ANA);
      expect(chat.participants.map((p) => [p.userId, p.role])).toEqual([
        [ANA, ParticipantRole.ADMIN],
        [BRUNO, ParticipantRole.MEMBER],
        [CARLA, ParticipantRole.MEMBER],
      ]);
    });

    it('ignora membros repetidos e o próprio criador na lista', () => {
      const chat = makeGroup([BRUNO, BRUNO, ANA, CARLA]);

      expect(chat.participants.map((p) => p.userId)).toEqual([
        ANA,
        BRUNO,
        CARLA,
      ]);
    });

    it.each([
      ['só o criador', []],
      ['criador e mais um', [BRUNO]],
      ['criador e mais um repetido', [BRUNO, BRUNO, ANA]],
    ])('recusa grupo com %s', (_case, members) => {
      expect(() => makeGroup(members)).toThrow(InvalidGroupSizeError);
    });

    it('aceita grupo com 50 participantes', () => {
      expect(makeGroup(memberIds(49)).participants).toHaveLength(50);
    });

    it('recusa grupo com 51 participantes', () => {
      expect(() => makeGroup(memberIds(50))).toThrow(InvalidGroupSizeError);
    });
  });

  describe('findParticipant', () => {
    it('encontra participante e recusa quem não participa', () => {
      const chat = makeGroup();

      expect(chat.hasParticipant(CARLA)).toBe(true);
      expect(chat.findParticipant(CARLA)?.userId).toBe(CARLA);
      expect(chat.hasParticipant(OUTSIDER)).toBe(false);
      expect(chat.findParticipant(OUTSIDER)).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('registra a leitura do participante', () => {
      const chat = makeDirect();
      const readAt = minutesAfter(NOW, 5);

      chat.markAsRead(BRUNO, readAt);

      expect(chat.findParticipant(BRUNO)?.lastReadAt).toEqual(readAt);
      expect(chat.findParticipant(ANA)?.lastReadAt).toBeNull();
    });

    it('recusa quem não participa', () => {
      expect(() => makeDirect().markAsRead(OUTSIDER, NOW)).toThrow(
        ChatNotFoundError,
      );
    });
  });

  describe('registerMessage', () => {
    it('atualiza a última atividade e marca como lida para o remetente', () => {
      const chat = makeDirect();
      const sentAt = minutesAfter(NOW, 5);

      chat.registerMessage(makeMessage(chat, ANA, sentAt));

      expect(chat.lastMessageAt).toEqual(sentAt);
      expect(chat.updatedAt).toEqual(sentAt);
      expect(chat.findParticipant(ANA)?.lastReadAt).toEqual(sentAt);
      expect(chat.findParticipant(BRUNO)?.lastReadAt).toBeNull();
    });

    it('não volta lastMessageAt com mensagem mais antiga', () => {
      const chat = makeDirect();

      chat.registerMessage(makeMessage(chat, ANA, minutesAfter(NOW, 10)));
      chat.registerMessage(makeMessage(chat, BRUNO, minutesAfter(NOW, 5)));

      expect(chat.lastMessageAt).toEqual(minutesAfter(NOW, 10));
    });

    it('recusa remetente que não participa', () => {
      const chat = makeDirect();

      expect(() =>
        chat.registerMessage(makeMessage(chat, OUTSIDER, NOW)),
      ).toThrow(ChatNotFoundError);
    });

    it('lança erro de programação com mensagem de outra conversa', () => {
      const chat = makeDirect();
      const other = makeGroup();

      expect(() => chat.registerMessage(makeMessage(other, ANA, NOW))).toThrow(
        Error,
      );
    });
  });

  it('participants não permite alterar a lista interna', () => {
    const chat = makeDirect();

    (chat.participants as unknown[]).pop();

    expect(chat.participants).toHaveLength(2);
  });

  it('restore reconstrói com o id e os dados recebidos', () => {
    const original = makeGroup();
    const lastMessageAt = minutesAfter(NOW, 30);

    const restored = Chat.restore(original.id, {
      type: original.type,
      name: original.name,
      createdBy: original.createdBy,
      directKey: original.directKey,
      participants: [...original.participants],
      lastMessageAt,
      createdAt: original.createdAt,
      updatedAt: lastMessageAt,
    });

    expect(restored.id).toBe(original.id);
    expect(restored.participants).toHaveLength(3);
    expect(restored.lastMessageAt).toEqual(lastMessageAt);
  });

  it('não expõe os dados ao ser serializado', () => {
    expect(JSON.stringify(makeDirect())).toBe('{}');
  });
});
