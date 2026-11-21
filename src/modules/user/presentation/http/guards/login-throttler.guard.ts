import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const body = (req['body'] ?? {}) as Record<string, unknown>;
    const account = body['email'] ?? body['login'];
    const normalized =
      typeof account === 'string' ? account.trim().toLowerCase() : '';
    return Promise.resolve(`${String(req['ip'])}:${normalized}`);
  }
}
