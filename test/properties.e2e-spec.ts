import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/shared/infra/database/prisma.service.js';
import { validCpf } from './helpers/valid-cpf.js';
import { resetDatabase } from './integration/reset-database.js';

describe('Properties endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function createUser(seed: number): Promise<string> {
    const id = randomUUID();
    await prisma.user.create({
      data: {
        id,
        name: `Usuário ${seed}`,
        email: `${id}@ufal.br`,
        cpf: validCpf(seed),
        passwordHash: 'hash',
        updatedAt: new Date(),
      },
    });
    return id;
  }

  async function createListing(input: {
    seed: number;
    city: string;
    neighborhood: string;
    status: 'APPROVED' | 'PENDING';
  }): Promise<string> {
    const ownerUserId = await createUser(input.seed);
    const cohabitantId = await createUser(input.seed + 1);
    const ownerId = randomUUID();
    await prisma.propertyOwner.create({
      data: { id: ownerId, userId: ownerUserId, updatedAt: new Date() },
    });

    const { body } = await request(app.getHttpServer())
      .post('/properties')
      .send({
        ownerId,
        cohabitantIds: [cohabitantId],
        postalCode: '57035120',
        state: 'AL',
        street: 'Rua de teste',
        number: String(input.seed),
        city: input.city,
        neighborhood: input.neighborhood,
        housingType: 'APARTMENT',
        bedrooms: 2,
        bathrooms: 1,
        title: `Moradia ${input.neighborhood}`,
        description: 'Imóvel de teste disponível para aluguel residencial.',
        rent: 850,
        contractType: 'PROPERTY_SHARING',
        minimumStay: 'SIX_MONTHS',
      })
      .expect(201);

    if (input.status === 'APPROVED') {
      await prisma.listing.update({
        where: { id: body.listingId },
        data: { status: 'APPROVED' },
      });
    }

    return body.listingId as string;
  }

  it('201: publica o imóvel com o anúncio pendente de moderação', async () => {
    const ownerUserId = await createUser(1);
    const cohabitantId = await createUser(2);
    const ownerId = randomUUID();
    await prisma.propertyOwner.create({
      data: { id: ownerId, userId: ownerUserId, updatedAt: new Date() },
    });

    const { body } = await request(app.getHttpServer())
      .post('/properties')
      .send({
        ownerId,
        cohabitantIds: [cohabitantId],
        postalCode: '57035120',
        state: 'AL',
        street: 'Rua Professor Sandoval Arroxelas',
        number: '120',
        city: 'Maceió',
        neighborhood: 'Ponta Verde',
        housingType: 'APARTMENT',
        bedrooms: 3,
        bathrooms: 2,
        title: 'Quarto em apartamento perto da UFAL',
        description: 'Apartamento mobiliado, com internet e área de estudos.',
        rent: 900,
        contractType: 'PROPERTY_SHARING',
        minimumStay: 'SIX_MONTHS',
      })
      .expect(201);

    const listing = await prisma.listing.findUnique({
      where: { id: body.listingId },
    });
    expect(listing).toMatchObject({
      propertyId: body.propertyId,
      status: 'PENDING',
    });
  });

  it('GET /properties filtra por cidade, bairro e estado, sem diferenciar caixa', async () => {
    const farolId = await createListing({
      seed: 10,
      city: 'Maceió',
      neighborhood: 'Farol',
      status: 'APPROVED',
    });
    await createListing({
      seed: 20,
      city: 'Maceió',
      neighborhood: 'Ponta Verde',
      status: 'APPROVED',
    });
    await createListing({
      seed: 30,
      city: 'Maceió',
      neighborhood: 'Farol',
      status: 'PENDING',
    });

    const { body } = await request(app.getHttpServer())
      .get('/properties?location=fARol')
      .expect(200);

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      listingId: farolId,
      title: 'Moradia Farol',
      location: { city: 'Maceió', neighborhood: 'Farol', state: 'AL' },
      advertiser: { name: 'Usuário 10' },
    });
  });

  it('GET /properties/:listingId exibe os detalhes de um anúncio aprovado', async () => {
    const listingId = await createListing({
      seed: 40,
      city: 'Maceió',
      neighborhood: 'Farol',
      status: 'APPROVED',
    });

    const { body } = await request(app.getHttpServer())
      .get(`/properties/${listingId}`)
      .expect(200);

    expect(body).toMatchObject({
      listingId,
      title: 'Moradia Farol',
      description: 'Imóvel de teste disponível para aluguel residencial.',
      rent: 850,
      advertiser: { userId: expect.any(String), name: 'Usuário 40' },
    });
  });

  it('GET /properties/:listingId retorna 404 quando o anúncio não foi aprovado', async () => {
    const listingId = await createListing({
      seed: 50,
      city: 'Maceió',
      neighborhood: 'Farol',
      status: 'PENDING',
    });

    await request(app.getHttpServer())
      .get(`/properties/${listingId}`)
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe('LISTING_NOT_FOUND'));
  });
});
