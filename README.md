# Morae — Backend

API do **Morae**, plataforma de moradia estudantil para alunos da UFAL. A proposta é conectar estudantes que procuram moradia ou colegas de quarto a proprietários de imóveis, com verificação de vínculo acadêmico, compatibilidade entre perfis, anúncios, visitas, chat e contratos.

> **Situação em 12/11/2026:** o cadastro de estudante funciona de ponta a ponta. A rota `POST /students` valida os dados, aplica as regras de domínio, gera o hash da senha com Argon2, grava no PostgreSQL numa única transação e envia um link de verificação do e-mail, confirmado por `POST /email-verification/confirm`. Ainda faltam a autenticação e os demais módulos. Veja [Progresso do desenvolvimento](#progresso-do-desenvolvimento).

## Stack

| Item                  | Tecnologia                                      |
| --------------------- | ----------------------------------------------- |
| Runtime               | Node.js 24 (ESM)                                |
| Framework             | NestJS 12                                       |
| Linguagem             | TypeScript 6 (`strict`)                         |
| Banco                 | PostgreSQL 17 + Prisma 7 (adapter `pg`)         |
| Validação HTTP        | class-validator + `ValidationPipe`              |
| Hash de senha         | Argon2id (`argon2`)                             |
| E-mail                | `nodemailer` (SMTP); Mailpit em desenvolvimento |
| Limite de requisições | `@nestjs/throttler`                             |
| Testes                | Vitest 4 + Supertest                            |
| Lint / formatação     | oxlint + Prettier                               |
| Observabilidade       | NestJS Observe (opcional)                       |

## Pré-requisitos

- **Node.js 24** e **npm 11** (testado com Node 24.18.0 e npm 11.16.0)
- **Docker** com Docker Compose, para o PostgreSQL e o Mailpit (servidor de e-mail de desenvolvimento). A aplicação, os testes de integração e os testes e2e precisam deles. Os testes unitários, não.

## Configuração

1. Instale as dependências. O `postinstall` já gera o Prisma Client:

   ```bash
   npm install
   ```

2. Crie o arquivo de ambiente a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

   | Variável                       | Obrigatória | Descrição                                                                                                                                                |
   | ------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`                 | **sim**     | Conexão com o PostgreSQL. Com o `docker-compose.yml` do projeto: `postgresql://morae:morae@localhost:5432/morae?schema=public`.                          |
   | `PORT`                         | não         | Porta HTTP. Padrão: `3000`.                                                                                                                              |
   | `TEST_DATABASE_URL`            | não         | Banco dos testes de integração e e2e. O nome precisa terminar em `_test`. Se omitida, usa o banco da `DATABASE_URL` com o sufixo `_test` (`morae_test`). |
   | `OBSERVE_APP_KEY`              | não         | Chave do [NestJS Observe](https://observe.nestjs.com). Sem ela, a telemetria é descartada e a app funciona normalmente.                                  |
   | `OBSERVE_APP_SECRET`           | não         | Segredo pareado com a chave acima.                                                                                                                       |
   | `SMTP_HOST`                    | **sim**     | Servidor SMTP. Com o Mailpit do `docker-compose.yml`: `localhost`.                                                                                       |
   | `SMTP_PORT`                    | **sim**     | Porta SMTP. Com o Mailpit: `1025`.                                                                                                                       |
   | `SMTP_SECURE`                  | não         | `true` para TLS direto (porta 465). Padrão: `false`.                                                                                                     |
   | `SMTP_USER` / `SMTP_PASSWORD`  | não         | Credenciais do SMTP. O Mailpit não exige.                                                                                                                |
   | `MAIL_FROM`                    | **sim**     | Remetente dos e-mails, ex.: `"Moraê <nao-responda@morae.local>"`.                                                                                        |
   | `APP_WEB_URL`                  | **sim**     | Endereço do front-end. O link de verificação é `<APP_WEB_URL>/verificar-email?token=...`.                                                                |
   | `EMAIL_VERIFICATION_TTL_HOURS` | não         | Validade do link de verificação, em horas. Padrão: `24`.                                                                                                 |

   O `.env` está no `.gitignore`. **Nunca** versione credenciais. Os valores do `.env.example` já funcionam com o Docker Compose do projeto.

3. Suba o PostgreSQL e o Mailpit:

   ```bash
   npm run db:up
   ```

   - O container `morae-postgres` fica em `localhost:5432`, com usuário, senha e banco `morae`. Os dados ficam no volume `morae_pgdata` e sobrevivem a `npm run db:down`.
   - O container `morae-mailpit` recebe todos os e-mails enviados pela aplicação, sem entregá-los de verdade. Eles aparecem em **http://localhost:8025**.

4. Crie as tabelas aplicando as migrations:

   ```bash
   npm run db:migrate
   ```

## Banco de dados

O modelo do banco fica em `prisma/schema.prisma`, e o SQL que cria e altera as tabelas fica em `prisma/migrations/`. A configuração do Prisma CLI está em `prisma7.config.ts`. O client gerado vai para `src/shared/infra/database/generated/prisma` e não é versionado.

| Comando               | O que faz                                                        |
| --------------------- | ---------------------------------------------------------------- |
| `npm run db:up`       | Sobe o PostgreSQL e o Mailpit no Docker                          |
| `npm run db:down`     | Para os containers (os dados do banco continuam no volume)       |
| `npm run db:migrate`  | Aplica as migrations pendentes e cria uma nova se o schema mudou |
| `npm run db:generate` | Gera o Prisma Client de novo                                     |
| `npm run db:studio`   | Abre o Prisma Studio para ver e editar os dados no navegador     |

Para alterar o banco:

1. Edite `prisma/schema.prisma`.
2. Crie e aplique a migration, dando um nome à mudança:

   ```bash
   npm run db:migrate -- --name descricao-da-mudanca
   ```

3. Gere o client atualizado:

   ```bash
   npm run db:generate
   ```

Não edite uma migration que já foi aplicada. Para corrigir algo, crie uma nova.

## Executando

O `.env` é carregado automaticamente pelo `src/main.ts`. Na subida, a aplicação se conecta ao banco e falha logo se ele estiver fora do ar ou se faltar alguma variável obrigatória (`DATABASE_URL`, as de SMTP, `MAIL_FROM`, `APP_WEB_URL` ou `JWT_SECRET`).

Desenvolvimento, com recarga automática:

```bash
npm run start:dev
```

Produção:

```bash
npm run build
```

```bash
npm run start:prod
```

## Endpoints

### `GET /users/me` e `GET /users/:id`

Exigem `Authorization: Bearer <accessToken>`; sem token, `401`.

`GET /users/me`, ou `GET /users/:id` com o próprio id, devolve os dados completos:

```json
{
  "userId": "0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10",
  "name": "Maria Silva",
  "email": "maria@ufal.br",
  "phone": "82999991234",
  "photoUrl": null,
  "emailVerified": false,
  "status": "ACTIVE"
}
```

`GET /users/:id` de outra pessoa devolve só o perfil público:

```json
{
  "userId": "7a1c2e9d-4b3f-4e8a-9c2d-1f0e3b4a5c6d",
  "name": "Bruno Costa",
  "photoUrl": null
}
```

Se o usuário não existir, a API responde `404` com `USER_NOT_FOUND`.

### `PATCH /users/me`

Atualiza os dados básicos da conta autenticada. Requer `Authorization: Bearer <accessToken>`.
Aceita um ou mais campos: `name`, `email`, `cpf` e `phone` (que pode ser `null` para remover o telefone).
Senha e estado da conta não são editáveis por esta rota. O CPF não é devolvido na resposta.
Quando o e-mail muda, ele volta para `emailVerified: false` e a API envia um novo link de verificação.
Duplicidades de e-mail/CPF respondem `409`; formatos inválidos respondem `422`; corpo vazio responde `422`.

### `POST /auth/login`

Autentica um usuário ativo e emite um token de acesso (JWT), válido por `JWT_EXPIRES_IN_MINUTES` (60 por padrão). Envie-o no header `Authorization: Bearer <accessToken>` das rotas protegidas.

Corpo da requisição:

```json
{
  "email": "maria@ufal.br",
  "password": "senha-segura-123"
}
```

Resposta `201 Created`:

```json
{
  "userId": "0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10",
  "name": "Maria Silva",
  "email": "maria@ufal.br",
  "status": "ACTIVE",
  "accessToken": "eyJhbGciOi...",
  "tokenType": "Bearer"
}
```

Credenciais incorretas ou conta suspensa/desativada respondem `401` com `INVALID_CREDENTIALS`.

Cada conta aceita até 10 tentativas a cada 15 minutos por IP; depois disso, a API responde `429`. O limite também vale para `POST /auth/admin/login`. Como a contagem é por conta e IP, alunos na mesma rede da UFAL não bloqueiam uns aos outros.

### `POST /auth/admin/login`

Autentica um administrador pelas credenciais próprias cadastradas no registro `Administrator`.

Corpo da requisição:

```json
{
  "login": "admin",
  "password": "Admin@123"
}
```

Resposta `201 Created`:

```json
{
  "administratorId": "77777777-7777-4777-8777-777777777777",
  "userId": "55555555-5555-4555-8555-555555555555",
  "login": "admin",
  "permissions": []
}
```

### `POST /students`

Cadastra um estudante, criando a conta (`User`) e o perfil acadêmico (`Student`) juntos. A verificação do vínculo com a UFAL começa como `PENDING`, e um link de verificação é enviado para o e-mail informado. Se o envio do e-mail falhar, o cadastro continua valendo: o erro vai para o log e o usuário pode pedir o reenvio.

Corpo da requisição:

```json
{
  "name": "Maria Silva",
  "email": "maria@ufal.br",
  "cpf": "529.982.247-25",
  "password": "senha-segura-123",
  "phone": "(82) 99999-1234",
  "enrollmentNumber": "20231234",
  "course": "Ciência da Computação",
  "period": 3,
  "expectedGraduation": "2027-12-15"
}
```

`phone` é opcional. `expectedGraduation` é uma data ISO 8601 (`AAAA-MM-DD`). Campos que não estão na lista acima são recusados.

Resposta `201 Created`:

```json
{
  "userId": "0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10",
  "studentId": "5d2c9a4e-1b7f-4e3a-8c6d-2f9e1a0b3c4d"
}
```

Erros:

| Status | Quando                                                                           | Exemplo de `code`                                                                |
| ------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `400`  | Corpo malformado: campo ausente, tipo errado, data inexistente ou campo extra    | (mensagens do `ValidationPipe`)                                                  |
| `409`  | E-mail, CPF ou matrícula já cadastrados                                          | `EMAIL_ALREADY_IN_USE`, `CPF_ALREADY_IN_USE`, `ENROLLMENT_NUMBER_ALREADY_IN_USE` |
| `422`  | Dado que viola uma regra de negócio (CPF inválido, senha curta, período fora...) | `INVALID_CPF`, `INVALID_EMAIL`, `INVALID_PASSWORD`, `INVALID_ACADEMIC_PERIOD`    |

Os erros `409` e `422` têm o corpo `{ "statusCode": 409, "code": "EMAIL_ALREADY_IN_USE", "message": "Este e-mail já está cadastrado." }`.

### `POST /email-verification/confirm`

Confirma o e-mail com o token do link. É chamada pela página `/verificar-email` do front-end, que lê o `token` da URL.

```json
{ "token": "<token do link>" }
```

| Status | Quando                                                                       |
| ------ | ---------------------------------------------------------------------------- |
| `204`  | E-mail verificado                                                            |
| `400`  | Corpo sem `token` ou com token longo demais                                  |
| `422`  | Token inexistente, expirado ou já usado (`INVALID_EMAIL_VERIFICATION_TOKEN`) |
| `429`  | Mais de 10 tentativas por minuto do mesmo IP                                 |

O link vale por `EMAIL_VERIFICATION_TTL_HOURS` (24 h por padrão) e só pode ser usado uma vez.

### `POST /email-verification/resend`

Envia um novo link de verificação. Os links anteriores deixam de funcionar.

```json
{ "email": "maria@ufal.br" }
```

Responde **sempre `202 Accepted`**, sem corpo, exista ou não uma conta com esse e-mail, e o envio acontece em segundo plano. Assim, nem a resposta nem o tempo dela revelam quais e-mails estão cadastrados. Contas já verificadas, suspensas ou desativadas não recebem e-mail. O limite é de **3 pedidos a cada 15 minutos por IP** (depois disso, `429`).

## Chat

Todas as rotas exigem o header `Authorization: Bearer <accessToken>` (obtido em `POST /auth/login`). Sem token ou com token inválido: `401`. Só usuários com **e-mail verificado** e conta ativa usam o chat.

| Método | Rota                       | O que faz                                                                  | Sucesso         |
| ------ | -------------------------- | -------------------------------------------------------------------------- | --------------- |
| POST   | `/chats/direct`            | Abre (ou devolve) a conversa 1:1 com `targetUserId` **ou** com o dono do `listingId` | `201` nova, `200` existente |
| POST   | `/chats/groups`            | Cria grupo: `{ "name": "...", "memberIds": ["uuid", ...] }` (3 a 50 pessoas contando quem cria) | `201` |
| GET    | `/chats?limit=&cursor=`    | Minhas conversas, da atividade mais recente para a mais antiga             | `200`           |
| GET    | `/chats/:chatId`           | Uma conversa                                                               | `200`           |
| GET    | `/chats/:chatId/messages?limit=&cursor=` | Histórico, da mensagem mais recente para a mais antiga       | `200`           |
| POST   | `/chats/:chatId/messages`  | Envia `{ "content": "...", "listingId": "uuid" }` (texto, anúncio ou os dois) | `201`        |
| POST   | `/chats/:chatId/read`      | Marca a conversa como lida                                                 | `204`           |

Conversa (`ChatResponse`):

```json
{
  "id": "uuid",
  "type": "DIRECT",
  "name": null,
  "participants": [
    { "userId": "uuid", "name": "Ana", "photoUrl": null, "role": "MEMBER", "lastReadAt": "2026-11-17T10:05:00.000Z" }
  ],
  "lastMessage": { "id": "uuid", "chatId": "uuid", "senderId": "uuid", "content": "Oi!", "listingId": null, "createdAt": "2026-11-17T10:04:00.000Z" },
  "unreadCount": 2,
  "lastActivityAt": "2026-11-17T10:04:00.000Z",
  "createdAt": "2026-11-17T09:00:00.000Z"
}
```

As listagens respondem `{ "data": [...], "nextCursor": "..." }`. Para a próxima página, repita a requisição com `cursor=<nextCursor>`; `nextCursor` `null` indica o fim. `limit` vai de 1 a 100 (padrão 30). Membros novos de um grupo só veem as mensagens enviadas depois de entrarem.

Erros:

| Status | `code`                                   | Quando                                                                 |
| ------ | ---------------------------------------- | ---------------------------------------------------------------------- |
| `400`  | —                                        | Corpo inválido, `targetUserId` e `listingId` juntos ou nenhum, `cursor` inválido |
| `403`  | `EMAIL_NOT_VERIFIED`, `CHAT_ACCESS_DENIED` | E-mail não verificado; conta inexistente ou inativa                  |
| `404`  | `CHAT_NOT_FOUND`                         | A conversa não existe **ou** o usuário não participa dela              |
| `404`  | `LISTING_NOT_FOUND`                      | Anúncio inexistente ou não aprovado                                    |
| `422`  | `CANNOT_CHAT_WITH_YOURSELF`              | Conversa consigo mesmo, inclusive pelo próprio anúncio                 |
| `422`  | `CHAT_USER_UNAVAILABLE`                  | Destinatário ou membro inexistente, inativo ou sem e-mail verificado   |
| `422`  | `EMPTY_MESSAGE`, `INVALID_MESSAGE_CONTENT` | Sem texto e sem anúncio; texto com mais de 2000 caracteres           |
| `422`  | `INVALID_GROUP_NAME`, `INVALID_GROUP_SIZE` | Nome vazio ou com mais de 60 caracteres; grupo fora de 3 a 50 pessoas |

### Tempo real (Socket.IO)

Conecte no namespace `/chat` com o mesmo token:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', { auth: { token: accessToken } });
socket.on('message:new', (message) => { /* MessageResponse */ });
socket.on('chat:read', ({ chatId, userId, readAt }) => { /* alguém leu */ });
```

Token inválido: o servidor desconecta o socket. O envio de mensagens continua pelo `POST /chats/:chatId/messages`; o socket só entrega os eventos para os outros participantes (quem enviou já recebe a mensagem na resposta HTTP).

## Testes

```bash
npm test
```

| Comando              | O que faz                                                                |
| -------------------- | ------------------------------------------------------------------------ |
| `npm test`           | Testes unitários (sem banco)                                             |
| `npm run test:watch` | Testes unitários em modo watch                                           |
| `npm run test:cov`   | Testes unitários com cobertura                                           |
| `npm run test:int`   | Testes de integração: repositórios e transações contra o PostgreSQL real |
| `npm run test:e2e`   | Testes end-to-end: sobe a app e faz requisições HTTP reais               |
| `npm run lint`       | Lint com oxlint (com checagem de tipos)                                  |
| `npm run format`     | Formata o código com Prettier                                            |

Os testes de integração e e2e precisam do PostgreSQL e do Mailpit rodando (`npm run db:up`).

- **Banco:** eles usam um banco separado, `morae_test`, que é criado e recebe as migrations automaticamente na primeira execução. Os dados desse banco são apagados antes de cada teste, e a limpeza se recusa a rodar em qualquer banco cujo nome não termine em `_test`.
- **E-mail:** os testes enviam e-mails de verdade para o Mailpit e os conferem pela API dele. A caixa do Mailpit é esvaziada durante os testes.

Convenção de testes:

- Testes **unitários** (`*.spec.ts`) ficam na pasta `test/` de cada módulo, espelhando a estrutura do código: `src/modules/user/test/domain/entities/user.entity.spec.ts` testa `src/modules/user/domain/entities/user.entity.ts`.
- Testes de **integração** (`*.int-spec.ts`) ficam no mesmo lugar, mas acessam o banco de verdade.
- Testes **end-to-end** (`*.e2e-spec.ts`) ficam em `test/` na raiz. Os utilitários compartilhados dos testes com banco ficam em `test/integration/`.
- Nenhum arquivo de teste entra no build.

## Estrutura do projeto

A organização é por **módulos** (contextos de negócio), e cada módulo é dividido em camadas, no estilo arquitetura limpa / DDD:

```
src/
├── main.ts                    # bootstrap da aplicação
├── app.module.ts              # módulo raiz
├── modules/
│   ├── user/                  # contas, estudantes, proprietários, administradores
│   ├── verification/          # verificação de documentos
│   ├── property/              # imóveis, residências e anúncios
│   ├── matching/              # compatibilidade entre estudantes
│   ├── interaction/           # interesses, visitas, chat e avaliações
│   ├── contract/              # contratos e pagamentos
│   └── report/                # relatórios
└── shared/                    # código comum a todos os módulos
```

Dentro de cada módulo:

```
<modulo>/
├── domain/          # regras de negócio puras, sem Nest nem banco
│   ├── entities/
│   ├── value-objects/
│   ├── enums/
│   ├── errors/
│   └── repositories/   # contratos (classes abstratas)
├── application/     # casos de uso e portas (ex.: Hasher)
├── infra/           # implementações: banco, serviços externos
├── presentation/    # controllers HTTP, DTOs e presenters
└── test/            # testes unitários do módulo
```

As dependências apontam sempre para dentro: `presentation` → `application` → `domain`. O domínio não conhece HTTP, banco nem o Nest. Os erros de negócio estendem `DomainError` e têm um `code` (ex.: `EMAIL_ALREADY_IN_USE`), que a camada de apresentação vai traduzir para o status HTTP adequado.

## Progresso do desenvolvimento

### Concluído

**Módulo `user`: camada de domínio**

- **Entidades**
  - `User`: conta de acesso, com nome, e-mail, CPF, hash da senha, telefone, foto, status da conta e verificação de e-mail.
  - `Student`: raiz do agregado formado com `StudentProfile`. Tem matrícula, curso, período, previsão de formatura e status de verificação.
  - `StudentProfile`: perfil de convivência, com bio, renda, faixa de orçamento, fumante ou não, preferências de barulho e de visitas, e agenda semanal.
  - `PropertyOwner`: proprietário, com status de verificação.
  - `Administrator`: administrador, com permissões (`VERIFY_DOCUMENTS`, `MODERATE_LISTINGS`, `MANAGE_USERS`, `VIEW_REPORTS`).
- **Value objects com validação:** `Email`, `Cpf` (com dígitos verificadores), `Password`, `Phone`, `PhotoUrl`, `EnrollmentNumber`, `AcademicPeriod`, `BudgetRange`, `PreferenceLevel`, `TimeSlot`.
- **Contratos de repositório:** `UserRepository`, `StudentRepository`, `PropertyOwnerRepository`, `AdministratorRepository`, `EmailVerificationTokenRepository`.
- **`EmailVerificationToken`:** token de uso único para confirmar o e-mail, com expiração. Guarda só o hash do token.

**Módulo `user`: camada de aplicação**

- **Caso de uso `RegisterStudentUseCase`**, que cadastra um estudante criando o `User` e o `Student` juntos:
  1. Valida o formato de todos os campos com os value objects, antes de acessar o banco.
  2. Verifica se e-mail, CPF e matrícula já estão em uso, cada um com seu erro específico.
  3. Gera o hash da senha pela porta `Hasher`, só depois das checagens, por ser a etapa mais cara.
  4. Salva tudo de forma atômica via `UnitOfWork`, para nunca ficar um usuário sem o estudante, nem o contrário.
  5. Envia o link de verificação do e-mail. Uma falha nesse envio é registrada no log e não desfaz o cadastro.
- **Casos de uso da verificação de e-mail:**
  - `SendEmailVerificationUseCase`: troca os tokens anteriores por um novo e envia o link, depois de gravar.
  - `ConfirmEmailVerificationUseCase`: consome o token e marca o e-mail como verificado, na mesma transação.
  - `ResendEmailVerificationUseCase`: reenvia o link sem revelar se o e-mail tem conta.
- **Portas e contratos compartilhados:** `Hasher`, `VerificationTokenGenerator`, `EmailVerificationNotifier`, `Clock`, `Logger`, `UseCase` e `UnitOfWork`.
- **Implementações in-memory** de `UserRepository`, `StudentRepository`, `EmailVerificationTokenRepository` e `UnitOfWork`. São usadas nos testes unitários e simulam as constraints `UNIQUE` do banco.

**Persistência (PostgreSQL 17 + Prisma 7)**

- **Banco local:** PostgreSQL via Docker Compose. O Prisma 7 usa o driver adapter `@prisma/adapter-pg`, e o client é gerado em `src/shared/infra/database/generated/prisma` (ESM, fora do git).
- **Schema e migration `init`:** tabelas `users`, `students`, `student_profiles`, `property_owners` e `administrators`. E-mail, CPF e matrícula são únicos no banco.
- **Mappers** `UserMapper` e `StudentMapper`: convertem entidades e value objects em linhas do banco e de volta. Dados inválidos no banco são barrados ao ler, em vez de entrar no domínio.
- **Repositórios** `PrismaUserRepository` e `PrismaStudentRepository`: o estudante é salvo junto com o perfil numa única operação. Violações de `UNIQUE` (erro `P2002`) viram `EmailAlreadyInUseError`, `CpfAlreadyInUseError` e `EnrollmentNumberAlreadyInUseError`.
- **`PrismaUnitOfWork`:** as gravações feitas dentro de `unitOfWork.run()` usam a mesma transação (via `AsyncLocalStorage`). Se qualquer passo falhar, tudo é desfeito.
- **`PrismaService` e `DatabaseModule`** globais. A aplicação se conecta ao banco na subida e falha logo se ele estiver fora do ar.
- **Tokens de verificação:** tabela `email_verification_tokens` (hash único, exclusão em cascata com o usuário) e `PrismaEmailVerificationTokenRepository`.

**Senhas e tokens**

- **`Argon2Hasher`:** implementa a porta `Hasher` com Argon2id e os parâmetros mínimos do OWASP (19 MiB de memória, 2 iterações, paralelismo 1). O salt e os parâmetros ficam gravados no próprio hash.
- **`CryptoVerificationTokenGenerator`:** token de 32 bytes aleatórios em base64url, guardado como hash SHA-256.

**E-mail**

- **`MailModule`** global com o `NodemailerMailSender`, que envia por SMTP. Em desenvolvimento, aponta para o Mailpit do Docker Compose.
- **`MailEmailVerificationNotifier`:** monta o e-mail de verificação em texto e HTML, com o link para o front-end, a validade no horário de Maceió e o nome escapado no HTML.

**API HTTP**

- **`POST /students`:** cadastra um estudante e responde `201` com `{ userId, studentId }`.
- **DTO validado** com `class-validator`. O `ValidationPipe` global recusa com `400` campos ausentes, tipos errados e campos que o DTO não declara.
- **Presenter:** define exatamente o que sai na resposta. Senha, hash e CPF nunca são devolvidos.
- **`DomainErrorFilter`:** traduz os erros de domínio para HTTP, com corpo `{ statusCode, code, message }`:
  - `409` para duplicidade e transição de estado inválida;
  - `404` para registro não encontrado;
  - `401` para credenciais inválidas;
  - `422` para as demais regras de negócio, como CPF ou e-mail inválidos.
- **`POST /email-verification/confirm` e `POST /email-verification/resend`:** confirmação e reenvio do link de verificação, com limite de requisições por IP (`@nestjs/throttler`).
- **`UserModule`:** liga cada contrato à sua implementação (Prisma, Argon2, SMTP) e monta os casos de uso.

**Módulo `property`: domínio, aplicação e persistência**

- **Entidades** `Residence`, `Property`, `Listing` e `ListingMedia`, representando o endereço, as características do imóvel, o anúncio e suas fotos/vídeo.
- **Relacionamento com usuários:** um imóvel pode ter vários coabitantes. A associação N:N entre `Property` e `User` é persistida por `PropertyCohabitant`, com chave composta (`propertyId`, `userId`).
- **Caso de uso `PublishPropertyUseCase`:** cria e valida o endereço, o imóvel, o anúncio e as mídias, iniciando o anúncio com status `PENDING`.
- **Regras cobertas no domínio:** CEP e estado válidos, limites de título/descrição/regras, valores de aluguel e condomínio, quantidades de quartos/banheiros/vagas, até 10 fotos e pelo menos um coabitante.
- **Persistência:** `PrismaPropertyRepository` e `PropertyMapper` persistem e reconstroem o agregado usando Prisma/PostgreSQL. A criação usa writes aninhados para salvar residência, imóvel, coabitantes, anúncio e mídias.
- **Testabilidade:** `InMemoryPropertyRepository` permite testar o caso de uso sem banco de dados.
- **HTTP:** `PropertyController` expõe `POST /properties` para publicação de anúncios.
- **Schema e migration:** os modelos `Residence`, `Property`, `PropertyCohabitant`, `Listing` e `ListingMedia`, seus enums e a migration de conversão do antigo `ownerId` para coabitantes estão em `prisma/schema.prisma` e `prisma/migrations/`.

**Regras de negócio já garantidas pelo domínio**

- A conta nasce `ACTIVE`, com e-mail não verificado. Ela pode ser suspensa e reativada, e a desativação é definitiva.
- Estudantes e proprietários começam com verificação `PENDING`, que pode ir para `VERIFIED` ou `REJECTED`. Após uma rejeição, é possível reenviar a verificação.
- A senha fica em texto puro só de passagem: a entidade guarda apenas o hash.
- E-mail, CPF e telefone são normalizados. O e-mail fica em minúsculas, e o CPF e o telefone ficam só com os dígitos.
- A foto de perfil só aceita URLs `https`, o que bloqueia `javascript:`, `data:` e `file:`. O limite de 2048 caracteres vale para a URL já normalizada, o mesmo tamanho da coluna no banco.
- O perfil do estudante só pode ser criado ou alterado pelo `Student`, e campos extras vindos da requisição são descartados.
- As entidades usam campos privados (`#`), então serializar uma entidade por engano não expõe senha nem CPF.
- Dois cadastros simultâneos com o mesmo e-mail, CPF ou matrícula não geram duplicados nem deixam um usuário sem estudante: a constraint `UNIQUE` barra o segundo e a transação desfaz o que ele já tinha gravado.
- O link de verificação de e-mail expira, só funciona uma vez e deixa de valer quando um novo é pedido.

**Qualidade**

- **148 testes unitários**, **31 de integração** (contra o PostgreSQL e o Mailpit) e **19 end-to-end** (requisições HTTP reais, incluindo o fluxo completo de verificação de e-mail), todos passando.
- Typecheck (`strict`), lint e Prettier sem erros.
- Revisão de segurança do módulo `user` feita e corrigida, cobrindo mass assignment, vazamento na serialização, validação de entrada e segredos fora do código.

### Pendente

- **Autenticação:** o `POST /auth/login` já confere as credenciais, mas ainda falta emitir JWT (access e refresh token), criar os guards e limitar as tentativas de login. Falta também decidir o que um e-mail ainda não verificado impede de fazer.
- **Demais casos de uso do `user`:** cadastro de proprietário, edição de perfil, atualização dos dados acadêmicos e suspensão de contas.
- **Provedor de e-mail em produção:** basta configurar o SMTP do provedor escolhido (Resend, Amazon SES, SendGrid...).
- **IP real atrás de proxy:** em produção, o limite de requisições precisa do IP do cliente. Atrás de um proxy ou balanceador, é preciso configurar o `trust proxy` do Express.
- **Verificação de vínculo com a UFAL** (módulo `verification`): envio de documentos e revisão pelo administrador.
- **Formato da matrícula:** a regra do `EnrollmentNumber` é provisória (6 a 15 dígitos) até o padrão oficial da UFAL ser confirmado.
- **Demais módulos:** `matching`, `interaction`, `contract` e `report` ainda têm só a estrutura de pastas e arquivos vazios.

### Próximos passos sugeridos

1. Cadastro de proprietário: caso de uso `RegisterPropertyOwner` e rota `POST /property-owners`, no mesmo padrão do cadastro de estudante.
2. Autenticação: completar o login com a emissão de JWT, tabela de refresh tokens, guards e limite de tentativas.
3. Casos de uso de perfil, que exigem login: consultar o próprio perfil, definir o perfil de convivência e atualizar os dados acadêmicos.
4. Módulo `verification`: envio e revisão dos documentos de vínculo.
