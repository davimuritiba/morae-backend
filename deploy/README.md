# Deploy na VPS

Coloca o Moraê inteiro no ar numa VPS: banco, API e frontend, com HTTPS automático.

```
internet ──► Caddy (portas 80/443, HTTPS)
               ├─ https://DOMAIN       → frontend (build do pds-morae)
               └─ https://api.DOMAIN   → API (NestJS) ──► Postgres
```

Tudo roda em Docker. O banco não fica exposto na internet, e as fotos dos anúncios e os dados ficam em volumes, que sobrevivem a atualizações.

## 1. Criar a VPS

Qualquer provedor serve. Requisitos:

- **Ubuntu 24.04**
- **2 GB de RAM ou mais** (o build do frontend e do backend roda na própria VPS)
- **IP público**

Na criação, cadastre a sua chave SSH pública (`cat ~/.ssh/id_ed25519.pub`). Se não tiver uma, gere com `ssh-keygen -t ed25519`.

Anote o **IP** da VPS. Nos exemplos abaixo ele é `203.0.113.5`.

## 2. Preparar o servidor

```bash
ssh root@203.0.113.5
```

Já no servidor:

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# Firewall: só SSH, HTTP e HTTPS
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443 && ufw --force enable

# Os dois repositórios, lado a lado
mkdir -p /opt/morae && cd /opt/morae
git clone https://github.com/davimuritiba/morae-backend.git
git clone https://github.com/MariaLeticiaV/pds-morae.git
```

## 3. Configurar

```bash
cd /opt/morae/morae-backend/deploy
cp .env.example .env
```

Gere os segredos e já grave no `.env`:

```bash
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env
sed -i "s/^SEED_ADMIN_PASSWORD=.*/SEED_ADMIN_PASSWORD=$(openssl rand -hex 8)/" .env
sed -i "s/^SEED_USER_PASSWORD=.*/SEED_USER_PASSWORD=$(openssl rand -hex 8)/" .env
```

Depois abra o arquivo (`nano .env`) e preencha:

- **`DOMAIN`**: o IP com hífens no lugar dos pontos, mais `.sslip.io`. Exemplo: `203-0-113-5.sslip.io`. O sslip.io é um serviço gratuito que aponta esse nome para o IP, e o Caddy consegue emitir o certificado HTTPS para ele.
- **`SMTP_USER`**, **`SMTP_PASSWORD`** e **`MAIL_FROM`**: o Gmail que vai enviar os e-mails, com a senha de app de 16 caracteres (sem espaços).

Para salvar no nano: Ctrl+O, Enter, Ctrl+X.

## 4. Subir

```bash
docker compose up -d --build
```

O primeiro build leva alguns minutos. Quando terminar, crie as contas de demonstração:

```bash
docker compose run --rm migrate node prisma/seed.mjs
```

Pronto: abra **https://203-0-113-5.sslip.io** (com o seu IP).

- Admin: login `admin`, senha do `SEED_ADMIN_PASSWORD` (veja com `grep SEED_ .env`)
- Usuários de demonstração (ex.: `ana.lima@example.com`): senha do `SEED_USER_PASSWORD`

Passe essas senhas para a equipe por um canal privado, nunca pelo repositório.

## Atualizar

Depois de um merge na `main` de qualquer um dos repositórios:

```bash
cd /opt/morae/morae-backend/deploy && ./update.sh
```

As migrations novas são aplicadas sozinhas antes de a API subir.

## Comandos úteis

Todos dentro de `/opt/morae/morae-backend/deploy`:

| Para | Comando |
|---|---|
| Ver o que está rodando | `docker compose ps` |
| Ver os logs da API | `docker compose logs -f api` |
| Ver os logs do HTTPS | `docker compose logs -f web` |
| Reiniciar a API | `docker compose restart api` |
| Backup do banco | `docker compose exec -T postgres pg_dump -U morae morae > backup-$(date +%F).sql` |
| Parar tudo (mantém os dados) | `docker compose down` |

Não use `docker compose down -v`: o `-v` apaga o banco e as fotos.

## Problemas comuns

- **O site não abre ou dá erro de certificado:** confira o `DOMAIN` no `.env` e se as portas 80 e 443 estão liberadas também no painel do provedor (alguns têm firewall próprio). Veja `docker compose logs web`.
- **E-mails não chegam:** confira a senha de app do Gmail e veja `docker compose logs api`. O Gmail limita o envio a algumas centenas de e-mails por dia.
- **O build trava ou é encerrado:** a VPS ficou sem memória. Crie 2 GB de swap:
  ```bash
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```
