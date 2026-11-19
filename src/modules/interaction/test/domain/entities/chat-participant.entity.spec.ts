import { ChatParticipant } from '../../../domain/entities/chat-participant.entity.js';
import { ParticipantRole } from '../../../domain/enums/participant-role.enum.js';

const USER_ID = '0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10';
const JOINED_AT = new Date('2026-11-17T10:00:00.000Z');

function minutesAfter(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function makeParticipant(role = ParticipantRole.MEMBER): ChatParticipant {
  return ChatParticipant.create({ userId: USER_ID, role, joinedAt: JOINED_AT });
}

describe('ChatParticipant', () => {
  describe('create', () => {
    it('nasce sem leitura registrada', () => {
      const participant = makeParticipant();

      expect(participant.userId).toBe(USER_ID);
      expect(participant.role).toBe(ParticipantRole.MEMBER);
      expect(participant.isAdmin).toBe(false);
      expect(participant.joinedAt).toEqual(JOINED_AT);
      expect(participant.lastReadAt).toBeNull();
    });

    it('identifica o admin', () => {
      expect(makeParticipant(ParticipantRole.ADMIN).isAdmin).toBe(true);
    });

    it.each([
      ['userId vazio', { userId: '' }],
      ['data inválida', { joinedAt: new Date('não é data') }],
    ])('lança erro de programação com %s', (_case, overrides) => {
      expect(() =>
        ChatParticipant.create({
          userId: USER_ID,
          role: ParticipantRole.MEMBER,
          joinedAt: JOINED_AT,
          ...overrides,
        }),
      ).toThrow(Error);
    });
  });

  describe('markAsRead', () => {
    it('registra a leitura', () => {
      const participant = makeParticipant();
      const readAt = minutesAfter(JOINED_AT, 5);

      participant.markAsRead(readAt);

      expect(participant.lastReadAt).toEqual(readAt);
    });

    it('avança a leitura', () => {
      const participant = makeParticipant();

      participant.markAsRead(minutesAfter(JOINED_AT, 5));
      participant.markAsRead(minutesAfter(JOINED_AT, 10));

      expect(participant.lastReadAt).toEqual(minutesAfter(JOINED_AT, 10));
    });

    it('não volta a leitura para uma data anterior', () => {
      const participant = makeParticipant();

      participant.markAsRead(minutesAfter(JOINED_AT, 10));
      participant.markAsRead(minutesAfter(JOINED_AT, 5));

      expect(participant.lastReadAt).toEqual(minutesAfter(JOINED_AT, 10));
    });

    it('não é afetada por mudança na data recebida', () => {
      const participant = makeParticipant();
      const readAt = minutesAfter(JOINED_AT, 5);

      participant.markAsRead(readAt);
      readAt.setFullYear(2099);

      expect(participant.lastReadAt).toEqual(minutesAfter(JOINED_AT, 5));
    });
  });

  it('restore reconstrói com os dados recebidos', () => {
    const lastReadAt = minutesAfter(JOINED_AT, 30);
    const participant = ChatParticipant.restore({
      userId: USER_ID,
      role: ParticipantRole.ADMIN,
      joinedAt: JOINED_AT,
      lastReadAt,
    });

    expect(participant.isAdmin).toBe(true);
    expect(participant.lastReadAt).toEqual(lastReadAt);
  });
});
