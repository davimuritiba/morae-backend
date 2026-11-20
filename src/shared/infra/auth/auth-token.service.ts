import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AuthTokenPayload {
  userId: string;
  administratorId?: string;
  permissions?: string[];
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }

  signAdministrator(
    userId: string,
    administratorId: string,
    permissions: readonly string[],
  ): Promise<string> {
    return this.jwt.signAsync({
      sub: userId,
      administratorId,
      permissions: [...permissions],
    });
  }

  async verify(token: string): Promise<AuthTokenPayload | null> {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub?: unknown;
        administratorId?: unknown;
        permissions?: unknown;
      }>(token);
      if (typeof payload.sub !== 'string') return null;

      return {
        userId: payload.sub,
        ...(typeof payload.administratorId === 'string'
          ? { administratorId: payload.administratorId }
          : {}),
        ...(Array.isArray(payload.permissions) &&
        payload.permissions.every((permission) => typeof permission === 'string')
          ? { permissions: payload.permissions }
          : {}),
      };
    } catch {
      return null;
    }
  }
}
