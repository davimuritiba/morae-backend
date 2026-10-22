import { InvalidPhoneError } from '../../../domain/errors/invalid-phone.error.js';
import { Phone } from '../../../domain/value-objects/phone.vo.js';

describe('Phone', () => {
  it.each([
    ['(82) 99999-9999', '82999999999'],
    ['82999999999', '82999999999'],
    ['+55 82 99999-9999', '82999999999'],
    ['(82) 3333-4444', '8233334444'],
  ])('normaliza %j para %j', (raw, expected) => {
    expect(Phone.create(raw).value).toBe(expected);
  });

  it.each(['', '9999-9999', '(02) 99999-9999', '82 8999-99999', 'abc'])(
    'rejeita %j',
    (raw) => {
      expect(() => Phone.create(raw)).toThrow(InvalidPhoneError);
    },
  );
});
