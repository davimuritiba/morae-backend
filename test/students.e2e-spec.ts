import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/shared/infra/database/prisma.service.js';
import { resetDatabase } from './integration/reset-database.js';

const validBody = {
  name: 'Maria Silva',
  email: 'maria@ufal.br',
  cpf: '529.982.247-25',
  password: 'senha-segura-123',
  phone: '(82) 99999-1234',
  enrollmentNumber: '20231234',
  course: 'Ciência da Computação',
  period: 3,
  expectedGraduation: '2027-12-15',
};

describe('POST /students (e2e)', () => {
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
    return request(app.getHttpServer()).post('/students').send(body);
  }

  it('201: cadastra o estudante e devolve só os ids', async () => {
    const response = await post(validBody).expect(201);

    expect(Object.keys(response.body).sort()).toEqual(['studentId', 'userId']);
    const user = await prisma.user.findUnique({
      where: { id: response.body.userId },
      include: { student: true },
    });
    expect(user?.student?.id).toBe(response.body.studentId);
    expect(user?.passwordHash.startsWith('$argon2id$')).toBe(true);
  });

  it('201: telefone é opcional', async () => {
    const { phone: _phone, ...withoutPhone } = validBody;

    await post(withoutPhone).expect(201);
  });

  it('não devolve senha, hash nem CPF na resposta', async () => {
    const response = await post(validBody).expect(201);

    expect(response.text).not.toContain('senha-segura-123');
    expect(response.text).not.toContain('$argon2');
    expect(response.text).not.toContain('52998224725');
  });

  it('409: e-mail já cadastrado', async () => {
    await post(validBody).expect(201);

    const response = await post({
      ...validBody,
      cpf: '111.444.777-35',
      enrollmentNumber: '20239999',
    }).expect(409);

    expect(response.body).toEqual({
      statusCode: 409,
      code: 'EMAIL_ALREADY_IN_USE',
      message: expect.any(String),
    });
  });

  it.each([
    ['CPF inválido', { cpf: '529.982.247-24' }, 'INVALID_CPF'],
    ['e-mail inválido', { email: 'maria' }, 'INVALID_EMAIL'],
    ['senha curta', { password: 'curta' }, 'INVALID_PASSWORD'],
    ['período fora do limite', { period: 0 }, 'INVALID_ACADEMIC_PERIOD'],
  ])('422: %s', async (_case, override, code) => {
    const response = await post({ ...validBody, ...override }).expect(422);

    expect(response.body.code).toBe(code);
    expect(await prisma.user.count()).toBe(0);
  });

  it.each([
    ['corpo vazio', {}],
    ['campo obrigatório ausente', { ...validBody, email: undefined }],
    ['campo não declarado no DTO', { ...validBody, role: 'ADMIN' }],
    ['período como texto', { ...validBody, period: '3' }],
    ['data que não existe', { ...validBody, expectedGraduation: '2027-02-30' }],
  ])('400: %s', async (_case, body) => {
    await post(body).expect(400);

    expect(await prisma.user.count()).toBe(0);
  });
});
