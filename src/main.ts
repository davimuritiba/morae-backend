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
  // Atrás de um proxy reverso (o Caddy na VPS), o IP real de quem acessa
  // chega no cabeçalho X-Forwarded-For. Sem isto, todos os acessos parecem
  // vir do proxy e os limites por IP (login, recuperação de senha) valeriam
  // para todos os usuários juntos. Use TRUST_PROXY=1 só atrás de um proxy:
  // sem ele, qualquer cliente poderia forjar o cabeçalho.
  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (trustProxy) {
    app.set(
      'trust proxy',
      /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy,
    );
  }
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
