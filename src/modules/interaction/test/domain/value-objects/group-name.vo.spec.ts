import { InvalidGroupNameError } from '../../../domain/errors/invalid-group-name.error.js';
import { GroupName } from '../../../domain/value-objects/group-name.vo.js';

describe('GroupName', () => {
  it('apara as pontas', () => {
    expect(GroupName.create('  República Central  ').value).toBe(
      'República Central',
    );
  });

  it.each(['', '   ', '\t\n'])('rejeita nome em branco %j', (raw) => {
    expect(() => GroupName.create(raw)).toThrow(InvalidGroupNameError);
  });

  it('aceita nome com exatamente 60 caracteres', () => {
    expect(GroupName.create('a'.repeat(60)).value).toHaveLength(60);
  });

  it('rejeita nome com 61 caracteres', () => {
    expect(() => GroupName.create('a'.repeat(61))).toThrow(
      InvalidGroupNameError,
    );
  });

  it('conta emoji como um caractere', () => {
    const raw = '🏠'.repeat(60);

    expect(GroupName.create(raw).value).toBe(raw);
    expect(() => GroupName.create(`${raw}🏠`)).toThrow(InvalidGroupNameError);
  });

  it.each(['República\nCentral', 'República\tCentral', 'Rep\u0000'])(
    'rejeita caractere de controle em %j',
    (raw) => {
      expect(() => GroupName.create(raw)).toThrow(InvalidGroupNameError);
    },
  );

  it('compara pelo valor', () => {
    const a = GroupName.create('Rep');

    expect(a.equals(GroupName.create(' Rep '))).toBe(true);
    expect(a.equals(GroupName.create('Outra'))).toBe(false);
  });
});
