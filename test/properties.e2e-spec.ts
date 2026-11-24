import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AuthTokenService } from '../src/shared/infra/auth/auth-token.service.js';
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

  async function tokenForListingOwner(listingId: string): Promise<string> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { property: { select: { owner: { select: { userId: true } } } } },
    });
    if (!listing) throw new Error('Anúncio de teste não encontrado.');
    return app.get(AuthTokenService).sign(listing.property.owner.userId);
  }

  // Menor PNG válido: o armazenamento confere o conteúdo, não só a extensão.
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // POST /properties exige login e envia os dados como multipart, com ao
  // menos uma foto. O dono é a conta autenticada.
  async function publishAs(
    userId: string,
    fields: Record<string, string | number>,
  ): Promise<{ propertyId: string; listingId: string }> {
    const token = await app.get(AuthTokenService).sign(userId);
    const req = request(app.getHttpServer())
      .post('/properties')
      .set('Authorization', `Bearer ${token}`);
    for (const [name, value] of Object.entries({
      amenities: '[]',
      parkingSpaces: 0,
      ...fields,
    })) {
      void req.field(name, String(value));
    }
    const { body } = await req
      .attach('photos', PNG, { filename: 'foto.png', contentType: 'image/png' })
      .expect(201);
    return body as { propertyId: string; listingId: string };
  }

  async function createListing(input: {
    seed: number;
    city: string;
    neighborhood: string;
    status: 'APPROVED' | 'PENDING';
  }): Promise<string> {
    const ownerUserId = await createUser(input.seed);

    const body = await publishAs(ownerUserId, {
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
    });

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

    const body = await publishAs(ownerUserId, {
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
    });

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

  it('permite ao dono arquivar e reativar anúncio, retirando-o da busca enquanto arquivado', async () => {
    const listingId = await createListing({
      seed: 60,
      city: 'Maceió',
      neighborhood: 'Farol',
      status: 'APPROVED',
    });
    const token = await tokenForListingOwner(listingId);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app.getHttpServer())
      .patch(`/properties/${listingId}/status`)
      .send({ status: 'ARCHIVED' })
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/properties/${listingId}/status`)
      .set(auth)
      .send({ status: 'ARCHIVED' })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ listingId, status: 'ARCHIVED' }),
      );

    expect(
      (await prisma.listing.findUnique({ where: { id: listingId } }))?.status,
    ).toBe('ARCHIVED');
    await request(app.getHttpServer())
      .get('/properties?location=Farol')
      .expect(200)
      .expect([]);

    await request(app.getHttpServer())
      .patch(`/properties/${listingId}/status`)
      .set(auth)
      .send({ status: 'APPROVED' })
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('APPROVED'));

    await request(app.getHttpServer())
      .get('/properties?location=Farol')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].listingId).toBe(listingId);
      });
  });

  it('impede que outro usuário arquive anúncio alheio', async () => {
    const listingId = await createListing({
      seed: 70,
      city: 'Maceió',
      neighborhood: 'Farol',
      status: 'APPROVED',
    });
    const otherUserId = await createUser(72);
    const token = await app.get(AuthTokenService).sign(otherUserId);

    await request(app.getHttpServer())
      .patch(`/properties/${listingId}/status`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ status: 'ARCHIVED' })
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe('LISTING_NOT_FOUND'));
  });

  it('desativa anúncio após a confirmação do front e impede sua reativação', async () => {
    const listingId = await createListing({
      seed: 80,
      city: 'Maceió',
      neighborhood: 'Farol',
      status: 'APPROVED',
    });
    const token = await tokenForListingOwner(listingId);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app.getHttpServer())
      .delete(`/properties/${listingId}`)
      .set(auth)
      .expect(204);

    expect(
      (await prisma.listing.findUnique({ where: { id: listingId } }))?.status,
    ).toBe('REMOVED');
    await request(app.getHttpServer())
      .get(`/properties/${listingId}`)
      .expect(404);
    await request(app.getHttpServer())
      .get('/properties?location=Farol')
      .expect(200)
      .expect([]);

    await request(app.getHttpServer())
      .patch(`/properties/${listingId}/status`)
      .set(auth)
      .send({ status: 'APPROVED' })
      .expect(409)
      .expect(({ body }) =>
        expect(body.code).toBe('INVALID_LISTING_TRANSITION'),
      );
  });

  async function adminAuth(
    seed: number,
    permissions: string[] = ['MODERATE_LISTINGS'],
  ): Promise<{ Authorization: string }> {
    const userId = await createUser(seed);
    const token = await app
      .get(AuthTokenService)
      .signAdministrator(userId, randomUUID(), permissions);
    return { Authorization: `Bearer ${token}` };
  }

  it('admin aprova anúncio pendente e ele passa a aparecer na busca', async () => {
    const listingId = await createListing({
      seed: 90,
      city: 'Maceió',
      neighborhood: 'Jatiúca',
      status: 'PENDING',
    });
    await request(app.getHttpServer())
      .get('/properties?location=Jatiúca')
      .expect(200)
      .expect([]);

    await request(app.getHttpServer())
      .patch(`/admin/listings/${listingId}/status`)
      .set(await adminAuth(91))
      .send({ status: 'APPROVED' })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ listingId, status: 'APPROVED' }),
      );

    await request(app.getHttpServer())
      .get('/properties?location=Jatiúca')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].listingId).toBe(listingId);
      });
  });

  it('admin rejeita anúncio pendente, que fica fora da busca e pode ser aprovado depois', async () => {
    const listingId = await createListing({
      seed: 92,
      city: 'Maceió',
      neighborhood: 'Pajuçara',
      status: 'PENDING',
    });
    const auth = await adminAuth(93);

    await request(app.getHttpServer())
      .patch(`/admin/listings/${listingId}/status`)
      .set(auth)
      .send({ status: 'REJECTED' })
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('REJECTED'));
    await request(app.getHttpServer())
      .get(`/properties/${listingId}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/admin/listings/${listingId}/status`)
      .set(auth)
      .send({ status: 'APPROVED' })
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('APPROVED'));
  });

  it('moderação recusa transição inválida, status desconhecido e anúncio inexistente', async () => {
    const listingId = await createListing({
      seed: 94,
      city: 'Maceió',
      neighborhood: 'Gruta',
      status: 'APPROVED',
    });
    const auth = await adminAuth(95);

    await request(app.getHttpServer())
      .patch(`/admin/listings/${listingId}/status`)
      .set(auth)
      .send({ status: 'REJECTED' })
      .expect(409)
      .expect(({ body }) =>
        expect(body.code).toBe('INVALID_LISTING_TRANSITION'),
      );
    await request(app.getHttpServer())
      .patch(`/admin/listings/${listingId}/status`)
      .set(auth)
      .send({ status: 'REMOVED' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/admin/listings/${randomUUID()}/status`)
      .set(auth)
      .send({ status: 'APPROVED' })
      .expect(404);
  });

  it('moderação exige token de administrador com MODERATE_LISTINGS', async () => {
    const listingId = await createListing({
      seed: 96,
      city: 'Maceió',
      neighborhood: 'Farol',
      status: 'PENDING',
    });
    const route = `/admin/listings/${listingId}/status`;

    await request(app.getHttpServer())
      .patch(route)
      .send({ status: 'APPROVED' })
      .expect(401);
    await request(app.getHttpServer())
      .patch(route)
      .set('Authorization', `Bearer ${await tokenForListingOwner(listingId)}`)
      .send({ status: 'APPROVED' })
      .expect(401);
    await request(app.getHttpServer())
      .patch(route)
      .set(await adminAuth(97, ['MANAGE_USERS']))
      .send({ status: 'APPROVED' })
      .expect(403);

    expect(
      (await prisma.listing.findUnique({ where: { id: listingId } }))?.status,
    ).toBe('PENDING');
  });
});
