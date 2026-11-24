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
    const cpf = validCpf(cpfCounter);
    await prisma.user.create({
      data: {
        id,
        name,
        email,
        cpf,
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
    return { id, email, cpf, token: body.accessToken as string };
  }

  describe('POST /registration/availability', () => {
    it('checks validity and uniqueness without creating records', async () => {
      const existing = await createUser('Existente');
      await prisma.student.create({
        data: {
          id: randomUUID(),
          userId: existing.id,
          enrollmentNumber: '20231234',
          course: 'Ciência da Computação',
          period: 1,
          expectedGraduation: new Date('2027-12-31T00:00:00.000Z'),
          updatedAt: new Date(),
        },
      });

      const usersBefore = await prisma.user.count();
      const studentsBefore = await prisma.student.count();

      const duplicate = await http()
        .post('/registration/availability')
        .send({
          cpf: existing.cpf,
          email: existing.email.toUpperCase(),
          enrollmentNumber: '20231234',
        })
        .expect(200);
      expect(duplicate.body).toEqual({
        cpf: { valid: true, unique: false },
        email: { valid: true, unique: false },
        enrollmentNumber: { valid: true, unique: false },
      });

      const invalid = await http()
        .post('/registration/availability')
        .send({
          cpf: '111.111.111-11',
          email: 'not-an-email',
          enrollmentNumber: 'abc',
        })
        .expect(200);
      expect(invalid.body).toEqual({
        cpf: { valid: false, unique: null },
        email: { valid: false, unique: null },
        enrollmentNumber: { valid: false, unique: null },
      });

      const available = await http()
        .post('/registration/availability')
        .send({
          cpf: '111.444.777-35',
          email: 'disponivel@example.com',
          enrollmentNumber: '20239999',
        })
        .expect(200);
      expect(available.body).toEqual({
        cpf: { valid: true, unique: true },
        email: { valid: true, unique: true },
        enrollmentNumber: { valid: true, unique: true },
      });

      await http()
        .post('/registration/availability')
        .send({})
        .expect(400);

      expect(await prisma.user.count()).toBe(usersBefore);
      expect(await prisma.student.count()).toBe(studentsBefore);
    });
  });

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
        cpf: ana.cpf,
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

    it('autentica o administrador mesmo com CPF inválido no usuário associado', async () => {
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
      await prisma.user.update({
        where: { id: user.id },
        data: { cpf: 'invalid-cpf' },
      });

      for (const login of ['admin', user.email]) {
        const { body } = await http()
          .post('/auth/admin/login')
          .send({ login, password: PASSWORD })
          .expect(201);
        expect(body).toMatchObject({
          userId: user.id,
          login: 'admin',
          permissions: ['MODERATE_LISTINGS'],
        });
      }
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
