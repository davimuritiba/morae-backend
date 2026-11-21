# Frontend (pds-morae) compilado e servido pelo Caddy.
# O código vem do contexto "frontend" definido no compose.yaml.

FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY --from=frontend package.json package-lock.json ./
RUN npm ci

# Só o necessário para o build; .env e node_modules locais ficam de fora.
COPY --from=frontend index.html vite.config.js ./
COPY --from=frontend public ./public
COPY --from=frontend src ./src

# Endereço público da API; o Vite grava esse valor no JavaScript gerado.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN test -n "$VITE_API_URL" && npm run build


FROM caddy:2
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
