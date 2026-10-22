import { InvalidPhotoUrlError } from '../../../domain/errors/invalid-photo-url.error.js';
import { PhotoUrl } from '../../../domain/value-objects/photo-url.vo.js';

describe('PhotoUrl', () => {
  it('aceita URL https', () => {
    expect(PhotoUrl.create(' https://cdn.morae.app/u/1.png ').value).toBe(
      'https://cdn.morae.app/u/1.png',
    );
  });

  it.each([
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    'http://cdn.morae.app/u/1.png',
    'file:///etc/passwd',
    'https://user:senha@cdn.morae.app/u/1.png',
    'não é url',
    `https://cdn.morae.app/${'a'.repeat(2048)}`,
  ])('rejeita %j', (raw) => {
    expect(() => PhotoUrl.create(raw)).toThrow(InvalidPhotoUrlError);
  });

  it('aceita URL com exatamente 2048 caracteres', () => {
    const raw = `https://cdn.morae.app/${'a'.repeat(2026)}`;

    expect(PhotoUrl.create(raw).value).toHaveLength(2048);
  });

  it('rejeita URL curta cujo href normalizado passa de 2048 caracteres', () => {
    // 22 + 1000 = 1022 caracteres na entrada; cada "é" vira "%C3%A9" no href.
    const raw = `https://cdn.morae.app/${'é'.repeat(1000)}`;
    expect(raw.length).toBeLessThanOrEqual(2048);

    expect(() => PhotoUrl.create(raw)).toThrow(InvalidPhotoUrlError);
  });
});
