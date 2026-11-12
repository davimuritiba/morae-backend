import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { UserModule } from './modules/user/user.module.js';
import { DatabaseModule } from './shared/infra/database/database.module.js';
import { DomainErrorFilter } from './shared/presentation/filters/domain-error.filter.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    // Credenciais vêm do ambiente, nunca do código versionado. Sem elas o
    // coletor responde 401 e a telemetria é descartada.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? '',
      appSecret: process.env.OBSERVE_APP_SECRET ?? '',
      serviceId: 'morae-backend',
    }),
    DatabaseModule,
    UserModule,
  ],
  providers: [
    // Registrados como providers (e não em main.ts) para valerem também nos
    // testes e2e, que sobem o AppModule sem passar pelo main.ts.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        // Recusa (400) campos que o DTO não declara.
        whitelist: true,
        forbidNonWhitelisted: true,
        // Entrega ao controller uma instância do DTO, sem conversões
        // implícitas de tipo ("3" continua string e falha no @IsInt).
        transform: true,
      }),
    },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
export class AppModule {}
