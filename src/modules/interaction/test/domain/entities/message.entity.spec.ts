import {
  Message,
  type CreateMessageProps,
} from '../../../domain/entities/message.entity.js';
import { EmptyMessageError } from '../../../domain/errors/empty-message.error.js';
import { MessageContent } from '../../../domain/value-objects/message-content.vo.js';

const CHAT_ID = '5d1c2f0a-7b3e-4a9c-8e21-6f4a2b9c1d30';
const SENDER_ID = '0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10';
const LISTING_ID = '9a7e4c2b-1d3f-4b8a-a6c5-2e0f9d8b7a61';
const SENT_AT = new Date('2026-11-17T10:00:00.000Z');

function makeInput(
  overrides: Partial<CreateMessageProps> = {},
): CreateMessageProps {
  return {
    chatId: CHAT_ID,
    senderId: SENDER_ID,
    content: MessageContent.create('Oi, o quarto ainda está disponível?'),
    sentAt: SENT_AT,
    ...overrides,
  };
}

describe('Message', () => {
  describe('create', () => {
    it('cria mensagem de texto', () => {
      const message = Message.create(makeInput());

      expect(message.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(message.chatId).toBe(CHAT_ID);
      expect(message.senderId).toBe(SENDER_ID);
      expect(message.content?.value).toBe(
        'Oi, o quarto ainda está disponível?',
      );
      expect(message.listingId).toBeNull();
      expect(message.createdAt).toEqual(SENT_AT);
    });

    it('cria mensagem só com anúncio', () => {
      const message = Message.create(
        makeInput({ content: null, listingId: LISTING_ID }),
      );

      expect(message.content).toBeNull();
      expect(message.listingId).toBe(LISTING_ID);
    });

    it('cria mensagem com texto e anúncio', () => {
      const message = Message.create(makeInput({ listingId: LISTING_ID }));

      expect(message.content).not.toBeNull();
      expect(message.listingId).toBe(LISTING_ID);
    });

    it.each([
      ['sem texto e sem anúncio', { content: null, listingId: null }],
      ['campos omitidos', { content: undefined, listingId: undefined }],
      ['listingId vazio', { content: null, listingId: '' }],
    ])('recusa mensagem %s', (_case, overrides) => {
      expect(() => Message.create(makeInput(overrides))).toThrow(
        EmptyMessageError,
      );
    });

    it.each([
      ['chatId vazio', { chatId: '' }],
      ['senderId vazio', { senderId: '' }],
      ['data inválida', { sentAt: new Date('não é data') }],
    ])('lança erro de programação com %s', (_case, overrides) => {
      expect(() => Message.create(makeInput(overrides))).toThrow(Error);
      expect(() => Message.create(makeInput(overrides))).not.toThrow(
        EmptyMessageError,
      );
    });

    it('gera ids diferentes', () => {
      expect(Message.create(makeInput()).id).not.toBe(
        Message.create(makeInput()).id,
      );
    });
  });

  describe('createdAt', () => {
    it('não é afetado por mudança na data recebida', () => {
      const sentAt = new Date(SENT_AT);
      const message = Message.create(makeInput({ sentAt }));

      sentAt.setFullYear(2099);

      expect(message.createdAt).toEqual(SENT_AT);
    });

    it('não pode ser alterado por quem lê', () => {
      const message = Message.create(makeInput());

      message.createdAt.setFullYear(2099);

      expect(message.createdAt).toEqual(SENT_AT);
    });
  });

  describe('restore', () => {
    it('reconstrói com o id e os dados recebidos', () => {
      const id = '3e8b1a2c-4d5f-4e6a-9b7c-8d9e0f1a2b3c';
      const message = Message.restore(id, {
        chatId: CHAT_ID,
        senderId: SENDER_ID,
        content: null,
        listingId: LISTING_ID,
        createdAt: SENT_AT,
      });

      expect(message.id).toBe(id);
      expect(message.content).toBeNull();
      expect(message.listingId).toBe(LISTING_ID);
      expect(message.createdAt).toEqual(SENT_AT);
    });
  });

  describe('isSentBy', () => {
    it('identifica o remetente', () => {
      const message = Message.create(makeInput());

      expect(message.isSentBy(SENDER_ID)).toBe(true);
      expect(message.isSentBy(LISTING_ID)).toBe(false);
    });
  });

  it('não expõe os dados ao ser serializada', () => {
    expect(JSON.stringify(Message.create(makeInput()))).toBe('{}');
  });
});
