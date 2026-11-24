import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import {
  STUDENT_ACCOUNT_TYPES,
  type AccountType,
} from '../../../user/domain/enums/account-type.enum.js';
import { ACCOUNT_TYPE_ACCESS_DENIED } from '../../../user/domain/errors/account-type-access-denied.error.js';
import { UserRepository } from '../../../user/domain/repositories/user.repository.js';
import { AuthTokenService } from '../../../../shared/infra/auth/auth-token.service.js';

export const CHAT_NAMESPACE = '/chat';

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

@WebSocketGateway({ namespace: CHAT_NAMESPACE, cors: { origin: true } })
export class ChatGateway implements OnGatewayInit<Namespace> {
  @WebSocketServer()
  server: Namespace;

  constructor(
    private readonly tokens: AuthTokenService,
    private readonly users: UserRepository,
  ) {}

  afterInit(namespace: Namespace): void {
    namespace.use((client, next) => {
      void this.authorize(client).then(
        () => next(),
        (error: unknown) =>
          next(error instanceof Error ? error : new Error('UNAUTHORIZED')),
      );
    });
  }

  private async authorize(client: Socket): Promise<void> {
    const payload = await this.tokens.verify(tokenFrom(client));
    if (!payload) {
      throw new Error('UNAUTHORIZED');
    }

    const accountType: AccountType = await this.users.findAccountType(
      payload.userId,
    );
    if (!STUDENT_ACCOUNT_TYPES.includes(accountType)) {
      throw new Error(ACCOUNT_TYPE_ACCESS_DENIED);
    }

    client.data.userId = payload.userId;
    await client.join(userRoom(payload.userId));
  }
}

function tokenFrom(client: Socket): string {
  const fromAuth: unknown = client.handshake.auth?.['token'];
  if (typeof fromAuth === 'string') return fromAuth.replace(/^Bearer /, '');

  const header = client.handshake.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
}
