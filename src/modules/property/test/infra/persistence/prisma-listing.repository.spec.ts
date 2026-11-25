import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { PrismaListingRepository } from '../../../infra/persistence/repositories/prisma-listing.repository.js';

describe('PrismaListingRepository.findOwnedByUserId', () => {
  const findMany = vi.fn();
  const prisma = { listing: { findMany } } as unknown as PrismaService;
  const repository = new PrismaListingRepository(prisma);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna anúncios da conta com diferentes estados, detalhes e fotos', async () => {
    findMany.mockResolvedValue([
      makeListing('PENDING'),
      makeListing('IN_REVIEW'),
      makeListing('APPROVED'),
      makeListing('REJECTED'),
      makeListing('ARCHIVED'),
    ]);

    const result = await repository.findOwnedByUserId('owner-id');

    expect(result.map(({ status }) => status)).toEqual([
      'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED',
    ]);
    expect(result[0]).toMatchObject({
      listingId: 'listing-pending',
      propertyId: 'property-pending',
      title: 'Quarto no Farol',
      rent: 750,
      location: { city: 'Maceió', neighborhood: 'Farol', state: 'AL' },
      advertiser: { userId: 'owner-id', name: 'Maria' },
      media: [{ url: '/uploads/room.jpg', position: 0 }],
    });
  });

  it('filtra pelo dono autenticado e ignora anúncios removidos', async () => {
    findMany.mockResolvedValue([]);

    await repository.findOwnedByUserId('owner-id');

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        property: { is: { owner: { is: { userId: 'owner-id' } } } },
        status: { not: 'REMOVED' },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }));
  });

  it('retorna lista vazia para uma conta sem anúncios', async () => {
    findMany.mockResolvedValue([]);

    await expect(repository.findOwnedByUserId('new-owner')).resolves.toEqual([]);
  });
});

function makeListing(status: string) {
  return {
    id: `listing-${status.toLowerCase()}`,
    propertyId: `property-${status.toLowerCase()}`,
    title: 'Quarto no Farol',
    description: 'Quarto perto da universidade.',
    rent: 750,
    condominium: null,
    status,
    createdAt: new Date('2026-11-20T12:00:00.000Z'),
    property: {
      housingType: 'ROOM',
      bedrooms: 1,
      bathrooms: 1,
      parkingSpaces: 0,
      amenities: ['WIFI'],
      residence: { city: 'Maceió', neighborhood: 'Farol', state: 'AL' },
      owner: { user: { id: 'owner-id', name: 'Maria' } },
    },
    media: [{ id: 'media-id', type: 'IMAGE', url: '/uploads/room.jpg', position: 0 }],
  };
}
