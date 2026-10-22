import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { UserController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './shared/infra/database/database.module.js';

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
  ],
  controllers: [UserController],
  providers: [AppService],
})
export class AppModule {}
