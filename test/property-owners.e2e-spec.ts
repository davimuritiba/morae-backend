import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/shared/infra/database/prisma.service.js';
import { resetDatabase } from './integration/reset-database.js';

const validBody = {
  name: 'Ana Proprietária',
  email: 'ana@example.com',
  cpf: '529.982.247-25',
  password: 'senha-segura-123',
  phone: '(82) 99999-1234',
};

describe('POST /property-owners (e2e)', () => {
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

  function post(body: object) {
    return request(app.getHttpServer()).post('/property-owners').send(body);
  }

  it('cria a conta e o perfil de proprietário vinculados e envia verificação de e-mail', async () => {
    const response = await post(validBody).expect(201);
    expect(Object.keys(response.body).sort()).toEqual([
      'propertyOwnerId',
      'userId',
    ]);
    const user = await prisma.user.findUnique({
      where: { id: response.body.userId },
      include: { propertyOwner: true },
    });
    expect(user?.propertyOwner?.id).toBe(response.body.propertyOwnerId);
    expect(user?.propertyOwner?.userId).toBe(user?.id);
    expect(user?.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(
      await prisma.emailVerificationToken.count({
        where: { userId: user!.id },
      }),
    ).toBe(1);
  });

  it.each([
    ['e-mail inválido', { email: 'invalido' }],
    ['CPF inválido', { cpf: '123' }],
    ['senha curta', { password: 'curta' }],
    ['campo extra', { role: 'ADMIN' }],
  ])('rejeita %s sem criar conta', async (_label, override) => {
    await post({ ...validBody, ...override }).expect(
      'role' in override ? 400 : 422,
    );
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.propertyOwner.count()).toBe(0);
  });
});
