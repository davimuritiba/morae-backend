#!/usr/bin/env bash
# Atualiza o Moraê na VPS: baixa a versão mais recente dos dois repositórios
# e recria só o que mudou. Rode de dentro de morae-backend/deploy.
set -euo pipefail
cd "$(dirname "$0")"

git -C .. pull --ff-only
git -C "${FRONTEND_DIR:-../../pds-morae}" pull --ff-only

docker compose build

# Sobe o que estiver parado e aplica as migrations (serviço migrate).
docker compose up -d --remove-orphans

# Com Docker 29 / Compose v5, o "up" nem sempre troca os containers pelas
# imagens recém-construídas e o site continuaria na versão antiga. Força a
# API e o site a reiniciar com a imagem nova (alguns segundos fora do ar).
docker compose up -d --no-deps --force-recreate api web

docker image prune -f >/dev/null
docker compose ps
