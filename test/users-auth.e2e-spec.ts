import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { Argon2Hasher } from '../src/modules/user/infra/services/argon2-hasher.js';
import { PrismaService } from '../src/shared/infra/database/prisma.service.js';
import { validCpf } from './helpers/valid-cpf.js';
import { resetDatabase } from './integration/reset-database.js';

const PASSWORD = 'senha-segura-123';

describe('Usuários e login (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let passwordHash: string;
  let cpfCounter = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    passwordHash = await new Argon2Hasher().hash(PASSWORD);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  const http = () => request(app.getHttpServer());

  async function createUser(name: string) {
    const id = randomUUID();
    const email = `${id}@ufal.br`;
    cpfCounter += 1;
    await prisma.user.create({
      data: {
        id,
        name,
        email,
        cpf: validCpf(cpfCounter),
        passwordHash,
        phone: '82999990000',
        emailVerified: true,
        updatedAt: new Date(),
      },
    });
    const { body } = await http()
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);
    return { id, email, token: body.accessToken as string };
  }

  describe('GET /users', () => {
    it('exige token', async () => {
      await http().get(`/users/${randomUUID()}`).expect(401);
      await http().get('/users/me').expect(401);
    });

    it('devolve os dados completos só para o próprio usuário', async () => {
      const ana = await createUser('Ana');
      const bruno = await createUser('Bruno');
      const auth = { Authorization: `Bearer ${ana.token}` };

      const me = await http().get('/users/me').set(auth).expect(200);
      expect(me.body).toMatchObject({
        userId: ana.id,
        email: ana.email,
        phone: '82999990000',
      });

      const self = await http().get(`/users/${ana.id}`).set(auth).expect(200);
      expect(self.body).toEqual(me.body);

      const other = await http()
        .get(`/users/${bruno.id}`)
        .set(auth)
        .expect(200);
      expect(other.body).toEqual({
        userId: bruno.id,
        name: 'Bruno',
        photoUrl: null,
      });

      await http()
        .get(`/users/${randomUUID()}`)
        .set(auth)
        .expect(404)
        .expect((r) => expect(r.body.code).toBe('USER_NOT_FOUND'));
    });
  });

  describe('POST /auth/admin/login', () => {
    it('autentica o administrador', async () => {
      const user = await createUser('Admin');
      await prisma.administrator.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          login: 'admin',
          passwordHash,
          permissions: ['MODERATE_LISTINGS'],
          updatedAt: new Date(),
        },
      });

      const { body } = await http()
        .post('/auth/admin/login')
        .send({ login: 'Admin', password: PASSWORD })
        .expect(201);
      expect(body).toMatchObject({
        userId: user.id,
        login: 'admin',
        permissions: ['MODERATE_LISTINGS'],
      });
    });
  });

  describe('limite de tentativas de login', () => {
    it('bloqueia a conta após 10 tentativas, sem afetar outras contas', async () => {
      const ana = await createUser('Ana');
      const bruno = await createUser('Bruno');

      for (let attempt = 0; attempt < 9; attempt += 1) {
        await http()
          .post('/auth/login')
          .send({ email: ana.email, password: 'errada' })
          .expect(401);
      }
      await http()
        .post('/auth/login')
        .send({ email: ana.email.toUpperCase(), password: PASSWORD })
        .expect(429);

      await http()
        .post('/auth/login')
        .send({ email: bruno.email, password: PASSWORD })
        .expect(201);
    });
  });
});
