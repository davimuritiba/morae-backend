import { InvalidMessageContentError } from '../../../domain/errors/invalid-message-content.error.js';
import { MessageContent } from '../../../domain/value-objects/message-content.vo.js';

describe('MessageContent', () => {
  it('apara só as pontas e preserva quebras de linha no meio', () => {
    const content = MessageContent.create('  Oi!\n\nTudo bem?  \n');

    expect(content.value).toBe('Oi!\n\nTudo bem?');
  });

  it.each(['', '   ', '\n\t \n'])('rejeita mensagem em branco %j', (raw) => {
    expect(() => MessageContent.create(raw)).toThrow(
      InvalidMessageContentError,
    );
  });

  it('aceita mensagem com exatamente 2000 caracteres', () => {
    expect(MessageContent.create('a'.repeat(2000)).value).toHaveLength(2000);
  });

  it('rejeita mensagem com 2001 caracteres', () => {
    expect(() => MessageContent.create('a'.repeat(2001))).toThrow(
      InvalidMessageContentError,
    );
  });

  it('não conta os espaços das pontas no limite', () => {
    const raw = `   ${'a'.repeat(2000)}   `;

    expect(MessageContent.create(raw).value).toHaveLength(2000);
  });

  it('conta emoji como um caractere, como o VARCHAR do banco', () => {
    const raw = '😀'.repeat(2000);

    expect(MessageContent.create(raw).value).toBe(raw);
    expect(() => MessageContent.create(`${raw}😀`)).toThrow(
      InvalidMessageContentError,
    );
  });

  it('rejeita o caractere NUL, que o PostgreSQL não aceita', () => {
    expect(() => MessageContent.create('Oi\u0000')).toThrow(
      InvalidMessageContentError,
    );
  });

  it('compara pelo valor', () => {
    const a = MessageContent.create('Oi');

    expect(a.equals(MessageContent.create(' Oi '))).toBe(true);
    expect(a.equals(MessageContent.create('Olá'))).toBe(false);
  });
});
