// Primeiro import: carrega o .env antes de qualquer módulo ler process.env.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { AppModule, ObserveInstrument } from './app.module.js';
import { getPropertyUploadsDirectory } from './modules/property/infra/media/property-media-storage.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  app.enableCors();
  app.use(
    '/uploads/listings',
    express.static(getPropertyUploadsDirectory(), {
      dotfiles: 'deny',
      index: false,
      setHeaders: (response) => {
        response.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
