import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { Argon2Hasher } from '../src/modules/user/infra/services/argon2-hasher.js';
import { PrismaService } from '../src/shared/infra/database/prisma.service.js';
import { validCpf } from './helpers/valid-cpf.js';
import { resetDatabase } from './integration/reset-database.js';

const PASSWORD = 'senha-segura-123';

interface TestUser {
  id: string;
  token: string;
}

describe('Chat (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let baseUrl: string;
  let passwordHash: string;
  let cpfCounter = 0;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    baseUrl = await app.getUrl();
    prisma = app.get(PrismaService);
    passwordHash = await new Argon2Hasher().hash(PASSWORD);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) socket.disconnect();
  });

  const http = () => request(app.getHttpServer());

  async function createUser(
    name: string,
    emailVerified = true,
    profile: 'student' | 'propertyOwner' = 'student',
  ): Promise<TestUser> {
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
        // O login exige e-mail confirmado; o "pendente" perde a confirmação
        // depois (como quem troca de e-mail no perfil).
        emailVerified: true,
        updatedAt: new Date(),
      },
    });
    if (profile === 'student') {
      await prisma.student.create({
        data: {
          id: randomUUID(),
          userId: id,
          enrollmentNumber: `TST${String(cpfCounter).padStart(10, '0')}`,
          course: 'Ciência da Computação',
          period: 1,
          expectedGraduation: new Date('2027-12-31T00:00:00.000Z'),
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.propertyOwner.create({
        data: { id: randomUUID(), userId: id, updatedAt: new Date() },
      });
    }

    const response = await http()
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);
    expect(response.body.tokenType).toBe('Bearer');
    if (!emailVerified) {
      await prisma.user.update({
        where: { id },
        data: { emailVerified: false },
      });
    }
    return { id, token: response.body.accessToken as string };
  }

  function as(user: TestUser) {
    const auth = { Authorization: `Bearer ${user.token}` };
    return {
      get: (url: string) => http().get(url).set(auth),
      post: (url: string, body?: object) =>
        http()
          .post(url)
          .set(auth)
          .send(body ?? {}),
    };
  }

  function connect(token: string): Socket {
    const socket = io(`${baseUrl}/chat`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });
    sockets.push(socket);
    return socket;
  }

  function nextEvent<T>(socket: Socket, event: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`sem evento ${event}`)),
        3000,
      );
      socket.once(event, (payload: T) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });
  }

  it('exige token', async () => {
    await http().get('/chats').expect(401);
    await http()
      .get('/chats')
      .set('Authorization', 'Bearer token-invalido')
      .expect(401);
  });

  it('restringe o chat a estudantes também no HTTP e no WebSocket', async () => {
    const owner = await createUser('Proprietário', true, 'propertyOwner');

    await as(owner)
      .get('/chats')
      .expect(403)
      .expect((r) => expect(r.body.code).toBe('ACCOUNT_TYPE_ACCESS_DENIED'));

    const socket = connect(owner.token);
    const rejected = nextEvent<Error>(socket, 'connect_error');
    await expect(rejected).resolves.toMatchObject({
      message: 'ACCOUNT_TYPE_ACCESS_DENIED',
    });
    expect(socket.connected).toBe(false);
  });

  it('fluxo completo de conversa direta', async () => {
    const ana = await createUser('Ana');
    const bruno = await createUser('Bruno');

    const started = await as(ana)
      .post('/chats/direct', { targetUserId: bruno.id })
      .expect(201);
    const chatId = started.body.id as string;
    expect(started.body.type).toBe('DIRECT');
    expect(
      (started.body.participants as { name: string }[]).map((p) => p.name),
    ).toEqual(expect.arrayContaining(['Ana', 'Bruno']));

    const again = await as(bruno)
      .post('/chats/direct', { targetUserId: ana.id })
      .expect(200);
    expect(again.body.id).toBe(chatId);

    const sent = await as(ana)
      .post(`/chats/${chatId}/messages`, { content: '  Oi, Bruno!  ' })
      .expect(201);
    expect(sent.body).toMatchObject({
      chatId,
      senderId: ana.id,
      content: 'Oi, Bruno!',
      listingId: null,
    });

    const inbox = await as(bruno).get('/chats').expect(200);
    expect(inbox.body.nextCursor).toBeNull();
    expect(inbox.body.data).toHaveLength(1);
    expect(inbox.body.data[0]).toMatchObject({
      id: chatId,
      unreadCount: 1,
      lastMessage: { id: sent.body.id, content: 'Oi, Bruno!' },
    });

    const history = await as(bruno)
      .get(`/chats/${chatId}/messages?limit=10`)
      .expect(200);
    expect(history.body.data.map((m: { id: string }) => m.id)).toEqual([
      sent.body.id,
    ]);

    await as(bruno).post(`/chats/${chatId}/read`).expect(204);
    const afterRead = await as(bruno).get(`/chats/${chatId}`).expect(200);
    expect(afterRead.body.unreadCount).toBe(0);
  });

  it('pagina o histórico com cursor', async () => {
    const ana = await createUser('Ana');
    const bruno = await createUser('Bruno');
    const { body: chat } = await as(ana)
      .post('/chats/direct', { targetUserId: bruno.id })
      .expect(201);

    for (const text of ['1', '2', '3']) {
      await as(ana)
        .post(`/chats/${chat.id}/messages`, { content: text })
        .expect(201);
    }

    const first = await as(ana)
      .get(`/chats/${chat.id}/messages?limit=2`)
      .expect(200);
    expect(first.body.data.map((m: { content: string }) => m.content)).toEqual([
      '3',
      '2',
    ]);

    const second = await as(ana)
      .get(`/chats/${chat.id}/messages?limit=2&cursor=${first.body.nextCursor}`)
      .expect(200);
    expect(second.body.data.map((m: { content: string }) => m.content)).toEqual(
      ['1'],
    );
    expect(second.body.nextCursor).toBeNull();

    await as(ana).get(`/chats/${chat.id}/messages?cursor=lixo`).expect(400);
  });

  it('cria grupo e entrega mensagens a todos', async () => {
    const ana = await createUser('Ana');
    const bruno = await createUser('Bruno');
    const carla = await createUser('Carla');

    const { body: group } = await as(ana)
      .post('/chats/groups', {
        name: 'República',
        memberIds: [bruno.id, carla.id],
      })
      .expect(201);
    expect(group).toMatchObject({ type: 'GROUP', name: 'República' });

    await as(bruno)
      .post(`/chats/${group.id}/messages`, { content: 'Oi, gente' })
      .expect(201);

    const { body } = await as(carla).get(`/chats/${group.id}`).expect(200);
    expect(body.unreadCount).toBe(1);
  });

  it('responde com os erros esperados', async () => {
    const ana = await createUser('Ana');
    const bruno = await createUser('Bruno');
    const outsider = await createUser('Fora');
    const pending = await createUser('Pendente', false);

    await as(ana).post('/chats/direct', {}).expect(400);
    await as(ana)
      .post('/chats/direct', {
        targetUserId: bruno.id,
        listingId: randomUUID(),
      })
      .expect(400);
    await as(ana)
      .post('/chats/direct', { targetUserId: ana.id })
      .expect(422)
      .expect((r) => expect(r.body.code).toBe('CANNOT_CHAT_WITH_YOURSELF'));
    await as(ana)
      .post('/chats/direct', { targetUserId: pending.id })
      .expect(422)
      .expect((r) => expect(r.body.code).toBe('CHAT_USER_UNAVAILABLE'));
    await as(pending)
      .get('/chats')
      .expect(403)
      .expect((r) => expect(r.body.code).toBe('EMAIL_NOT_VERIFIED'));
    await as(ana)
      .post('/chats/direct', { listingId: randomUUID() })
      .expect(404)
      .expect((r) => expect(r.body.code).toBe('LISTING_NOT_FOUND'));

    const { body: chat } = await as(ana)
      .post('/chats/direct', { targetUserId: bruno.id })
      .expect(201);

    await as(outsider)
      .get(`/chats/${chat.id}`)
      .expect(404)
      .expect((r) => expect(r.body.code).toBe('CHAT_NOT_FOUND'));
    await as(outsider)
      .post(`/chats/${chat.id}/messages`, { content: 'oi' })
      .expect(404);
    await as(ana)
      .post(`/chats/${chat.id}/messages`, { content: '   ' })
      .expect(422)
      .expect((r) => expect(r.body.code).toBe('EMPTY_MESSAGE'));
    await as(ana)
      .post(`/chats/${chat.id}/messages`, { content: 'a'.repeat(2001) })
      .expect(422)
      .expect((r) => expect(r.body.code).toBe('INVALID_MESSAGE_CONTENT'));
    await as(ana).get('/chats/nao-e-uuid').expect(404);
  });

  describe('WebSocket', () => {
    it('entrega nova mensagem e leitura em tempo real', async () => {
      const ana = await createUser('Ana');
      const bruno = await createUser('Bruno');
      const { body: chat } = await as(ana)
        .post('/chats/direct', { targetUserId: bruno.id })
        .expect(201);

      const brunoSocket = connect(bruno.token);
      const anaSocket = connect(ana.token);
      await Promise.all([
        nextEvent(brunoSocket, 'connect'),
        nextEvent(anaSocket, 'connect'),
      ]);

      const received = nextEvent<{ id: string; content: string }>(
        brunoSocket,
        'message:new',
      );
      const { body: sent } = await as(ana)
        .post(`/chats/${chat.id}/messages`, { content: 'Tempo real!' })
        .expect(201);
      expect(await received).toEqual(sent);

      const read = nextEvent<{ chatId: string; userId: string }>(
        anaSocket,
        'chat:read',
      );
      await as(bruno).post(`/chats/${chat.id}/read`).expect(204);
      expect(await read).toMatchObject({ chatId: chat.id, userId: bruno.id });
    });

    it('rejeita conexão sem token válido', async () => {
      const socket = connect('token-invalido');

      await expect(
        nextEvent<Error>(socket, 'connect_error'),
      ).resolves.toMatchObject({ message: 'UNAUTHORIZED' });
      expect(socket.connected).toBe(false);
    });
  });
});
