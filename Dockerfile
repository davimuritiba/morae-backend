# Imagem do backend para produção (usada por deploy/compose.yaml).
#
# Estágios:
# - build:   todas as dependências, client do Prisma gerado e código
#            compilado. Também roda as migrations e o seed (tem o CLI do
#            Prisma), via serviço "migrate" do compose.
# - runtime: só as dependências de produção e o dist; é o que fica no ar.

FROM node:24-bookworm-slim AS build
WORKDIR /app

# O motor de migrations do Prisma precisa do OpenSSL, que a imagem slim não traz.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# O prisma.config lê DATABASE_URL; para gerar o client basta um valor
# qualquer. O valor real vem do compose em tempo de execução.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

COPY package.json package-lock.json prisma7.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate && npm run build


FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Sem scripts de instalação: o postinstall (prisma generate) precisa do CLI,
# que é dependência de desenvolvimento, e o client gerado já está no dist.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist

# Pasta das fotos dos anúncios; o compose monta um volume aqui.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
ENV UPLOADS_DIR=/app/uploads

USER node
EXPOSE 3000
CMD ["node", "dist/main"]
