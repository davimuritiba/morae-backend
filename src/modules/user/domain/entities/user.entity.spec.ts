import { InvalidNameError } from '../errors/invalid-name.error.js';
import { Cpf } from '../value-objects/cpf.vo.js';
import { Email } from '../value-objects/email.vo.js';
import { User, type CreateUserProps } from './user.entity.js';

function makeInput(overrides: Partial<CreateUserProps> = {}): CreateUserProps {
  return {
    name: 'Maria Silva',
    email: Email.create('maria@ufal.br'),
    cpf: Cpf.create('529.982.247-25'),
    passwordHash: '$argon2id$hash-secreto',
    ...overrides,
  };
}

describe('User', () => {
  it('não expõe passwordHash nem CPF ao ser serializado', () => {
    const user = User.create(makeInput());

    const json = JSON.stringify(user);

    expect(json).not.toContain('hash-secreto');
    expect(json).not.toContain('52998224725');
  });

  it('remove espaços do nome', () => {
    expect(User.create(makeInput({ name: '  Maria  ' })).name).toBe('Maria');
  });

  it.each(['', '   ', 'a'.repeat(101)])('rejeita nome inválido: %j', (name) => {
    expect(() => User.create(makeInput({ name }))).toThrow(InvalidNameError);
  });
});
