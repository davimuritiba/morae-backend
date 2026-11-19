import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/shared/infra/database/prisma.service.js';
import { validCpf } from './helpers/valid-cpf.js';
import { resetDatabase } from './integration/reset-database.js';

describe('POST /properties (e2e)', () => {
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
});
