import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/shared/infra/database/prisma.service.js';
import { compatibilityAnswers } from './helpers/compatibility-answers.js';
import { resetDatabase } from './integration/reset-database.js';

const password = 'senha-segura-123';
const student = {
  name: 'Maria Silva',
  email: 'maria@ufal.br',
  cpf: '529.982.247-25',
  password,
  phone: '(82) 99999-1234',
  enrollmentNumber: '20231234',
  course: 'Ciência da Computação',
  period: 3,
  expectedGraduation: '2027-12-15',
  compatibilityAnswers,
};

describe('PATCH /users/me (e2e)', () => {
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

  async function authenticate(options: {
    profileDetails?: {
      birthDate: string;
      gender: string;
      university: string;
      campus: string;
    };
    profileData?: Record<string, unknown>;
  } = {}) {
    const registration = await request(app.getHttpServer())
      .post('/students')
      .send({ ...student, ...options })
      .expect(201);
    // O login exige e-mail confirmado; o fluxo do link é coberto em
    // email-verification.e2e-spec.ts.
    await prisma.user.update({
      where: { id: registration.body.userId as string },
      data: { emailVerified: true },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: student.email, password })
      .expect(201);
    return {
      userId: registration.body.userId as string,
      token: login.body.accessToken as string,
    };
  }

  it('exige autenticação', async () => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .send({ name: 'Novo nome' })
      .expect(401);
  });

  it('retorna dados de perfil enviados no cadastro', async () => {
    const profileDetails = {
      birthDate: '2000-03-31',
      gender: 'NON_BINARY',
      university: 'UFAL',
      campus: 'A. C. Simoes',
    };
    const { token } = await authenticate({ profileDetails });

    const response = await request(app.getHttpServer())
      .get('/users/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      student: {
        university: profileDetails.university,
        campus: profileDetails.campus,
      },
      private: {
        birthDate: profileDetails.birthDate,
        gender: profileDetails.gender,
      },
    });
  });

  it('retorna os campos de perfil salvos no profileData legado', async () => {
    const profileData = {
      birthDate: '2000-03-31',
      gender: 'Não binário',
      university: 'UFAL',
      campus: 'A. C. Simoes',
    };
    const { token } = await authenticate({ profileData });

    const response = await request(app.getHttpServer())
      .get('/users/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      student: {
        university: profileData.university,
        campus: profileData.campus,
      },
      private: {
        birthDate: profileData.birthDate,
        gender: 'NON_BINARY',
      },
    });
  });

  it('atualiza e persiste somente os dados permitidos da conta autenticada', async () => {
    const { userId, token } = await authenticate();
    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Maria Oliveira', phone: null, cpf: '111.444.777-35' })
      .expect(200);

    expect(response.body).toMatchObject({
      userId,
      name: 'Maria Oliveira',
      phone: null,
      email: student.email,
    });
    expect(response.text).not.toContain('11144477735');
    expect(response.text).not.toContain('passwordHash');
    const saved = await prisma.user.findUnique({ where: { id: userId } });
    expect(saved).toMatchObject({
      name: 'Maria Oliveira',
      phone: null,
      cpf: '11144477735',
    });
  });

  it('rejeita dados inválidos e campos fora do DTO sem alterar a conta', async () => {
    const { userId, token } = await authenticate();
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ cpf: '111.111.111-11' })
      .expect(422);
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'nova-senha' })
      .expect(400);

    const saved = await prisma.user.findUnique({ where: { id: userId } });
    expect(saved?.cpf).toBe('52998224725');
  });
});
