import { InvalidPhotoUrlError } from '../errors/invalid-photo-url.error.js';
import { PhotoUrl } from './photo-url.vo.js';

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
});
