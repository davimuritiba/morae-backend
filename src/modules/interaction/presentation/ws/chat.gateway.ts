import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthTokenService } from '../../../../shared/infra/auth/auth-token.service.js';

export const CHAT_NAMESPACE = '/chat';

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

@WebSocketGateway({ namespace: CHAT_NAMESPACE, cors: { origin: true } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly tokens: AuthTokenService) {}

  async handleConnection(client: Socket): Promise<void> {
    const payload = await this.tokens.verify(tokenFrom(client));
    if (!payload) {
      client.emit('error', { code: 'UNAUTHORIZED' });
      client.disconnect(true);
      return;
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
