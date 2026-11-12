import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/shared/infra/database/prisma.service.js';
import {
  clearMailpit,
  listMessages,
  verificationTokenFrom,
  waitForMessages,
} from './integration/mailpit.js';
import { resetDatabase } from './integration/reset-database.js';

const EMAIL = 'maria@ufal.br';

const studentBody = {
  name: 'Maria Silva',
  email: EMAIL,
  cpf: '529.982.247-25',
  password: 'senha-segura-123',
  enrollmentNumber: '20231234',
  course: 'Ciência da Computação',
  period: 3,
  expectedGraduation: '2027-12-15',
};

// Fluxo completo: o cadastro envia o e-mail de verdade para o Mailpit, o
// teste lê o link de lá e confirma pela API, como o front-end faria.
describe('Verificação de e-mail (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Uma app nova por teste: os limites de requisição começam zerados.
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    await clearMailpit();
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function register(): Promise<string> {
    const response = await http()
      .post('/students')
      .send(studentBody)
      .expect(201);
    return response.body.userId as string;
  }

  async function emailVerified(userId: string): Promise<boolean> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return user.emailVerified;
  }

  it('o cadastro envia o link e a confirmação verifica o e-mail', async () => {
    const userId = await register();

    const [message] = await waitForMessages(EMAIL, 1);
    expect(message.Subject).toBe('Confirme seu e-mail no Moraê');
    const token = await verificationTokenFrom(message.ID);

    await http()
      .post('/email-verification/confirm')
      .send({ token })
      .expect(204);

    expect(await emailVerified(userId)).toBe(true);
  });

  it('não aceita o mesmo link duas vezes', async () => {
    await register();
    const [message] = await waitForMessages(EMAIL, 1);
    const token = await verificationTokenFrom(message.ID);
    await http()
      .post('/email-verification/confirm')
      .send({ token })
      .expect(204);

    const response = await http()
      .post('/email-verification/confirm')
      .send({ token })
      .expect(422);

    expect(response.body.code).toBe('INVALID_EMAIL_VERIFICATION_TOKEN');
  });

  it('422 para token desconhecido e 400 para corpo inválido', async () => {
    const response = await http()
      .post('/email-verification/confirm')
      .send({ token: 'token-que-nao-existe' })
      .expect(422);
    expect(response.body.code).toBe('INVALID_EMAIL_VERIFICATION_TOKEN');

    await http().post('/email-verification/confirm').send({}).expect(400);
    await http()
      .post('/email-verification/confirm')
      .send({ token: 'x'.repeat(200) })
      .expect(400);
  });

  it('o reenvio gera um link novo e invalida o anterior', async () => {
    const userId = await register();
    const [first] = await waitForMessages(EMAIL, 1);
    const oldToken = await verificationTokenFrom(first.ID);

    await http()
      .post('/email-verification/resend')
      .send({ email: EMAIL })
      .expect(202);

    const messages = await waitForMessages(EMAIL, 2);
    const latest = messages.find((m) => m.ID !== first.ID)!;
    const newToken = await verificationTokenFrom(latest.ID);
    expect(newToken).not.toBe(oldToken);

    await http()
      .post('/email-verification/confirm')
      .send({ token: oldToken })
      .expect(422);
    await http()
      .post('/email-verification/confirm')
      .send({ token: newToken })
      .expect(204);
    expect(await emailVerified(userId)).toBe(true);
  });

  it('o reenvio responde 202 igual para e-mail sem conta, sem enviar nada', async () => {
    await http()
      .post('/email-verification/resend')
      .send({ email: 'ninguem@ufal.br' })
      .expect(202);
    await http()
      .post('/email-verification/resend')
      .send({ email: 'formato-invalido' })
      .expect(202);

    // O envio é em segundo plano: dá tempo para um eventual e-mail chegar.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await listMessages()).toHaveLength(0);
  });

  it('limita o reenvio a 3 pedidos por IP', async () => {
    for (let i = 0; i < 3; i++) {
      await http()
        .post('/email-verification/resend')
        .send({ email: 'ninguem@ufal.br' })
        .expect(202);
    }

    await http()
      .post('/email-verification/resend')
      .send({ email: 'ninguem@ufal.br' })
      .expect(429);
  });
});
