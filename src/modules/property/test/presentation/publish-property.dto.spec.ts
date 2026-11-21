import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PublishPropertyDto } from '../../presentation/http/dtos/publish-property.dto.js';

describe('PublishPropertyDto', () => {
  it('validates multipart string fields and parses amenities JSON', async () => {
    const dto = plainToInstance(PublishPropertyDto, {
      postalCode: '57072000',
      state: 'AL',
      street: 'Rua Universitária',
      number: '123',
      city: 'Maceió',
      neighborhood: 'Clima Bom',
      housingType: 'APARTMENT',
      bedrooms: '2',
      bathrooms: '1',
      parkingSpaces: '0',
      amenities: '["WI-FI","Mobiliado"]',
      title: 'Quarto próximo ao campus',
      description: 'Quarto disponível para estudantes.',
      rent: '650',
      contractType: 'MONTHLY_RENTAL',
      minimumStay: 'THREE_MONTHS',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.amenities).toEqual(['WI-FI', 'Mobiliado']);
    expect(dto.bedrooms).toBe(2);
    expect(dto.rent).toBe(650);
  });

  it('rejects invalid listing enums and malformed amenities', async () => {
    const dto = plainToInstance(PublishPropertyDto, {
      postalCode: '57072000',
      state: 'AL',
      street: 'Rua Universitária',
      number: '123',
      city: 'Maceió',
      neighborhood: 'Clima Bom',
      housingType: 'UNKNOWN',
      bedrooms: '2',
      bathrooms: '1',
      parkingSpaces: '0',
      amenities: 'not-json',
      title: 'Quarto próximo ao campus',
      description: 'Quarto disponível para estudantes.',
      rent: '650',
      contractType: 'MONTHLY_RENTAL',
      minimumStay: 'THREE_MONTHS',
    });

    const errors = await validate(dto);
    expect(errors.map(({ property }) => property)).toContain('housingType');
    expect(errors.map(({ property }) => property)).toContain('amenities');
  });
});
