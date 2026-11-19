import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../presentation/guards/jwt-auth.guard.js';
import { envPositiveInt, requireEnv } from '../config/env.js';
import { AuthTokenService } from './auth-token.service.js';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireEnv('JWT_SECRET'),
        signOptions: {
          expiresIn: envPositiveInt('JWT_EXPIRES_IN_MINUTES', 60) * 60,
        },
      }),
    }),
  ],
  providers: [AuthTokenService, JwtAuthGuard],
  exports: [AuthTokenService, JwtAuthGuard],
})
export class AuthModule {}
