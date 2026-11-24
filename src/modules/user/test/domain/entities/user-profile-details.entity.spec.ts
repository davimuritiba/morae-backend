import { describe, expect, it } from 'vitest';
import { UserProfileDetails } from '../../../domain/entities/user-profile-details.entity.js';
import { Gender, PreferredHousingType } from '../../../domain/enums/profile-details.enum.js';
import { InvalidProfileDetailsError } from '../../../domain/errors/invalid-profile-details.error.js';

const NOW = new Date('2026-11-23T12:00:00Z');

describe('UserProfileDetails', () => {
  it('normaliza textos, CEP e orçamento', () => {
    const details = UserProfileDetails.create(
      'user-1',
      { city: '  Maceió  ', postalCode: '57035-120', maxBudget: '850,5', bio: ' Oi!\nGosto de silêncio. ' },
      NOW,
    );

    expect(details.data).toMatchObject({
      city: 'Maceió',
      postalCode: '57035120',
      maxBudget: 850.5,
      bio: 'Oi!\nGosto de silêncio.',
      gender: null,
    });
  });

  it('calcula a idade pela data de nascimento', () => {
    const details = UserProfileDetails.create('user-1', { birthDate: '2004-11-24' }, NOW);

    expect(details.ageAt(NOW)).toBe(21);
    expect(details.ageAt(new Date('2026-11-24T00:00:00Z'))).toBe(22);
  });

  it('mantém o que não foi enviado e apaga o que veio vazio ou nulo', () => {
    const details = UserProfileDetails.create(
      'user-1',
      { city: 'Maceió', campus: 'A. C. Simões', gender: Gender.FEMALE },
      NOW,
    ).withChanges({ campus: '', gender: null, housingType: PreferredHousingType.REPUBLIC }, NOW);

    expect(details.data).toMatchObject({
      city: 'Maceió',
      campus: null,
      gender: null,
      housingType: PreferredHousingType.REPUBLIC,
    });
  });

  it.each([
    [{ gender: 'OUTRO' }],
    [{ postalCode: '1234' }],
    [{ maxBudget: 0 }],
    [{ birthDate: '2020-01-01' }],
    [{ birthDate: 'ontem' }],
    [{ city: 'x'.repeat(101) }],
    [{ bio: 42 }],
  ])('recusa dados inválidos: %o', (input) => {
    expect(() => UserProfileDetails.create('user-1', input, NOW)).toThrow(InvalidProfileDetailsError);
  });

  it('ignora campos que não fazem parte do perfil', () => {
    const details = UserProfileDetails.create('user-1', { city: 'Maceió', cpf: '123' } as never, NOW);

    expect(details.data).not.toHaveProperty('cpf');
  });
});
