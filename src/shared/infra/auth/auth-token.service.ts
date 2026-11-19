import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AuthTokenPayload {
  userId: string;
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }

  async verify(token: string): Promise<AuthTokenPayload | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token);
      return typeof payload.sub === 'string' ? { userId: payload.sub } : null;
    } catch {
      return null;
    }
  }
}
