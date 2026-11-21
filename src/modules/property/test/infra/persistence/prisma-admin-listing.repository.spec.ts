import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { PrismaAdminListingRepository } from '../../../infra/persistence/repositories/prisma-admin-listing.repository.js';

describe('PrismaAdminListingRepository', () => {
  const findMany = vi.fn();
  const findUnique = vi.fn();
  const count = vi.fn();
  const prisma = {
    listing: { findMany, findUnique, count },
  } as unknown as PrismaService;
  const repository = new PrismaAdminListingRepository(prisma);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches and paginates listings and returns safe display data', async () => {
    findMany.mockResolvedValue([{
      id: 'listing-id',
      propertyId: 'property-id',
      title: 'Quarto perto da UFAL',
      description: 'Quarto mobiliado',
      rules: null,
      rent: 950,
      condominium: null,
      contractType: 'MONTHLY_RENTAL',
      minimumStay: 'THREE_MONTHS',
      status: 'PENDING',
      createdAt: new Date('2026-11-20T12:00:00.000Z'),
      updatedAt: new Date('2026-11-20T12:00:00.000Z'),
      property: {
        housingType: 'ROOM',
        bedrooms: 1,
        bathrooms: 1,
        parkingSpaces: 0,
        amenities: ['WIFI'],
        residence: {
          postalCode: '57000000',
          state: 'AL',
          street: 'Rua A',
          number: '10',
          complement: null,
          city: 'Maceió',
          neighborhood: 'Farol',
        },
        owner: {
          user: {
            id: 'owner-id',
            name: 'Maria',
            email: 'maria@example.com',
            phone: null,
          },
        },
      },
      media: [{ id: 'media-id', type: 'IMAGE', url: '/uploads/a.jpg', position: 0 }],
    }]);
    count.mockResolvedValue(34);

    await expect(repository.findPage({
      search: 'maria',
      status: 'PENDING',
      page: 2,
      limit: 10,
    })).resolves.toMatchObject({
      total: 34,
      page: 2,
      limit: 10,
      items: [{
        listingId: 'listing-id',
        rent: 950,
        property: {
          owner: { id: 'owner-id', name: 'Maria', email: 'maria@example.com' },
          residence: { city: 'Maceió', neighborhood: 'Farol' },
        },
        media: [{ id: 'media-id', url: '/uploads/a.jpg', position: 0 }],
      }],
    });

    const [where] = findMany.mock.calls[0];
    expect(where).toMatchObject({
      skip: 10,
      take: 10,
      where: {
        status: 'PENDING',
        OR: expect.arrayContaining([
          { title: { contains: 'maria', mode: 'insensitive' } },
          { property: { is: { residence: { is: { city: { contains: 'maria', mode: 'insensitive' } } } } } },
          { property: { is: { owner: { is: { user: { is: { name: { contains: 'maria', mode: 'insensitive' } } } } } } } },
        ]),
      },
    });
    expect(count).toHaveBeenCalledWith({ where: where.where });
    expect(findMany.mock.calls[0][0].include.media.orderBy).toEqual({ position: 'asc' });
  });

  it('returns null when the listing does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(repository.findById('missing-id')).resolves.toBeNull();
  });
});
