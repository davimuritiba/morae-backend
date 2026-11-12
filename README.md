# Morae — Backend

API do **Morae**, plataforma de moradia estudantil para alunos da UFAL. A proposta é conectar estudantes que procuram moradia ou colegas de quarto a proprietários de imóveis, com verificação de vínculo acadêmico, compatibilidade entre perfis, anúncios, visitas, chat e contratos.

> **Situação em 23/10/2026:** o cadastro de estudante funciona de ponta a ponta. A rota `POST /students` valida os dados, aplica as regras de domínio, gera o hash da senha com Argon2 e grava no PostgreSQL numa única transação. Ainda faltam a autenticação e os demais módulos. Veja [Progresso do desenvolvimento](#progresso-do-desenvolvimento).

## Stack

| Item              | Tecnologia                              |
| ----------------- | --------------------------------------- |
| Runtime           | Node.js 24 (ESM)                        |
| Framework         | NestJS 12                               |
| Linguagem         | TypeScript 6 (`strict`)                 |
| Banco             | PostgreSQL 17 + Prisma 7 (adapter `pg`) |
| Validação HTTP    | class-validator + `ValidationPipe`      |
| Hash de senha     | Argon2id (`argon2`)                     |
| Testes            | Vitest 4 + Supertest                    |
| Lint / formatação | oxlint + Prettier                       |
| Observabilidade   | NestJS Observe (opcional)               |

## Pré-requisitos

- **Node.js 24** e **npm 11** (testado com Node 24.18.0 e npm 11.16.0)
- **Docker** com Docker Compose, para o PostgreSQL. A aplicação, os testes de integração e os testes e2e precisam dele. Os testes unitários, não.

## Configuração

1. Instale as dependências. O `postinstall` já gera o Prisma Client:

   ```bash
   npm install
   ```

2. Crie o arquivo de ambiente a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

   | Variável             | Obrigatória | Descrição                                                                                                                                                |
   | -------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`       | **sim**     | Conexão com o PostgreSQL. Com o `docker-compose.yml` do projeto: `postgresql://morae:morae@localhost:5432/morae?schema=public`.                          |
   | `PORT`               | não         | Porta HTTP. Padrão: `3000`.                                                                                                                              |
   | `TEST_DATABASE_URL`  | não         | Banco dos testes de integração e e2e. O nome precisa terminar em `_test`. Se omitida, usa o banco da `DATABASE_URL` com o sufixo `_test` (`morae_test`). |
   | `OBSERVE_APP_KEY`    | não         | Chave do [NestJS Observe](https://observe.nestjs.com). Sem ela, a telemetria é descartada e a app funciona normalmente.                                  |
   | `OBSERVE_APP_SECRET` | não         | Segredo pareado com a chave acima.                                                                                                                       |

   O `.env` está no `.gitignore`. **Nunca** versione credenciais.

3. Suba o PostgreSQL:

   ```bash
   npm run db:up
   ```

   O container `morae-postgres` fica em `localhost:5432`, com usuário, senha e banco `morae`. Os dados ficam no volume `morae_pgdata` e sobrevivem a `npm run db:down`.

4. Crie as tabelas aplicando as migrations:

   ```bash
   npm run db:migrate
   ```

## Banco de dados

O modelo do banco fica em `prisma/schema.prisma`, e o SQL que cria e altera as tabelas fica em `prisma/migrations/`. A configuração do Prisma CLI está em `prisma7.config.ts`. O client gerado vai para `src/shared/infra/database/generated/prisma` e não é versionado.

| Comando               | O que faz                                                        |
| --------------------- | ---------------------------------------------------------------- |
| `npm run db:up`       | Sobe o PostgreSQL no Docker                                      |
| `npm run db:down`     | Para o container (os dados continuam no volume)                  |
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

O `.env` é carregado automaticamente pelo `src/main.ts`. Na subida, a aplicação se conecta ao banco e falha logo se ele estiver fora do ar ou se a `DATABASE_URL` não estiver definida.

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

### `POST /students`

Cadastra um estudante, criando a conta (`User`) e o perfil acadêmico (`Student`) juntos. A verificação do vínculo com a UFAL começa como `PENDING`.

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

Os testes de integração e e2e precisam do PostgreSQL rodando (`npm run db:up`). Eles usam um banco separado, `morae_test`, que é criado e recebe as migrations automaticamente na primeira execução. Os dados desse banco são apagados antes de cada teste, e a limpeza se recusa a rodar em qualquer banco cujo nome não termine em `_test`.

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
- **Contratos de repositório:** `UserRepository`, `StudentRepository`, `PropertyOwnerRepository`, `AdministratorRepository`.

**Módulo `user`: camada de aplicação**

- **Caso de uso `RegisterStudentUseCase`**, que cadastra um estudante criando o `User` e o `Student` juntos:
  1. Valida o formato de todos os campos com os value objects, antes de acessar o banco.
  2. Verifica se e-mail, CPF e matrícula já estão em uso, cada um com seu erro específico.
  3. Gera o hash da senha pela porta `Hasher`, só depois das checagens, por ser a etapa mais cara.
  4. Salva tudo de forma atômica via `UnitOfWork`, para nunca ficar um usuário sem o estudante, nem o contrário.
- **Portas e contratos compartilhados:** `Hasher`, `UseCase` e `UnitOfWork`.
- **Implementações in-memory** de `UserRepository`, `StudentRepository` e `UnitOfWork`. São usadas nos testes unitários e simulam as constraints `UNIQUE` do banco.

**Persistência (PostgreSQL 17 + Prisma 7)**

- **Banco local:** PostgreSQL via Docker Compose. O Prisma 7 usa o driver adapter `@prisma/adapter-pg`, e o client é gerado em `src/shared/infra/database/generated/prisma` (ESM, fora do git).
- **Schema e migration `init`:** tabelas `users`, `students`, `student_profiles`, `property_owners` e `administrators`. E-mail, CPF e matrícula são únicos no banco.
- **Mappers** `UserMapper` e `StudentMapper`: convertem entidades e value objects em linhas do banco e de volta. Dados inválidos no banco são barrados ao ler, em vez de entrar no domínio.
- **Repositórios** `PrismaUserRepository` e `PrismaStudentRepository`: o estudante é salvo junto com o perfil numa única operação. Violações de `UNIQUE` (erro `P2002`) viram `EmailAlreadyInUseError`, `CpfAlreadyInUseError` e `EnrollmentNumberAlreadyInUseError`.
- **`PrismaUnitOfWork`:** as gravações feitas dentro de `unitOfWork.run()` usam a mesma transação (via `AsyncLocalStorage`). Se qualquer passo falhar, tudo é desfeito.
- **`PrismaService` e `DatabaseModule`** globais. A aplicação se conecta ao banco na subida e falha logo se ele estiver fora do ar.

**Senhas**

- **`Argon2Hasher`:** implementa a porta `Hasher` com Argon2id e os parâmetros mínimos do OWASP (19 MiB de memória, 2 iterações, paralelismo 1). O salt e os parâmetros ficam gravados no próprio hash.

**API HTTP**

- **`POST /students`:** cadastra um estudante e responde `201` com `{ userId, studentId }`.
- **DTO validado** com `class-validator`. O `ValidationPipe` global recusa com `400` campos ausentes, tipos errados e campos que o DTO não declara.
- **Presenter:** define exatamente o que sai na resposta. Senha, hash e CPF nunca são devolvidos.
- **`DomainErrorFilter`:** traduz os erros de domínio para HTTP, com corpo `{ statusCode, code, message }`:
  - `409` para duplicidade e transição de estado inválida;
  - `404` para registro não encontrado;
  - `401` para credenciais inválidas;
  - `422` para as demais regras de negócio, como CPF ou e-mail inválidos.
- **`UserModule`:** liga cada contrato à sua implementação (Prisma, Argon2) e monta o caso de uso.

**Regras de negócio já garantidas pelo domínio**

- A conta nasce `ACTIVE`, com e-mail não verificado. Ela pode ser suspensa e reativada, e a desativação é definitiva.
- Estudantes e proprietários começam com verificação `PENDING`, que pode ir para `VERIFIED` ou `REJECTED`. Após uma rejeição, é possível reenviar a verificação.
- A senha fica em texto puro só de passagem: a entidade guarda apenas o hash.
- E-mail, CPF e telefone são normalizados. O e-mail fica em minúsculas, e o CPF e o telefone ficam só com os dígitos.
- A foto de perfil só aceita URLs `https`, o que bloqueia `javascript:`, `data:` e `file:`. O limite de 2048 caracteres vale para a URL já normalizada, o mesmo tamanho da coluna no banco.
- O perfil do estudante só pode ser criado ou alterado pelo `Student`, e campos extras vindos da requisição são descartados.
- As entidades usam campos privados (`#`), então serializar uma entidade por engano não expõe senha nem CPF.
- Dois cadastros simultâneos com o mesmo e-mail, CPF ou matrícula não geram duplicados nem deixam um usuário sem estudante: a constraint `UNIQUE` barra o segundo e a transação desfaz o que ele já tinha gravado.

**Qualidade**

- **89 testes unitários**, **23 de integração** (contra o PostgreSQL, no banco `morae_test`) e **13 end-to-end** (requisições HTTP reais), todos passando.
- Typecheck (`strict`), lint e Prettier sem erros.
- Revisão de segurança do módulo `user` feita e corrigida, cobrindo mass assignment, vazamento na serialização, validação de entrada e segredos fora do código.

### Pendente

- **Autenticação:** login, JWT (access e refresh token), guards e rate limiting.
- **Demais casos de uso do `user`:** cadastro de proprietário, consulta e edição de perfil, atualização dos dados acadêmicos, verificação de e-mail e suspensão de contas.
- **Verificação de vínculo com a UFAL** (módulo `verification`): envio de documentos e revisão pelo administrador.
- **Formato da matrícula:** a regra do `EnrollmentNumber` é provisória (6 a 15 dígitos) até o padrão oficial da UFAL ser confirmado.
- **Demais módulos:** `property`, `matching`, `interaction`, `contract` e `report` têm só a estrutura de pastas e arquivos vazios.

### Próximos passos sugeridos

1. Cadastro de proprietário: caso de uso `RegisterPropertyOwner` e rota `POST /property-owners`, no mesmo padrão do cadastro de estudante.
2. Autenticação: caso de uso `Authenticate` (login), porta de token com JWT, tabela de refresh tokens, guards e rate limiting.
3. Casos de uso de perfil, que exigem login: consultar o próprio perfil, definir o perfil de convivência e atualizar os dados acadêmicos.
4. Módulo `verification`: envio e revisão dos documentos de vínculo.
