import { GetListingUseCase } from '../../../application/use-cases/get-listing/get-listing.use-case.js';
import { SearchListingsUseCase } from '../../../application/use-cases/search-listings/search-listings.use-case.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import type {
  ListingRepository,
  ListingSearchResult,
  SearchListingsFilter,
} from '../../../domain/repositories/listing.repository.js';

const LISTING_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const listing: ListingSearchResult = {
  listingId: LISTING_ID,
  propertyId: 'bbbbbbbb-0000-4000-8000-000000000002',
  title: 'Quarto no Farol',
  description: 'Quarto mobiliado perto da universidade.',
  rent: 700,
  condominium: null,
  housingType: 'ROOM' as ListingSearchResult['housingType'],
  bedrooms: 1,
  bathrooms: 1,
  parkingSpaces: 0,
  amenities: ['WIFI'],
  location: { city: 'Maceió', neighborhood: 'Farol', state: 'AL' },
  advertiser: { userId: 'cccccccc-0000-4000-8000-000000000003', name: 'Ana' },
  media: [],
  createdAt: new Date('2026-11-19T12:00:00.000Z'),
};

class FakeListingRepository implements ListingRepository {
  searchFilters: SearchListingsFilter[] = [];
  listing: ListingSearchResult | null = listing;

  async search(filter: SearchListingsFilter): Promise<ListingSearchResult[]> {
    this.searchFilters.push(filter);
    return this.listing ? [this.listing] : [];
  }

  async findApprovedById(): Promise<ListingSearchResult | null> {
    return this.listing;
  }
}

describe('SearchListingsUseCase', () => {
  it('normaliza a localização antes de consultar o repositório', async () => {
    const repository = new FakeListingRepository();

    const result = await new SearchListingsUseCase(repository).execute({
      location: '  Farol  ',
    });

    expect(repository.searchFilters).toEqual([{ location: 'Farol' }]);
    expect(result).toEqual([listing]);
  });

  it('consulta todos os anúncios aprovados quando a localização está vazia', async () => {
    const repository = new FakeListingRepository();

    await new SearchListingsUseCase(repository).execute({ location: '   ' });

    expect(repository.searchFilters).toEqual([{ location: undefined }]);
  });
});

describe('GetListingUseCase', () => {
  it('retorna o anúncio aprovado pelo identificador', async () => {
    const repository = new FakeListingRepository();

    await expect(
      new GetListingUseCase(repository).execute({ listingId: LISTING_ID }),
    ).resolves.toEqual(listing);
  });

  it('retorna LISTING_NOT_FOUND se o anúncio não está disponível', async () => {
    const repository = new FakeListingRepository();
    repository.listing = null;

    await expect(
      new GetListingUseCase(repository).execute({ listingId: LISTING_ID }),
    ).rejects.toBeInstanceOf(ListingNotFoundError);
  });
});
