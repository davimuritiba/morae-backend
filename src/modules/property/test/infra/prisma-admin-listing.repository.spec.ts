import {
  ListingStatus as PrismaListingStatus,
} from '../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../../shared/infra/database/prisma.service.js';
import { ListingStatus } from '../../domain/enums/listing-status.enum.js';
import { PrismaAdminListingRepository } from '../../infra/persistence/repositories/prisma-admin-listing.repository.js';

describe('PrismaAdminListingRepository', () => {
  const findMany = vi.fn();
  const count = vi.fn();
  const findUnique = vi.fn();
  const prisma = {
    listing: { findMany, count, findUnique },
  } as unknown as PrismaService;
  const repository = new PrismaAdminListingRepository(prisma);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies search, status and pagination while selecting safe owner fields', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await repository.findPage({
      search: 'Farol',
      status: ListingStatus.PENDING,
      page: 2,
      limit: 10,
    });

    const [query] = findMany.mock.calls[0];
    expect(query).toMatchObject({
      skip: 10,
      take: 10,
      where: {
        status: PrismaListingStatus.PENDING,
        OR: expect.arrayContaining([
          { title: { contains: 'Farol', mode: 'insensitive' } },
          {
            property: {
              is: {
                residence: {
                  is: { city: { contains: 'Farol', mode: 'insensitive' } },
                },
              },
            },
          },
        ]),
      },
    });
    expect(query.include.property.include.owner.include.user.select).toEqual({
      id: true,
      name: true,
      email: true,
      phone: true,
    });
    expect(count).toHaveBeenCalledWith({ where: query.where });
  });

  it('loads one listing by ID and returns null for an unknown listing', async () => {
    findUnique.mockResolvedValue(null);

    await expect(repository.findById('listing-id')).resolves.toBeNull();
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'listing-id' },
    }));
  });
});
