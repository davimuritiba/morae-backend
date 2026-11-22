#!/usr/bin/env bash
# Atualiza o Moraê na VPS: baixa a versão mais recente dos dois repositórios
# e recria só o que mudou. Rode de dentro de morae-backend/deploy.
set -euo pipefail
cd "$(dirname "$0")"

git -C .. pull --ff-only
git -C "${FRONTEND_DIR:-../../pds-morae}" pull --ff-only

docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null
docker compose ps
