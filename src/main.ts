// Primeiro import: carrega o .env antes de qualquer módulo ler process.env.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { AppModule, ObserveInstrument } from './app.module.js';
import { PublicImageDirectory } from './shared/infra/media/public-image-directory.js';

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
  // Fotos de anúncios e de perfil. Os arquivos têm nome aleatório e nunca
  // mudam de conteúdo, então podem ficar em cache por bastante tempo.
  for (const folder of ['listings', 'users'] as const) {
    const directory = new PublicImageDirectory(folder);
    app.use(
      `/uploads/${folder}`,
      express.static(directory.path, {
        dotfiles: 'deny',
        index: false,
        maxAge: '30d',
        immutable: true,
        setHeaders: (response) => {
          response.setHeader('X-Content-Type-Options', 'nosniff');
        },
      }),
    );
  }
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
