import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminPermissionsGuard } from '../../presentation/guards/admin-permissions.guard.js';
import { JwtAuthGuard } from '../../presentation/guards/jwt-auth.guard.js';
import { envPositiveInt, requireEnv } from '../config/env.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthTokenService } from './auth-token.service.js';

@Global()
@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = requireEnv('JWT_SECRET');
        if (Buffer.byteLength(secret, 'utf8') < 32) {
          throw new Error('JWT_SECRET precisa ter ao menos 32 bytes.');
        }

        return {
          secret,
          signOptions: {
            expiresIn: envPositiveInt('JWT_EXPIRES_IN_MINUTES', 60) * 60,
          },
        };
      },
    }),
  ],
  providers: [AuthTokenService, JwtAuthGuard, AdminPermissionsGuard],
  exports: [AuthTokenService, JwtAuthGuard, AdminPermissionsGuard],
})
export class AuthModule {}
